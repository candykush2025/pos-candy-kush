"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ChevronDown, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  showTimeFilter = true,
  timeRange,
  onTimeRangeChange,
}) {
  const [isAllDay, setIsAllDay] = useState(true);
  const [customFromHour, setCustomFromHour] = useState("00:00");
  const [customToHour, setCustomToHour] = useState("23:59");
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarStartDate, setCalendarStartDate] = useState(null);
  const calendarRef = useRef(null);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
        setCalendarStartDate(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  const handleCalendarDateChange = (dates) => {
    if (Array.isArray(dates)) {
      const [start, end] = dates;
      if (start && end) {
        // Range selected
        onDateRangeChange({ from: start, to: end });
        setShowCalendar(false);
        setCalendarStartDate(null);
      }
    }
  };

  const handleCalendarSelect = (date) => {
    if (!calendarStartDate) {
      // First date selected - set as start
      setCalendarStartDate(date);
    } else if (calendarStartDate.getTime() === date.getTime()) {
      // Same date clicked again - single date selection
      onDateRangeChange({ from: date, to: date });
      setShowCalendar(false);
      setCalendarStartDate(null);
    } else {
      // Different date clicked - create range
      const start = calendarStartDate < date ? calendarStartDate : date;
      const end = calendarStartDate < date ? date : calendarStartDate;
      onDateRangeChange({ from: start, to: end });
      setShowCalendar(false);
      setCalendarStartDate(null);
    }
  };

  const handleSingleDateSelect = (date) => {
    onDateRangeChange({ from: date, to: date });
    setShowCalendar(false);
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
      {/* Date range display */}
      <div className="relative" ref={calendarRef}>
        <Button
          variant="outline"
          onClick={() => {
            setShowCalendar(!showCalendar);
            if (!showCalendar) {
              setCalendarStartDate(null);
            }
          }}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-neutral-800 border rounded-lg text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700"
        >
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
          <ChevronDown className="h-4 w-4" />
        </Button>

        {/* Calendar Popup */}
        {showCalendar && (
          <div className="absolute top-full mt-2 z-50 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-4">
            <DatePicker
              selected={
                calendarStartDate ||
                (dateRange?.from ? new Date(dateRange.from) : null)
              }
              onChange={handleCalendarDateChange}
              onSelect={handleCalendarSelect}
              startDate={calendarStartDate}
              endDate={calendarStartDate}
              selectsRange={!!calendarStartDate}
              inline
              calendarClassName="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              dayClassName={(date) =>
                "hover:bg-green-100 dark:hover:bg-green-900/30 rounded-md"
              }
              monthClassName="text-neutral-900 dark:text-neutral-100"
              yearClassName="text-neutral-900 dark:text-neutral-100"
              highlightDates={calendarStartDate ? [calendarStartDate] : []}
            />
            <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 text-center">
              Click a date for single day, or click start date then end date for
              range
            </div>
          </div>
        )}
      </div>

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
