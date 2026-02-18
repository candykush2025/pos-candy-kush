"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  CalendarIcon,
  Search,
  ArrowRight,
  Plus,
  Pencil,
  Minus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  transformReceiptData,
  getAuthToken,
} from "@/lib/services/orderDuplicationService";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_ISY_API_URL || "https://api.isy.software";

// ─── Helpers ────────────────────────────────────────────────────

/** Normalise any date-like value coming from Firestore to an ISO string */
const normalizeDate = (d) => {
  if (!d && d !== 0) return undefined;
  if (typeof d === "object" && typeof d.toDate === "function")
    return d.toDate().toISOString();
  if (d instanceof Date) return d.toISOString();
  if (typeof d === "number") return new Date(d).toISOString();
  if (typeof d === "string") {
    const p = new Date(d);
    return isNaN(p.getTime()) ? undefined : p.toISOString();
  }
  return undefined;
};

/** Get a receipt's identifier (the value we use to match Firebase ↔ ISY) */
const getReceiptNumber = (r) =>
  r.orderNumber || r.receipt_number || r.receiptNumber || r.number || null;

/** Shallow comparison of the fields we care about for "is different?" check */
const receiptsDiffer = (firebaseRaw, isyData) => {
  // Compare total
  const fbTotal = parseFloat(
    firebaseRaw.totalAmount ||
      firebaseRaw.total_money ||
      firebaseRaw.totalMoney ||
      firebaseRaw.total ||
      0,
  );
  const isyTotal = parseFloat(
    isyData.totalAmount || isyData.total || isyData.total_money || 0,
  );
  if (Math.abs(fbTotal - isyTotal) > 0.01) return true;

  // Compare status
  const fbStatus = firebaseRaw.status || "completed";
  const isyStatus = isyData.status || "completed";
  if (fbStatus !== isyStatus) return true;

  // Compare items count
  const fbItems = (
    firebaseRaw.line_items ||
    firebaseRaw.lineItems ||
    firebaseRaw.items ||
    []
  ).length;
  const isyItems = (isyData.items || isyData.line_items || []).length;
  if (fbItems !== isyItems) return true;

  // Compare payment method
  const fbPayment =
    firebaseRaw.paymentMethod || firebaseRaw.payment_method || "cash";
  const isyPayment =
    isyData.paymentMethod ||
    isyData.payment?.method ||
    isyData.payment_method ||
    "cash";
  if (fbPayment !== isyPayment) return true;

  // Compare receiptDate — derive the correct date from Firebase data and compare
  // with what ISY has. Only compare the DATE portion (YYYY-MM-DD) to avoid timezone issues.
  const getExpectedDate = () => {
    // Try explicit date fields from Firebase
    const candidates = [
      firebaseRaw.receiptDate,
      firebaseRaw.receipt_date,
      firebaseRaw.createdAt,
      firebaseRaw.created_at,
    ];
    for (const val of candidates) {
      if (!val) continue;
      let d;
      if (typeof val?.toDate === "function") d = val.toDate();
      else if (val instanceof Date) d = val;
      else if (typeof val === "string") d = new Date(val);
      else if (typeof val === "number") d = new Date(val);
      else if (typeof val?.seconds === "number")
        d = new Date(val.seconds * 1000);
      if (d && !isNaN(d.getTime())) return d;
    }
    // Last resort: parse from orderNumber "O-YYMMDD-HHMM-XXX"
    const on =
      firebaseRaw.orderNumber ||
      firebaseRaw.receipt_number ||
      firebaseRaw.number ||
      "";
    const m = on.match(/O-(\d{2})(\d{2})(\d{2})-(\d{2})(\d{2})/);
    if (m) {
      const [, yy, mm, dd, hh, mi] = m;
      return new Date(
        2000 + parseInt(yy),
        parseInt(mm) - 1,
        parseInt(dd),
        parseInt(hh),
        parseInt(mi),
      );
    }
    return null;
  };

  const expectedDate = getExpectedDate();
  const isyDateRaw =
    isyData.receiptDate || isyData.receipt_date || isyData.createdAt;
  if (expectedDate && isyDateRaw) {
    const isyDate = new Date(isyDateRaw);
    if (!isNaN(isyDate.getTime())) {
      // Compare by date string YYYY-MM-DD to catch wrong-day receipts
      const expectedDay = expectedDate.toISOString().slice(0, 10);
      const isyDay = isyDate.toISOString().slice(0, 10);
      if (expectedDay !== isyDay) return true;
    }
  }

  return false;
};

// ─── Component ──────────────────────────────────────────────────

