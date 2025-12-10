"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { RefreshCw, Check } from "lucide-react";
import { DateRangePicker, ReportDataTable } from "@/components/reports";
import { shiftsService } from "@/lib/firebase/shiftsService";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { db } from "@/lib/firebase/config";
import { collection, getDocs } from "firebase/firestore";

export default function ShiftsReportPage() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all shifts
      const allShifts = await shiftsService.getAll();
      setShifts(allShifts || []);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      toast.error("Failed to load shifts data");
    } finally {
      setLoading(false);
    }
  };

  // Filter shifts by date range
  const filteredShifts = useMemo(() => {
    const startTimestamp = startOfDay(dateRange.from).getTime();
    const endTimestamp = endOfDay(dateRange.to).getTime();

    return shifts
      .filter((shift) => {
        // Get shift start date
        let shiftDate;
        if (shift.startTime?.toDate) {
          shiftDate = shift.startTime.toDate();
        } else if (shift.startTime) {
          shiftDate = new Date(shift.startTime);
        } else if (shift.openedAt?.toDate) {
          shiftDate = shift.openedAt.toDate();
        } else if (shift.openedAt) {
          shiftDate = new Date(shift.openedAt);
        } else {
          return false;
        }

        // Validate date
        if (isNaN(shiftDate.getTime())) {
          return false;
        }

        const shiftTimestamp = shiftDate.getTime();
        return (
          shiftTimestamp >= startTimestamp && shiftTimestamp <= endTimestamp
        );
      })
      .sort((a, b) => {
        // Sort by start time descending
        const dateA = a.startTime?.toDate?.()
          ? a.startTime.toDate().getTime()
          : new Date(a.startTime || a.openedAt).getTime();
        const dateB = b.startTime?.toDate?.()
          ? b.startTime.toDate().getTime()
          : new Date(b.startTime || b.openedAt).getTime();
        return dateB - dateA;
      });
  }, [shifts, dateRange]);

  // Prepare table data - Loyverse style columns
  const tableData = useMemo(() => {
    return filteredShifts.map((shift) => {
      // Format opening time
      const openingTime = (() => {
        try {
          const date = shift.startTime?.toDate?.()
            ? shift.startTime.toDate()
            : shift.openedAt?.toDate?.()
            ? shift.openedAt.toDate()
            : new Date(shift.startTime || shift.openedAt);
          return format(date, "MMM dd, yyyy, hh:mm a");
        } catch {
          return "—";
        }
      })();

      // Format closing time
      const closingTime = (() => {
        if (!shift.endTime && !shift.closedAt) return "—";
        try {
          const date = shift.endTime?.toDate?.()
            ? shift.endTime.toDate()
            : shift.closedAt?.toDate?.()
            ? shift.closedAt.toDate()
            : new Date(shift.endTime || shift.closedAt);
          return format(date, "MMM dd, yyyy, hh:mm a");
        } catch {
          return "—";
        }
      })();

      // Get Cashier name
      const posName =
        shift.userName ||
        shift.employeeName ||
        shift.userDisplayName ||
        "Unknown";

      // Calculate expected cash and actual cash
      const expectedCash = shift.expectedCash || shift.expectedCashAmount || 0;
      const actualCash =
        shift.cashOnEnd || shift.actualCashAmount || shift.endingCash || 0;

      // Calculate difference
      const difference = actualCash - expectedCash;

      return {
        id: shift.id,
        posName,
        openingTime,
        closingTime,
        expectedCash,
        actualCash,
        difference,
      };
    });
  }, [filteredShifts]);

  // Table columns - Loyverse style (6 columns)
  const tableColumns = [
    {
      key: "posName",
      label: "POS",
      sortable: true,
      className: "text-left",
    },
    {
      key: "openingTime",
      label: "Opening time",
      sortable: true,
      className: "text-left",
    },
    {
      key: "closingTime",
      label: "Closing time",
      sortable: true,
      className: "text-left",
    },
    {
      key: "expectedCash",
      label: "Expected cash amount",
      sortable: true,
      format: (value) =>
        `฿${value.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      className: "text-right",
    },
    {
      key: "actualCash",
      label: "Actual cash amount",
      sortable: true,
      format: (value) =>
        `฿${value.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      className: "text-right",
    },
    {
      key: "difference",
      label: "Difference",
      sortable: true,
      render: (value) => {
        if (value === 0) {
          return (
            <div className="flex items-center justify-end gap-2">
              <span>—</span>
              <Check className="h-5 w-5 text-green-600" />
            </div>
          );
        }
        return (
          <span className={value < 0 ? "text-red-600" : "text-yellow-600"}>
            {value < 0 ? "-" : "+"}฿
            {Math.abs(value).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        );
      },
      className: "text-right",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Shifts
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            periodName="last30"
          />
        </div>
      </div>

      {/* Simple Loyverse-style Table */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <ReportDataTable
          columns={tableColumns}
          data={tableData}
          defaultSort={{ key: "openingTime", direction: "desc" }}
          exportFilename={`shifts-${format(
            dateRange.from,
            "yyyy-MM-dd"
          )}-${format(dateRange.to, "yyyy-MM-dd")}`}
        />
      </div>
    </div>
  );
}
