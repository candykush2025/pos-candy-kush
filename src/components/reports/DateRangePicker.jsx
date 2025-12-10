"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Clock,
} from "lucide-react";
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  subYears,
} from "date-fns";

const PERIOD_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 days", value: "last7" },
  { label: "Last 30 days", value: "last30" },
  { label: "This week", value: "thisWeek" },
  { label: "Last week", value: "lastWeek" },
  { label: "This month", value: "thisMonth" },
  { label: "Last month", value: "lastMonth" },
  { label: "This year", value: "thisYear" },
  { label: "Last year", value: "lastYear" },
  { label: "All time", value: "allTime" },
];

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  periodName = "last30",
  showTimeFilter = true,
  timeRange,
  onTimeRangeChange,
}) {
  const [selectedPeriod, setSelectedPeriod] = useState(periodName);
  const [isAllDay, setIsAllDay] = useState(true);
  const [customFromHour, setCustomFromHour] = useState("00:00");
  const [customToHour, setCustomToHour] = useState("23:59");

  const calculateDateRange = (period) => {
    const now = new Date();
    let from, to;

    switch (period) {
      case "today":
        from = new Date(now.setHours(0, 0, 0, 0));
        to = new Date();
        break;
      case "yesterday":
        const yesterday = subDays(new Date(), 1);
        from = new Date(yesterday.setHours(0, 0, 0, 0));
        to = new Date(subDays(new Date(), 1).setHours(23, 59, 59, 999));
        break;
      case "last7":
        from = subDays(now, 7);
        to = new Date();
        break;
      case "last30":
        from = subDays(now, 30);
        to = new Date();
        break;
      case "thisWeek":
        from = startOfWeek(now, { weekStartsOn: 1 });
        to = new Date();
        break;
      case "lastWeek":
        from = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        to = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        break;
      case "thisMonth":
        from = startOfMonth(now);
        to = new Date();
        break;
      case "lastMonth":
        from = startOfMonth(subMonths(now, 1));
        to = endOfMonth(subMonths(now, 1));
        break;
      case "thisYear":
        from = startOfYear(now);
        to = new Date();
        break;
      case "lastYear":
        from = startOfYear(subYears(now, 1));
        to = endOfYear(subYears(now, 1));
        break;
      case "allTime":
        from = new Date(2020, 0, 1);
        to = new Date();
        break;
      default:
        from = subDays(now, 30);
        to = new Date();
    }

    return { from, to };
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    const newRange = calculateDateRange(period);
    onDateRangeChange(newRange);
  };

  const handlePrevious = () => {
    const daysDiff = Math.ceil(
      (dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24)
    );
    const newFrom = subDays(dateRange.from, daysDiff);
    const newTo = subDays(dateRange.to, daysDiff);
    onDateRangeChange({ from: newFrom, to: newTo });
    setSelectedPeriod("custom");
  };

  const handleNext = () => {
    const daysDiff = Math.ceil(
      (dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24)
    );
    const newFrom = subDays(dateRange.from, -daysDiff);
    const newTo = subDays(dateRange.to, -daysDiff);

    // Don't go beyond today
    const today = new Date();
    if (newTo > today) return;

    onDateRangeChange({ from: newFrom, to: newTo });
    setSelectedPeriod("custom");
  };

  const isNextDisabled = () => {
    const today = new Date();
    return dateRange.to >= today;
  };

  const getCurrentPeriodLabel = () => {
    const found = PERIOD_OPTIONS.find((p) => p.value === selectedPeriod);
    return found ? found.label : "Custom";
  };

  const handleTimeRangeChange = (allDay) => {
    setIsAllDay(allDay);
    if (onTimeRangeChange) {
      if (allDay) {
        onTimeRangeChange({
          fromHour: "00:00",
          toHour: "23:59",
          isAllDay: true,
        });
      } else {
        onTimeRangeChange({
          fromHour: customFromHour,
          toHour: customToHour,
          isAllDay: false,
        });
      }
    }
  };

  const handleCustomTimeChange = (type, value) => {
    if (type === "from") {
      setCustomFromHour(value);
      if (onTimeRangeChange) {
        onTimeRangeChange({
          fromHour: value,
          toHour: customToHour,
          isAllDay: false,
        });
      }
    } else {
      setCustomToHour(value);
      if (onTimeRangeChange) {
        onTimeRangeChange({
          fromHour: customFromHour,
          toHour: value,
          isAllDay: false,
        });
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Navigation arrows */}
      <div className="flex items-center">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevious}
          className="rounded-r-none border-r-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={isNextDisabled()}
          className="rounded-l-none"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Date range display */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-neutral-800 border rounded-lg text-sm">
        <Calendar className="h-4 w-4 text-neutral-500" />
        <span>
          {dateRange?.from &&
          dateRange?.to &&
          format(new Date(dateRange.from), "MMM dd, yyyy") ===
            format(new Date(dateRange.to), "MMM dd, yyyy")
            ? format(new Date(dateRange.from), "MMM dd, yyyy")
            : dateRange?.from && dateRange?.to
            ? `${format(new Date(dateRange.from), "MMM dd, yyyy")} - ${format(
                new Date(dateRange.to),
                "MMM dd, yyyy"
              )}`
            : "Select dates"}
        </span>
      </div>

      {/* Period selector dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            {getCurrentPeriodLabel()}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {PERIOD_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handlePeriodChange(option.value)}
              className={
                selectedPeriod === option.value
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  : ""
              }
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Time Range Filter - Like Loyverse */}
      {showTimeFilter && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Clock className="h-4 w-4" />
              {isAllDay ? "All day" : `${customFromHour} - ${customToHour}`}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-2">
            <DropdownMenuItem
              onClick={() => handleTimeRangeChange(true)}
              className={isAllDay ? "bg-green-100 dark:bg-green-900/30" : ""}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    isAllDay
                      ? "border-green-600 bg-green-600"
                      : "border-neutral-400"
                  }`}
                >
                  {isAllDay && (
                    <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5" />
                  )}
                </div>
                All day
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleTimeRangeChange(false)}
              className={!isAllDay ? "bg-green-100 dark:bg-green-900/30" : ""}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    !isAllDay
                      ? "border-green-600 bg-green-600"
                      : "border-neutral-400"
                  }`}
                >
                  {!isAllDay && (
                    <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5" />
                  )}
                </div>
                Custom period
              </div>
            </DropdownMenuItem>
            {!isAllDay && (
              <div className="mt-2 p-2 space-y-2 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-12">
                    From:
                  </span>
                  <Input
                    type="time"
                    value={customFromHour}
                    onChange={(e) =>
                      handleCustomTimeChange("from", e.target.value)
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-12">
                    To:
                  </span>
                  <Input
                    type="time"
                    value={customToHour}
                    onChange={(e) =>
                      handleCustomTimeChange("to", e.target.value)
                    }
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