export default function SyncDebugPage() {
  // Date range
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  // Credential
  const [credentialStatus, setCredentialStatus] = useState(null);
  const [credentialError, setCredentialError] = useState(null);

  // Sync state
  const [scanning, setScanning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);

  // Progress
  const [progress, setProgress] = useState({
    phase: "",
    current: 0,
    total: 0,
  });

  // Scan results
  const [firebaseReceipts, setFirebaseReceipts] = useState([]);
  const [isyReceipts, setIsyReceipts] = useState([]);
  const [comparison, setComparison] = useState({
    toCreate: [],
    toUpdate: [],
    toDelete: [],
    matched: [],
    isyOnly: [],
  });

  // Sync results (after executing sync)
  const [syncResults, setSyncResults] = useState({
    created: [],
    updated: [],
    deleted: [],
    failed: [],
  });

  // Expanded rows in report
  const [expandedRows, setExpandedRows] = useState({});

  // ─── Check Credentials ──────────────────────────────────────

  const checkCredentials = useCallback(async () => {
    setCredentialStatus("checking");
    setCredentialError(null);

    try {
      const token = await getAuthToken();
      if (!token) throw new Error("No token received");

      // Use today's date for a quick validation call
      const today = format(new Date(), "yyyy-MM-dd");
      const res = await fetch(
        `${API_BASE_URL}/pos/v1/receipts?startDate=${today}&endDate=${today}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.ok || res.status === 404) {
        setCredentialStatus("valid");
        return token;
      }
      throw new Error(`API returned ${res.status}`);
    } catch (err) {
      setCredentialStatus("invalid");
      setCredentialError(err.message);
      toast.error(`Credential check failed: ${err.message}`);
      return null;
    }
  }, []);

  // ─── Step 1: Scan ───────────────────────────────────────────

  const handleScan = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end date");
      return;
    }

    if (startDate > endDate) {
      toast.error("Start date cannot be after end date");
      return;
    }

    setScanning(true);
    setScanComplete(false);
    setSyncComplete(false);
    setSyncResults({ created: [], updated: [], deleted: [], failed: [] });
    setComparison({
      toCreate: [],
      toUpdate: [],
      toDelete: [],
      matched: [],
      isyOnly: [],
    });
    setExpandedRows({});

    try {
      // 1a ─ Check credentials first
      setProgress({ phase: "Checking credentials...", current: 0, total: 0 });
      const token = await checkCredentials();
      if (!token) {
        setScanning(false);
        return;
      }

      // 1b ─ Fetch Firebase receipts in date range
      //     Field names are inconsistent (created_at vs createdAt, receipt_date vs receiptDate)
      //     and types vary (Timestamp vs ISO string). So we fetch all and filter client-side.
      setProgress({
        phase: "Reading Firebase receipts...",
        current: 0,
        total: 0,
      });
      toast.info("Scanning Firebase receipts...");

      const rangeStart = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        0,
        0,
        0,
      ).getTime();
      const rangeEnd = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        23,
        59,
        59,
        999,
      ).getTime();

      const allSnap = await getDocs(collection(db, "receipts"));

      const getDateMs = (data) => {
        // Try every possible date field, handle Firestore Timestamps and ISO strings
        const candidates = [
          data.createdAt,
          data.created_at,
          data.receiptDate,
          data.receipt_date,
          data.updatedAt,
          data.updated_at,
        ];
        for (const val of candidates) {
          if (!val) continue;
          // Firestore Timestamp
          if (typeof val?.toDate === "function") return val.toDate().getTime();
          // Date object
          if (val instanceof Date) return val.getTime();
          // Number (epoch ms)
          if (typeof val === "number") return val;
          // ISO string
          if (typeof val === "string") {
            const ms = new Date(val).getTime();
            if (!isNaN(ms)) return ms;
          }
          // Firestore Timestamp-like { seconds, nanoseconds }
          if (typeof val?.seconds === "number") return val.seconds * 1000;
        }
        return 0;
      };

      const filteredDocs = allSnap.docs.filter((d) => {
        const ms = getDateMs(d.data());
        return ms >= rangeStart && ms <= rangeEnd;
      });

      const fbSnap = { docs: filteredDocs, size: filteredDocs.length };

      const fbData = fbSnap.docs.map((d) => ({
        _firebaseDocId: d.id,
        ...d.data(),
      }));

      setFirebaseReceipts(fbData);
      setProgress({
        phase: `Found ${fbData.length} Firebase receipts`,
        current: fbData.length,
        total: fbData.length,
      });
      toast.info(
        `Found ${fbData.length} receipts in Firebase for selected range`,
      );

      // 1c ─ Fetch ALL ISY receipts in same date range (handle pagination)
      setProgress({
        phase: "Reading ISY API receipts...",
        current: 0,
        total: 0,
      });
      toast.info("Fetching ISY API receipts...");

      // Expand ISY date range by 1 day on each side to catch timezone edge cases.
      // Firebase client-side filtering uses exact timestamps, but ISY API uses date strings,
      // so a receipt at 11:59 PM local on Jan 31 might show up in a Feb 1 Firebase range
      // but ISY's server-side filter with startDate=2026-02-01 won't return it.
      const expandedStart = new Date(startDate);
      expandedStart.setDate(expandedStart.getDate() - 1);
      const expandedEnd = new Date(endDate);
      expandedEnd.setDate(expandedEnd.getDate() + 1);
      const startStr = format(expandedStart, "yyyy-MM-dd");
      const endStr = format(expandedEnd, "yyyy-MM-dd");
      console.log(
        `[Sync Debug] ISY query date range (expanded): ${startStr} to ${endStr}`,
      );

      let isyData = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        setProgress({
          phase: `Reading ISY API receipts (page ${currentPage})...`,
          current: isyData.length,
          total: 0,
        });

        const isyRes = await fetch(
          `${API_BASE_URL}/pos/v1/receipts?startDate=${startStr}&endDate=${endStr}&page=${currentPage}&limit=100`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (!isyRes.ok) {
          console.error(`ISY API page ${currentPage} failed:`, isyRes.status);
          toast.error(
            `ISY API returned ${isyRes.status} on page ${currentPage}`,
          );
          break;
        }

        const json = await isyRes.json();
        console.log(
          `ISY API page ${currentPage} response:`,
          JSON.stringify(json).substring(0, 500),
        );

        // Handle nested response: { data: { count, data: [...] }, meta: { hasMore, page, totalPages } }
        // Also handle flat response: { data: [...] } or just [...]
        let pageItems = [];
        if (json.data?.data && Array.isArray(json.data.data)) {
          // Nested: { data: { data: [...], count } }
          pageItems = json.data.data;
        } else if (Array.isArray(json.data)) {
          // Flat: { data: [...] }
          pageItems = json.data;
        } else if (Array.isArray(json)) {
          // Raw array
          pageItems = json;
        }

        isyData = [...isyData, ...pageItems];

        // Check pagination - look in meta or data.meta or root
        const meta = json.meta || json.data?.meta || {};
        hasMore =
          meta.hasMore === true ||
          (meta.totalPages && currentPage < meta.totalPages);
        currentPage++;

        // Safety: stop after 50 pages to prevent infinite loop
        if (currentPage > 50) {
          console.warn("ISY pagination safety limit reached (50 pages)");
          break;
        }
      }

      setIsyReceipts(isyData);
      setProgress({
        phase: `Found ${isyData.length} ISY receipts (${currentPage - 1} page${currentPage - 1 > 1 ? "s" : ""})`,
        current: isyData.length,
        total: isyData.length,
      });
      toast.info(
        `Found ${isyData.length} receipts in ISY API (${currentPage - 1} page${currentPage - 1 > 1 ? "s" : ""})`,
      );

      // 1d ─ Compare (with duplicate detection)
      setProgress({ phase: "Comparing receipts...", current: 0, total: 0 });

      // Debug: log first ISY receipt to see available ID fields
      if (isyData.length > 0) {
        const sample = isyData[0];
        console.log(
          "[Sync Debug] Sample ISY receipt keys:",
          Object.keys(sample),
        );
        console.log("[Sync Debug] ISY ID fields:", {
          _id: sample._id,
          id: sample.id,
          receiptId: sample.receiptId,
        });
      }

      // Group ISY receipts by orderNumber — detect duplicates
      const isyByNumber = new Map(); // orderNumber → array of ISY receipts
      for (const r of isyData) {
        const num = getReceiptNumber(r);
        if (!num) continue;
        if (!isyByNumber.has(num)) isyByNumber.set(num, []);
        isyByNumber.get(num).push(r);
      }

      // Log duplicates found
      let dupCount = 0;
      for (const [num, arr] of isyByNumber) {
        if (arr.length > 1) {
          dupCount += arr.length - 1;
          console.warn(
            `[Sync Debug] DUPLICATE on ISY: ${num} has ${arr.length} copies`,
            arr.map((r) => r._id || r.id),
          );
        }
      }
      if (dupCount > 0) {
        toast.warning(
          `Found ${dupCount} duplicate receipts on ISY API that need cleanup`,
        );
      }

      const toCreate = [];
      const toUpdate = [];
      const toDelete = []; // duplicates to remove
      const matched = [];
      const firebaseNums = new Set();

      const getIsyId = (r) => r._id || r.id || r.receiptId;

      for (const fb of fbData) {
        const num = getReceiptNumber(fb);
        if (!num) continue;
        firebaseNums.add(num);

        const isyGroup = isyByNumber.get(num);

        if (!isyGroup || isyGroup.length === 0) {
          // Not on ISY at all → create
          toCreate.push({ firebase: fb, receiptNumber: num });
        } else {
          // Pick the BEST one to keep (oldest createdAt, or first with valid _id)
          const sorted = [...isyGroup].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateA - dateB; // oldest first
          });

          const keeper = sorted[0];
          const duplicates = sorted.slice(1);

          // Mark all extras for deletion
          for (const dup of duplicates) {
            const dupId = getIsyId(dup);
            if (dupId) {
              toDelete.push({
                receiptNumber: num,
                isyId: dupId,
                createdAt: dup.createdAt,
              });
            }
          }

          // Now compare the keeper against Firebase
          if (receiptsDiffer(fb, keeper)) {
            toUpdate.push({
              firebase: fb,
              isy: keeper,
              receiptNumber: num,
              isyId: getIsyId(keeper),
            });
          } else {
            matched.push({ firebase: fb, isy: keeper, receiptNumber: num });
          }
        }
      }

      const isyOnly = isyData
        .filter((r) => !firebaseNums.has(getReceiptNumber(r)))
        .map((r) => ({ isy: r, receiptNumber: getReceiptNumber(r) }));

      const comp = { toCreate, toUpdate, toDelete, matched, isyOnly };
      setComparison(comp);
      setScanComplete(true);

      toast.success(
        `Scan complete: ${toCreate.length} to create, ${toUpdate.length} to update, ${toDelete.length} duplicates to delete, ${matched.length} matched`,
      );
    } catch (err) {
      console.error("Scan error:", err);
      toast.error(`Scan failed: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  // ─── Step 2: Execute Sync ───────────────────────────────────

  const handleSync = async () => {
    const totalWork =
      comparison.toCreate.length +
      comparison.toUpdate.length +
      comparison.toDelete.length;
    if (totalWork === 0) {
      toast.info("Nothing to sync — everything is already matched!");
      return;
    }

    if (
      !confirm(
        `This will:\n• CREATE ${comparison.toCreate.length} receipts\n• UPDATE ${comparison.toUpdate.length} receipts\n• DELETE ${comparison.toDelete.length} duplicates\n\non ISY API.\n\nFirebase will NOT be modified (read-only).\nISY API will be adjusted to match Firebase.\n\nContinue?`,
      )
    ) {
      return;
    }

    setSyncing(true);
    setSyncComplete(false);
    const results = { created: [], updated: [], deleted: [], failed: [] };
    let done = 0;

    try {
      const token = await getAuthToken();

      // ─── Delete duplicates first ───
      for (const item of comparison.toDelete) {
        done++;
        setProgress({
          phase: `Deleting duplicate ${item.receiptNumber} (${item.isyId})...`,
          current: done,
          total: totalWork,
        });

        try {
          if (!item.isyId) {
            results.failed.push({
              receiptNumber: item.receiptNumber,
              action: "delete",
              error: "No ISY ID — cannot delete duplicate",
            });
            continue;
          }

          const res = await fetch(
            `${API_BASE_URL}/pos/v1/receipts/${item.isyId}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          const json = await res.json().catch(() => ({}));

          if (res.ok && json.success !== false) {
            results.deleted.push({
              receiptNumber: item.receiptNumber,
              isyId: item.isyId,
              status: "success",
            });
          } else {
            results.failed.push({
              receiptNumber: item.receiptNumber,
              action: "delete",
              error: json.error || json.message || `HTTP ${res.status}`,
              httpStatus: res.status,
            });
          }
        } catch (err) {
          results.failed.push({
            receiptNumber: item.receiptNumber,
            action: "delete",
            error: err.message,
          });
        }

        await new Promise((r) => setTimeout(r, 100));
      }

      // ─── Create missing ───

      for (const item of comparison.toCreate) {
        done++;
        setProgress({
          phase: `Creating ${item.receiptNumber}...`,
          current: done,
          total: totalWork,
        });

        try {
          // ── Safety check: verify receipt doesn't already exist on ISY ──
          // This catches edge cases where ISY date-range query missed it (timezone mismatch)
          let alreadyExists = false;
          try {
            // Derive the date from the orderNumber to search the right date range on ISY
            const onMatch = item.receiptNumber.match(/O-(\d{2})(\d{2})(\d{2})/);
            let searchDate = null;
            if (onMatch) {
              const [, yy, mm, dd] = onMatch;
              searchDate = `${2000 + parseInt(yy)}-${mm}-${dd}`;
            }
            // If we can derive the date, search ISY for that specific day
            if (searchDate) {
              const checkRes = await fetch(
                `${API_BASE_URL}/pos/v1/receipts?startDate=${searchDate}&endDate=${searchDate}&limit=100`,
                { headers: { Authorization: `Bearer ${token}` } },
              );
              if (checkRes.ok) {
                const checkJson = await checkRes.json();
                const checkItems = checkJson.data?.data || checkJson.data || [];
                if (Array.isArray(checkItems)) {
                  const existingMatch = checkItems.find(
                    (r) => getReceiptNumber(r) === item.receiptNumber,
                  );
                  if (existingMatch) {
                    alreadyExists = true;
                    console.log(
                      `[Sync] SKIPPING CREATE — ${item.receiptNumber} already exists on ISY (found via safety check)`,
                    );
                    results.created.push({
                      receiptNumber: item.receiptNumber,
                      isyId: existingMatch._id || existingMatch.id,
                      status: "already-exists",
                    });
                  }
                }
              }
            }
          } catch (checkErr) {
            console.warn(
              `[Sync] Pre-create check failed for ${item.receiptNumber}:`,
              checkErr.message,
            );
            // Continue with creation if check fails
          }

          if (alreadyExists) {
            await new Promise((r) => setTimeout(r, 50));
            continue;
          }

          const cashier = {
            id: item.firebase.cashierId || item.firebase.userId || null,
            name:
              item.firebase.cashierName ||
              item.firebase.cashier_name ||
              "Unknown",
          };

          const payload = transformReceiptData(item.firebase, cashier);

          const res = await fetch(`${API_BASE_URL}/pos/v1/receipts`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const json = await res.json().catch(() => ({}));

          if (res.ok && json.success !== false) {
            results.created.push({
              receiptNumber: item.receiptNumber,
              isyId: json.data?._id || json.data?.id,
              status: "success",
            });
          } else {
            results.failed.push({
              receiptNumber: item.receiptNumber,
              action: "create",
              error: json.error || json.message || `HTTP ${res.status}`,
              httpStatus: res.status,
            });
          }
        } catch (err) {
          results.failed.push({
            receiptNumber: item.receiptNumber,
            action: "create",
            error: err.message,
          });
        }

        await new Promise((r) => setTimeout(r, 100));
      }

      for (const item of comparison.toUpdate) {
        done++;
        setProgress({
          phase: `Updating ${item.receiptNumber}...`,
          current: done,
          total: totalWork,
        });

        try {
          if (!item.isyId) {
            results.failed.push({
              receiptNumber: item.receiptNumber,
              action: "update",
              error:
                "No ISY ID found — cannot update (missing _id/id field in ISY response)",
            });
            await new Promise((r) => setTimeout(r, 50));
            continue;
          }

          const cashier = {
            id: item.firebase.cashierId || item.firebase.userId || null,
            name:
              item.firebase.cashierName ||
              item.firebase.cashier_name ||
              "Unknown",
          };

          const payload = transformReceiptData(item.firebase, cashier);

          const res = await fetch(
            `${API_BASE_URL}/pos/v1/receipts/${item.isyId}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            },
          );

          const json = await res.json().catch(() => ({}));

          if (res.ok && json.success !== false) {
            results.updated.push({
              receiptNumber: item.receiptNumber,
              isyId: item.isyId,
              status: "success",
            });
          } else {
            results.failed.push({
              receiptNumber: item.receiptNumber,
              action: "update",
              error: json.error || json.message || `HTTP ${res.status}`,
              httpStatus: res.status,
            });
          }
        } catch (err) {
          results.failed.push({
            receiptNumber: item.receiptNumber,
            action: "update",
            error: err.message,
          });
        }

        await new Promise((r) => setTimeout(r, 100));
      }

      setSyncResults(results);
      setSyncComplete(true);

      const actualCreated = results.created.filter(
        (r) => r.status === "success",
      ).length;
      const skipped = results.created.filter(
        (r) => r.status === "already-exists",
      ).length;
      const msg = `Sync complete: ${actualCreated} created, ${skipped} skipped (already exist), ${results.updated.length} updated, ${results.deleted.length} deleted, ${results.failed.length} failed`;
      if (results.failed.length === 0) {
        toast.success(`✅ ${msg}`);
      } else {
        toast.warning(`⚠️ ${msg}`);
      }
    } catch (err) {
      console.error("Sync error:", err);
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const toggleRow = (key) =>
    setExpandedRows((prev) => ({ ...prev, [key]: !prev[key] }));

  const progressPercent =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Firebase → ISY Sync</h1>
        <p className="text-muted-foreground mt-1">
          Select a date range, scan receipts in Firebase, compare with
          api.isy.software, then sync differences. Firebase is the source of
          truth — only ISY API will be modified.
        </p>
      </div>

      {/* ── Date Range Picker ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Select Date Range
          </CardTitle>
          <CardDescription>
            Choose start and end dates to scan receipts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {/* Start Date */}
            <div className="space-y-1">
              <label className="text-sm font-medium">From</label>
              <Popover open={startOpen} onOpenChange={setStartOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[200px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => {
                      setStartDate(d);
                      setStartOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <label className="text-sm font-medium">To</label>
              <Popover open={endOpen} onOpenChange={setEndOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[200px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => {
                      setEndDate(d);
                      setEndOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Quick date selectors */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const today = new Date();
                  setStartDate(today);
                  setEndDate(today);
                }}
              >
                Today
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const today = new Date();
                  const weekAgo = new Date(today);
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  setStartDate(weekAgo);
                  setEndDate(today);
                }}
              >
                Last 7 days
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const today = new Date();
                  const monthAgo = new Date(today);
                  monthAgo.setDate(monthAgo.getDate() - 30);
                  setStartDate(monthAgo);
                  setEndDate(today);
                }}
              >
                Last 30 days
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const today = new Date();
                  setStartDate(
                    new Date(today.getFullYear(), today.getMonth(), 1),
                  );
                  setEndDate(today);
                }}
              >
                This month
              </Button>
            </div>

            {/* Scan button */}
            <Button
              onClick={handleScan}
              disabled={scanning || !startDate || !endDate}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Search
                className={`w-4 h-4 mr-2 ${scanning ? "animate-spin" : ""}`}
              />
              {scanning ? "Scanning..." : "Scan & Compare"}
            </Button>
          </div>

          {/* Date summary */}
          {startDate && endDate && (
            <p className="text-sm text-muted-foreground mt-3">
              Scanning from <strong>{format(startDate, "PPP")}</strong> to{" "}
              <strong>{format(endDate, "PPP")}</strong>
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Progress Bar ──────────────────────────────────── */}
      {(scanning || syncing) && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progress.phase}</span>
                {progress.total > 0 && (
                  <span className="font-mono">
                    {progress.current}/{progress.total} ({progressPercent}%)
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${progress.total > 0 ? progressPercent : 100}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Credential Status ─────────────────────────────── */}
      {credentialStatus && !scanning && (
        <Card
          className={
            credentialStatus === "valid"
              ? "border-green-500 bg-green-50 dark:bg-green-950"
              : credentialStatus === "invalid"
                ? "border-red-500 bg-red-50 dark:bg-red-950"
                : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
          }
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              {credentialStatus === "valid" && (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-700 dark:text-green-300 font-medium">
                    API credentials valid — connected to {API_BASE_URL}
                  </span>
                </>
              )}
              {credentialStatus === "invalid" && (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-red-700 dark:text-red-300 font-medium">
                    {credentialError || "Credentials invalid"}
                  </span>
                </>
              )}
              {credentialStatus === "checking" && (
                <>
                  <Clock className="w-5 h-5 text-yellow-600 animate-spin" />
                  <span className="text-yellow-700 dark:text-yellow-300 font-medium">
                    Checking credentials...
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Scan Results (Comparison) ─────────────────────── */}
      {scanComplete && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Firebase Receipts</CardDescription>
                <CardTitle className="text-2xl">
                  {firebaseReceipts.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>ISY API Receipts</CardDescription>
                <CardTitle className="text-2xl">{isyReceipts.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-green-300 dark:border-green-700">
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Matched (OK)
                </CardDescription>
                <CardTitle className="text-2xl text-green-600">
                  {comparison.matched.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-blue-300 dark:border-blue-700">
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-1">
                  <Plus className="w-4 h-4 text-blue-600" />
                  To Create
                </CardDescription>
                <CardTitle className="text-2xl text-blue-600">
                  {comparison.toCreate.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-orange-300 dark:border-orange-700">
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-1">
                  <Pencil className="w-4 h-4 text-orange-600" />
                  To Update
                </CardDescription>
                <CardTitle className="text-2xl text-orange-600">
                  {comparison.toUpdate.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-red-300 dark:border-red-700">
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Duplicates
                </CardDescription>
                <CardTitle className="text-2xl text-red-600">
                  {comparison.toDelete.length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Detailed comparison tables */}
          <Card>
            <CardHeader>
              <CardTitle>Comparison Details</CardTitle>
              <CardDescription>
                Firebase is the source of truth. Items below will be
                created/updated on ISY API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* TO CREATE */}
              {comparison.toCreate.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Missing on ISY — Will be CREATED (
                    {comparison.toCreate.length})
                  </h3>
                  <div className="space-y-1">
                    {comparison.toCreate.map((item, i) => {
                      const key = `create-${i}`;
                      const dateStr = normalizeDate(
                        item.firebase.created_at || item.firebase.createdAt,
                      );
                      return (
                        <div
                          key={key}
                          className="border rounded p-3 bg-blue-50/50 dark:bg-blue-950/20"
                        >
                          <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => toggleRow(key)}
                          >
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                                CREATE
                              </Badge>
                              <span className="font-mono text-sm font-semibold">
                                {item.receiptNumber}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {dateStr
                                  ? format(new Date(dateStr), "PPp")
                                  : "—"}
                              </span>
                              <span className="text-sm font-medium">
                                {parseFloat(
                                  item.firebase.totalAmount ||
                                    item.firebase.total_money ||
                                    item.firebase.total ||
                                    0,
                                ).toFixed(2)}
                              </span>
                            </div>
                            {expandedRows[key] ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          {expandedRows[key] && (
                            <pre className="text-[10px] mt-2 bg-muted p-2 rounded overflow-auto max-h-40">
                              {JSON.stringify(item.firebase, null, 2)}
                            </pre>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TO UPDATE */}
              {comparison.toUpdate.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-2 flex items-center gap-2">
                    <Pencil className="w-4 h-4" />
                    Different on ISY — Will be UPDATED (
                    {comparison.toUpdate.length})
                  </h3>
                  <div className="space-y-1">
                    {comparison.toUpdate.map((item, i) => {
                      const key = `update-${i}`;
                      const fbTotal = parseFloat(
                        item.firebase.totalAmount ||
                          item.firebase.total_money ||
                          item.firebase.total ||
                          0,
                      );
                      const isyTotal = parseFloat(
                        item.isy.totalAmount ||
                          item.isy.total ||
                          item.isy.total_money ||
                          0,
                      );
                      return (
                        <div
                          key={key}
                          className="border rounded p-3 bg-orange-50/50 dark:bg-orange-950/20"
                        >
                          <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => toggleRow(key)}
                          >
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                                UPDATE
                              </Badge>
                              <span className="font-mono text-sm font-semibold">
                                {item.receiptNumber}
                              </span>
                              <span className="text-xs">
                                Firebase: <strong>{fbTotal.toFixed(2)}</strong>
                                <ArrowRight className="inline w-3 h-3 mx-1" />
                                ISY: <strong>{isyTotal.toFixed(2)}</strong>
                              </span>
                            </div>
                            {expandedRows[key] ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          {expandedRows[key] && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-2">
                              <div>
                                <p className="text-[10px] font-semibold text-orange-600 mb-1">
                                  Firebase (source of truth)
                                </p>
                                <pre className="text-[10px] bg-muted p-2 rounded overflow-auto max-h-40">
                                  {JSON.stringify(item.firebase, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold text-gray-500 mb-1">
                                  ISY (will be overwritten)
                                </p>
                                <pre className="text-[10px] bg-muted p-2 rounded overflow-auto max-h-40">
                                  {JSON.stringify(item.isy, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MATCHED */}
              {comparison.matched.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Already Matched — No action needed (
                    {comparison.matched.length})
                  </h3>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {comparison.matched.map((item, i) => (
                      <div
                        key={`matched-${i}`}
                        className="flex items-center gap-3 border rounded p-2 bg-green-50/50 dark:bg-green-950/20"
                      >
                        <CheckCircle className="w-3 h-3 text-green-600 shrink-0" />
                        <span className="font-mono text-xs">
                          {item.receiptNumber}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {parseFloat(
                            item.firebase.totalAmount ||
                              item.firebase.total_money ||
                              item.firebase.total ||
                              0,
                          ).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DUPLICATES TO DELETE */}
              {comparison.toDelete.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Duplicates on ISY — Will be DELETED (
                    {comparison.toDelete.length})
                  </h3>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {comparison.toDelete.map((item, i) => (
                      <div
                        key={`delete-${i}`}
                        className="flex items-center gap-3 border border-red-200 dark:border-red-800 rounded p-2 bg-red-50/50 dark:bg-red-950/20"
                      >
                        <XCircle className="w-3 h-3 text-red-600 shrink-0" />
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 text-[10px]">
                          DELETE
                        </Badge>
                        <span className="font-mono text-xs">
                          {item.receiptNumber}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ID: {item.isyId}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ISY ONLY */}
              {comparison.isyOnly.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                    <Minus className="w-4 h-4" />
                    ISY Only — Not in Firebase for this range (
                    {comparison.isyOnly.length})
                  </h3>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {comparison.isyOnly.map((item, i) => (
                      <div
                        key={`isy-${i}`}
                        className="flex items-center gap-3 border rounded p-2 opacity-60"
                      >
                        <AlertCircle className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="font-mono text-xs">
                          {item.receiptNumber}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NOTHING TO DO */}
              {comparison.toCreate.length === 0 &&
                comparison.toUpdate.length === 0 &&
                comparison.toDelete.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                      Everything is in sync!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      All {comparison.matched.length} Firebase receipts match
                      ISY API.
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* ── Sync Action Button ────────────────────────── */}
          {(comparison.toCreate.length > 0 ||
            comparison.toUpdate.length > 0 ||
            comparison.toDelete.length > 0) &&
            !syncComplete && (
              <Card className="border-2 border-indigo-400 dark:border-indigo-600">
                <CardContent className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-lg">Ready to Sync</p>
                    <p className="text-sm text-muted-foreground">
                      {comparison.toCreate.length} to create,{" "}
                      {comparison.toUpdate.length} to update,{" "}
                      {comparison.toDelete.length} duplicates to delete on ISY
                      API. Firebase will NOT be changed.
                    </p>
                  </div>
                  <Button
                    onClick={handleSync}
                    disabled={syncing}
                    size="lg"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    <RefreshCw
                      className={`w-5 h-5 mr-2 ${syncing ? "animate-spin" : ""}`}
                    />
                    {syncing ? "Syncing..." : "Execute Sync Now"}
                  </Button>
                </CardContent>
              </Card>
            )}
        </>
      )}

      {/* ── Sync Results Report ───────────────────────────── */}
      {syncComplete && (
        <Card className="border-2 border-green-400 dark:border-green-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {syncResults.failed.length === 0 ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="text-green-700 dark:text-green-400">
                    Sync Completed Successfully!
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                  <span className="text-orange-700 dark:text-orange-400">
                    Sync Completed with {syncResults.failed.length} error(s)
                  </span>
                </>
              )}
            </CardTitle>
            <CardDescription>
              Final sync report for {startDate && format(startDate, "PPP")} to{" "}
              {endDate && format(endDate, "PPP")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Result summary */}
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-4 text-center">
                <p className="text-3xl font-bold text-green-600">
                  {syncResults.created.length}
                </p>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Created
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {syncResults.updated.length}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Updated
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 p-4 text-center">
                <p className="text-3xl font-bold text-orange-600">
                  {syncResults.deleted.length}
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-400">
                  Deleted
                </p>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-4 text-center">
                <p className="text-3xl font-bold text-red-600">
                  {syncResults.failed.length}
                </p>
                <p className="text-sm text-red-700 dark:text-red-400">Failed</p>
              </div>
            </div>

            {/* Created list */}
            {syncResults.created.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
                  ✅ Created ({syncResults.created.length})
                </h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {syncResults.created.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs border rounded p-2 bg-green-50/50 dark:bg-green-950/20"
                    >
                      <CheckCircle className="w-3 h-3 text-green-600 shrink-0" />
                      <span className="font-mono">{r.receiptNumber}</span>
                      {r.isyId && (
                        <span className="text-muted-foreground">
                          → ISY: {r.isyId}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Updated list */}
            {syncResults.updated.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">
                  🔄 Updated ({syncResults.updated.length})
                </h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {syncResults.updated.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs border rounded p-2 bg-blue-50/50 dark:bg-blue-950/20"
                    >
                      <Pencil className="w-3 h-3 text-blue-600 shrink-0" />
                      <span className="font-mono">{r.receiptNumber}</span>
                      {r.isyId && (
                        <span className="text-muted-foreground">
                          → ISY: {r.isyId}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deleted list */}
            {syncResults.deleted.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-2">
                  🗑️ Deleted Duplicates ({syncResults.deleted.length})
                </h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {syncResults.deleted.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs border rounded p-2 bg-orange-50/50 dark:bg-orange-950/20"
                    >
                      <XCircle className="w-3 h-3 text-orange-600 shrink-0" />
                      <span className="font-mono">{r.receiptNumber}</span>
                      {r.isyId && (
                        <span className="text-muted-foreground">
                          ID: {r.isyId}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed list */}
            {syncResults.failed.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                  ❌ Failed ({syncResults.failed.length})
                </h3>
                <div className="space-y-1">
                  {syncResults.failed.map((r, i) => (
                    <div
                      key={i}
                      className="text-xs border border-red-200 dark:border-red-800 rounded p-2 bg-red-50/50 dark:bg-red-950/20"
                    >
                      <div className="flex items-center gap-2">
                        <XCircle className="w-3 h-3 text-red-600 shrink-0" />
                        <span className="font-mono font-semibold">
                          {r.receiptNumber}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {r.action}
                        </Badge>
                      </div>
                      <p className="text-red-600 dark:text-red-400 mt-1">
                        {r.error}
                        {r.httpStatus && ` (HTTP ${r.httpStatus})`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All success message */}
            {syncResults.failed.length === 0 && (
              <div className="text-center py-4 bg-green-100/50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                  🎉 All receipts synced successfully!
                </p>
                <p className="text-sm text-muted-foreground">
                  Firebase and ISY API are now in sync for the selected date
                  range.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Configuration Info ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Configuration</span>
            {credentialStatus && (
              <Badge
                variant={
                  credentialStatus === "valid" ? "default" : "destructive"
                }
              >
                {credentialStatus === "valid"
                  ? "✓ Connected"
                  : credentialStatus === "checking"
                    ? "Checking..."
                    : "✗ Not Connected"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">API URL:</span>
            <span className="font-mono">
              {process.env.NEXT_PUBLIC_ISY_API_URL || "Not set"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Username:</span>
            <span className="font-mono">
              {process.env.NEXT_PUBLIC_ISY_API_USERNAME || "Not set"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Password:</span>
            <span className="font-mono">
              {process.env.NEXT_PUBLIC_ISY_API_PASSWORD
                ? "••••••••"
                : "Not set"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Endpoint (Create):</span>
            <span className="font-mono">POST /pos/v1/receipts</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Endpoint (Update):</span>
            <span className="font-mono">{"PUT /pos/v1/receipts/{id}"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
