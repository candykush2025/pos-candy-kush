"use client";

import { useState, useEffect } from "react";
import { shiftsService } from "@/lib/firebase/shiftsService";
import { getDocuments } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Search,
  Download,
  Plus,
  XCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";

export default function AdminShifts() {
  const [shifts, setShifts] = useState([]);
  const [filteredShifts, setFilteredShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, completed
  const [statistics, setStatistics] = useState(null);
  const [users, setUsers] = useState([]);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);
  const [startingCash, setStartingCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  // Date and user filtering
  const [filterUserId, setFilterUserId] = useState("all");
  const [dateFilterType, setDateFilterType] = useState("all"); // all, today, week, month, year, custom
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [userReport, setUserReport] = useState(null);

  useEffect(() => {
    loadShifts();
    loadUsers();
  }, []);

  useEffect(() => {
    filterShifts();
  }, [
    searchQuery,
    filterStatus,
    shifts,
    filterUserId,
    dateFilterType,
    startDate,
    endDate,
  ]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const [shiftsData, stats] = await Promise.all([
        shiftsService.getAll(),
        shiftsService.getStatistics(),
      ]);
      setShifts(shiftsData);
      setFilteredShifts(shiftsData);
      setStatistics(stats);
    } catch (error) {
      console.error("Error loading shifts:", error);
      toast.error("Failed to load shifts");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersData = await getDocuments("users");
      // Filter only cashiers and admins
      const cashiers = usersData.filter(
        (u) => u.role === "cashier" || u.role === "admin"
      );
      setUsers(cashiers);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    }
  };

  const filterShifts = () => {
    let filtered = [...shifts];

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((shift) => shift.status === filterStatus);
    }

    // Filter by user
    if (filterUserId !== "all") {
      filtered = filtered.filter((shift) => shift.userId === filterUserId);
    }

    // Filter by date
    if (dateFilterType !== "all") {
      const now = new Date();
      let filterStartDate, filterEndDate;

      switch (dateFilterType) {
        case "today":
          filterStartDate = new Date(now.setHours(0, 0, 0, 0));
          filterEndDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case "week":
          filterStartDate = new Date(now.setDate(now.getDate() - 7));
          filterEndDate = new Date();
          break;
        case "month":
          filterStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
          filterEndDate = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59
          );
          break;
        case "year":
          filterStartDate = new Date(now.getFullYear(), 0, 1);
          filterEndDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
          break;
        case "custom":
          if (startDate) filterStartDate = new Date(startDate);
          if (endDate) filterEndDate = new Date(endDate + "T23:59:59");
          break;
      }

      if (filterStartDate || filterEndDate) {
        filtered = filtered.filter((shift) => {
          const shiftDate = shift.startTime?.toDate
            ? shift.startTime.toDate()
            : new Date(shift.startTime);
          if (filterStartDate && shiftDate < filterStartDate) return false;
          if (filterEndDate && shiftDate > filterEndDate) return false;
          return true;
        });
      }
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (shift) =>
          shift.userName?.toLowerCase().includes(query) ||
          shift.id?.toLowerCase().includes(query)
      );
    }

    setFilteredShifts(filtered);

    // Generate user report if filtering by specific user
    if (filterUserId !== "all") {
      generateUserReport(filtered);
    } else {
      setUserReport(null);
    }
  };

  const generateUserReport = (userShifts) => {
    if (userShifts.length === 0) {
      setUserReport(null);
      return;
    }

    const user = users.find((u) => u.id === filterUserId);
    if (!user) return;

    // Calculate date range
    const sortedShifts = [...userShifts].sort((a, b) => {
      const dateA = a.startTime?.toDate
        ? a.startTime.toDate()
        : new Date(a.startTime);
      const dateB = b.startTime?.toDate
        ? b.startTime.toDate()
        : new Date(b.startTime);
      return dateA - dateB;
    });

    const firstShift = sortedShifts[0];
    const lastShift = sortedShifts[sortedShifts.length - 1];
    const firstDate = firstShift.startTime?.toDate
      ? firstShift.startTime.toDate()
      : new Date(firstShift.startTime);
    const lastDate = lastShift.startTime?.toDate
      ? lastShift.startTime.toDate()
      : new Date(lastShift.startTime);

    // Calculate total days in range
    const totalDaysInRange =
      Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;

    // Get unique working days
    const workingDays = new Set();
    userShifts.forEach((shift) => {
      const date = shift.startTime?.toDate
        ? shift.startTime.toDate()
        : new Date(shift.startTime);
      workingDays.add(date.toDateString());
    });

    const daysWorked = workingDays.size;
    const daysAbsent = totalDaysInRange - daysWorked;

    // Calculate total work hours
    let totalWorkMinutes = 0;
    userShifts.forEach((shift) => {
      if (shift.startTime) {
        const start = shift.startTime.toDate
          ? shift.startTime.toDate()
          : new Date(shift.startTime);
        const end = shift.endTime
          ? shift.endTime.toDate
            ? shift.endTime.toDate()
            : new Date(shift.endTime)
          : new Date();
        totalWorkMinutes += (end - start) / (1000 * 60);
      }
    });

    const totalWorkHours = (totalWorkMinutes / 60).toFixed(2);

    // Calculate money variance
    let totalMissingMoney = 0;
    let totalOverMoney = 0;
    let completedShifts = 0;

    userShifts.forEach((shift) => {
      if (shift.status === "completed" && shift.variance !== null) {
        completedShifts++;
        if (shift.variance < 0) {
          totalMissingMoney += Math.abs(shift.variance);
        } else if (shift.variance > 0) {
          totalOverMoney += shift.variance;
        }
      }
    });

    // Calculate total sales
    const totalSales = userShifts.reduce(
      (sum, shift) => sum + (shift.totalSales || 0),
      0
    );
    const totalTransactions = userShifts.reduce(
      (sum, shift) => sum + (shift.transactionCount || 0),
      0
    );
    const avgSalesPerShift =
      completedShifts > 0 ? totalSales / completedShifts : 0;

    setUserReport({
      user,
      dateRange: {
        start: firstDate,
        end: lastDate,
        totalDays: totalDaysInRange,
      },
      attendance: {
        daysWorked,
        daysAbsent,
        attendanceRate: ((daysWorked / totalDaysInRange) * 100).toFixed(1),
      },
      workHours: {
        total: totalWorkHours,
        average:
          completedShifts > 0
            ? (totalWorkHours / completedShifts).toFixed(2)
            : 0,
      },
      money: {
        missing: totalMissingMoney,
        over: totalOverMoney,
        netVariance: totalOverMoney - totalMissingMoney,
      },
      performance: {
        totalShifts: userShifts.length,
        completedShifts,
        activeShifts: userShifts.filter((s) => s.status === "active").length,
        totalSales,
        avgSalesPerShift,
        totalTransactions,
        avgTransactionsPerShift:
          completedShifts > 0
            ? (totalTransactions / completedShifts).toFixed(1)
            : 0,
      },
    });
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime) return "N/A";
    const start = startTime.toDate ? startTime.toDate() : new Date(startTime);
    const end = endTime
      ? endTime.toDate
        ? endTime.toDate()
        : new Date(endTime)
      : new Date();

    const diff = end - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  const handleOpenShift = async () => {
    try {
      if (!selectedUser) {
        toast.error("Please select a user");
        return;
      }
      if (!startingCash || parseFloat(startingCash) < 0) {
        toast.error("Please enter a valid starting cash amount");
        return;
      }

      await shiftsService.createShift(
        { startingCash: parseFloat(startingCash) },
        selectedUser.id,
        selectedUser.name
      );

      setShowOpenShiftModal(false);
      setSelectedUser(null);
      setStartingCash("");
      loadShifts();
      toast.success(`Shift opened for ${selectedUser.name}`);
    } catch (error) {
      console.error("Error opening shift:", error);
      toast.error("Failed to open shift");
    }
  };

  const handleCloseShift = async () => {
    try {
      if (!closingCash || parseFloat(closingCash) < 0) {
        toast.error("Please enter a valid closing cash amount");
        return;
      }

      await shiftsService.endShift(selectedShift.id, {
        actualCash: parseFloat(closingCash),
        notes: closeNotes,
      });

      setShowCloseShiftModal(false);
      setSelectedShift(null);
      setClosingCash("");
      setCloseNotes("");
      loadShifts();
      toast.success("Shift closed successfully");
    } catch (error) {
      console.error("Error closing shift:", error);
      toast.error("Failed to close shift");
    }
  };

  const handleCashKeypad = (value, isClosing = false) => {
    const setter = isClosing ? setClosingCash : setStartingCash;
    const currentValue = isClosing ? closingCash : startingCash;

    if (value === "backspace") {
      setter((prev) => prev.slice(0, -1));
    } else if (value === "clear") {
      setter("");
    } else if (value === ".") {
      if (!currentValue.includes(".")) {
        setter((prev) => prev + ".");
      }
    } else {
      setter((prev) => prev + value);
    }
  };

  const exportToCSV = () => {
    if (filteredShifts.length === 0) {
      toast.error("No shifts to export");
      return;
    }

    const headers = [
      "Shift ID",
      "Cashier",
      "Start Time",
      "End Time",
      "Duration",
      "Starting Cash",
      "Expected Cash",
      "Actual Cash",
      "Variance",
      "Total Sales",
      "Cash Sales",
      "Card Sales",
      "Transactions",
      "Status",
    ];

    const rows = filteredShifts.map((shift) => [
      shift.id,
      shift.userName || "Unknown",
      formatDateTime(shift.startTime),
      shift.endTime ? formatDateTime(shift.endTime) : "Ongoing",
      formatDuration(shift.startTime, shift.endTime),
      shift.startingCash || 0,
      shift.expectedCash || 0,
      shift.actualCash || "N/A",
      shift.variance !== null ? shift.variance : "N/A",
      shift.totalSales || 0,
      shift.totalCashSales || 0,
      shift.totalCardSales || 0,
      shift.transactionCount || 0,
      shift.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((row) => row.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `shifts_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Shifts exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shift Management</h1>
          <p className="text-neutral-500 mt-2">
            Track cashier shifts and cash reconciliation
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowOpenShiftModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Open Shift
          </Button>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Shifts
              </CardTitle>
              <Clock className="h-4 w-4 text-neutral-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalShifts}</div>
              <p className="text-xs text-neutral-500 mt-1">
                {statistics.activeShifts} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(statistics.totalSales)}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                From completed shifts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Variance
              </CardTitle>
              <DollarSign
                className={`h-4 w-4 ${
                  statistics.totalVariance >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  statistics.totalVariance >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(Math.abs(statistics.totalVariance))}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                {statistics.totalVariance >= 0 ? "Surplus" : "Shortage"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                With Discrepancy
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.shiftsWithShortage + statistics.shiftsWithSurplus}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                {statistics.shiftsWithShortage} short,{" "}
                {statistics.shiftsWithSurplus} over
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search and Status */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search by cashier name or shift ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === "all" ? "default" : "outline"}
                  onClick={() => setFilterStatus("all")}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={filterStatus === "active" ? "default" : "outline"}
                  onClick={() => setFilterStatus("active")}
                  size="sm"
                >
                  Active
                </Button>
                <Button
                  variant={filterStatus === "completed" ? "default" : "outline"}
                  onClick={() => setFilterStatus("completed")}
                  size="sm"
                >
                  Completed
                </Button>
              </div>
            </div>

            {/* User and Date Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* User Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Filter by User
                </label>
                <select
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="all">All Users</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter Type */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Date Range
                </label>
                <select
                  value={dateFilterType}
                  onChange={(e) => setDateFilterType(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* Custom Date Range */}
              {dateFilterType === "custom" && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Report */}
      {userReport && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Employee Report: {userReport.user.name}
            </CardTitle>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Period: {userReport.dateRange.start.toLocaleDateString()} -{" "}
              {userReport.dateRange.end.toLocaleDateString()} (
              {userReport.dateRange.totalDays} days)
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Attendance */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                  Attendance
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Days Worked:</span>
                    <span className="font-bold text-green-600">
                      {userReport.attendance.daysWorked}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Days Absent:</span>
                    <span className="font-bold text-red-600">
                      {userReport.attendance.daysAbsent}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Attendance Rate:</span>
                    <span className="font-bold">
                      {userReport.attendance.attendanceRate}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Work Hours */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                  Work Hours
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Hours:</span>
                    <span className="font-bold text-blue-600">
                      {userReport.workHours.total}h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg per Shift:</span>
                    <span className="font-bold">
                      {userReport.workHours.average}h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Shifts:</span>
                    <span className="font-bold">
                      {userReport.performance.totalShifts}
                    </span>
                  </div>
                </div>
              </div>

              {/* Money Variance */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                  Cash Variance
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Money Short:</span>
                    <span className="font-bold text-red-600">
                      {formatCurrency(userReport.money.missing)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Money Over:</span>
                    <span className="font-bold text-yellow-600">
                      {formatCurrency(userReport.money.over)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Net Variance:</span>
                    <span
                      className={`font-bold ${
                        userReport.money.netVariance >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(Math.abs(userReport.money.netVariance))}
                      {userReport.money.netVariance >= 0 ? " ↑" : " ↓"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                  Performance
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Sales:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(userReport.performance.totalSales)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg per Shift:</span>
                    <span className="font-bold">
                      {formatCurrency(userReport.performance.avgSalesPerShift)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Orders:</span>
                    <span className="font-bold">
                      {userReport.performance.totalTransactions}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shifts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-neutral-500">Loading shifts...</p>
        </div>
      ) : filteredShifts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-500">No shifts found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredShifts.map((shift) => {
            const variance = shift.variance || 0;
            const hasDiscrepancy = variance !== 0;
            const isShort = variance < 0;

            return (
              <Card
                key={shift.id}
                className={`${
                  hasDiscrepancy
                    ? isShort
                      ? "border-red-200 bg-red-50/50"
                      : "border-yellow-200 bg-yellow-50/50"
                    : ""
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Cashier & Time Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-green-700" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {shift.userName || "Unknown Cashier"}
                          </h3>
                          <p className="text-sm text-neutral-500">
                            Shift ID: {shift.id.slice(0, 8)}...
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              shift.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }
                          >
                            {shift.status === "active" ? (
                              <>
                                <div className="h-2 w-2 rounded-full bg-green-500 mr-1 animate-pulse" />
                                Active
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completed
                              </>
                            )}
                          </Badge>
                          {shift.status === "active" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedShift(shift);
                                setShowCloseShiftModal(true);
                              }}
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Close Shift
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-neutral-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDateTime(shift.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            {shift.status === "active"
                              ? "Working: "
                              : "Duration: "}
                            {formatDuration(shift.startTime, shift.endTime)}
                          </span>
                        </div>
                        {shift.status === "active" && (
                          <div className="flex items-center gap-1 text-green-600 font-medium">
                            <DollarSign className="h-4 w-4" />
                            <span>
                              Holding:{" "}
                              {formatCurrency(
                                shift.expectedCash || shift.startingCash || 0
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle: Cash Details */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">
                          Starting Cash
                        </p>
                        <p className="font-semibold">
                          {formatCurrency(shift.startingCash || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">
                          Expected Cash
                        </p>
                        <p className="font-semibold">
                          {formatCurrency(
                            shift.expectedCash || shift.startingCash || 0
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">
                          Actual Cash
                        </p>
                        <p className="font-semibold">
                          {shift.actualCash !== null
                            ? formatCurrency(shift.actualCash)
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">
                          Variance
                        </p>
                        <p
                          className={`font-bold ${
                            variance === 0
                              ? "text-green-600"
                              : isShort
                              ? "text-red-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {shift.variance !== null ? (
                            <>
                              {variance === 0 ? (
                                "✓ Perfect"
                              ) : (
                                <>
                                  {isShort ? "↓" : "↑"}{" "}
                                  {formatCurrency(Math.abs(variance))}
                                </>
                              )}
                            </>
                          ) : (
                            "N/A"
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right: Sales Summary */}
                    <div className="border-l pl-6 space-y-2">
                      <div>
                        <p className="text-xs text-neutral-500">Total Sales</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(shift.totalSales || 0)}
                        </p>
                      </div>
                      <div className="text-xs text-neutral-600 space-y-1">
                        <div className="flex justify-between gap-4">
                          <span>Cash:</span>
                          <span className="font-medium">
                            {formatCurrency(shift.totalCashSales || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>Card:</span>
                          <span className="font-medium">
                            {formatCurrency(shift.totalCardSales || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>Transactions:</span>
                          <span className="font-medium">
                            {shift.transactionCount || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {shift.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-neutral-600">
                        <span className="font-medium">Notes:</span>{" "}
                        {shift.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Open Shift Modal */}
      <Dialog open={showOpenShiftModal} onOpenChange={setShowOpenShiftModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Open Shift for User</DialogTitle>
            <DialogDescription>
              Select a user and enter the starting cash amount
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* User Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select User</label>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {users.map((user) => (
                  <Button
                    key={user.id}
                    variant={
                      selectedUser?.id === user.id ? "default" : "outline"
                    }
                    className="justify-start"
                    onClick={() => setSelectedUser(user)}
                  >
                    <User className="mr-2 h-4 w-4" />
                    {user.name} ({user.role})
                  </Button>
                ))}
              </div>
            </div>

            {selectedUser && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Starting Cash Amount
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      readOnly
                      placeholder="0.00"
                      value={startingCash}
                      className="pl-10 text-lg text-center pointer-events-none"
                      inputMode="none"
                      autoComplete="off"
                    />
                  </div>

                  {/* Numeric Keypad */}
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <Button
                        key={num}
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => handleCashKeypad(num.toString(), false)}
                        className="h-14 text-xl font-semibold"
                      >
                        {num}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => handleCashKeypad("clear", false)}
                      className="h-14 text-sm"
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => handleCashKeypad("0", false)}
                      className="h-14 text-xl font-semibold"
                    >
                      0
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => handleCashKeypad(".", false)}
                      className="h-14 text-xl font-semibold"
                    >
                      .
                    </Button>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowOpenShiftModal(false);
                  setSelectedUser(null);
                  setStartingCash("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleOpenShift}
                disabled={!selectedUser || !startingCash}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Open Shift
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Shift Modal */}
      <Dialog open={showCloseShiftModal} onOpenChange={setShowCloseShiftModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Close Shift</DialogTitle>
            <DialogDescription>
              Force close shift for {selectedShift?.userName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedShift && (
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    User:
                  </span>
                  <span className="font-semibold">
                    {selectedShift.userName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Expected Cash:
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(
                      selectedShift.expectedCash ||
                        selectedShift.startingCash ||
                        0
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total Sales:
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(selectedShift.totalSales || 0)}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Closing Cash Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  readOnly
                  placeholder="0.00"
                  value={closingCash}
                  className="pl-10 text-lg text-center pointer-events-none"
                  inputMode="none"
                  autoComplete="off"
                />
              </div>

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <Button
                    key={num}
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => handleCashKeypad(num.toString(), true)}
                    className="h-14 text-xl font-semibold"
                  >
                    {num}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => handleCashKeypad("clear", true)}
                  className="h-14 text-sm"
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => handleCashKeypad("0", true)}
                  className="h-14 text-xl font-semibold"
                >
                  0
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => handleCashKeypad(".", true)}
                  className="h-14 text-xl font-semibold"
                >
                  .
                </Button>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium">
                  Admin Notes (Optional)
                </label>
                <Input
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Reason for admin close..."
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCloseShiftModal(false);
                  setSelectedShift(null);
                  setClosingCash("");
                  setCloseNotes("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCloseShift}
                disabled={!closingCash}
                variant="destructive"
                className="flex-1"
              >
                Force Close Shift
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
