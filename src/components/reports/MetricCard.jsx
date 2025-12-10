"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Info, TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * MetricCard - Displays a single metric with comparison to previous period
 * Styled like Loyverse's report cards
 */
export function MetricCard({
  title,
  value,
  previousValue,
  format = "currency",
  currency = "฿",
  isActive = false,
  onClick,
  tooltip,
}) {
  // Calculate change
  const numValue = typeof value === "number" ? value : parseFloat(value) || 0;
  const numPrevValue =
    typeof previousValue === "number"
      ? previousValue
      : parseFloat(previousValue) || 0;
  const change = numValue - numPrevValue;
  const changePercent =
    numPrevValue !== 0
      ? ((change / Math.abs(numPrevValue)) * 100).toFixed(1)
      : 0;

  // Determine if change is positive, negative, or neutral
  const isPositive = change > 0;
  const isNegative = change < 0;
  const isNeutral = change === 0;

  // For metrics where lower is better (like refunds, discounts), invert the color logic
  const isInvertedMetric =
    title.toLowerCase().includes("refund") ||
    title.toLowerCase().includes("discount");

  const getChangeColor = () => {
    if (isNeutral) return "text-neutral-500";
    if (isInvertedMetric) {
      return isPositive ? "text-red-500" : "text-green-500";
    }
    return isPositive ? "text-green-500" : "text-red-500";
  };

  // Format the value
  const formatValue = (val) => {
    if (format === "currency") {
      return `${currency}${val.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    if (format === "number") {
      return val.toLocaleString("en-US");
    }
    if (format === "percent") {
      return `${val.toFixed(1)}%`;
    }
    return val;
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isActive
          ? "ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20"
          : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
            {title}
          </span>
          {tooltip && (
            <div className="group relative">
              <Info className="h-4 w-4 text-neutral-400 cursor-help" />
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10">
                <div className="bg-neutral-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                  {tooltip}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          {formatValue(numValue)}
        </div>

        {previousValue !== undefined && (
          <div
            className={`flex items-center gap-1 mt-1 text-sm ${getChangeColor()}`}
          >
            {isPositive && <TrendingUp className="h-3 w-3" />}
            {isNegative && <TrendingDown className="h-3 w-3" />}
            {isNeutral && <Minus className="h-3 w-3" />}
            <span>
              {isPositive ? "+" : ""}
              {formatValue(Math.abs(change))}
            </span>
            {!isNeutral && (
              <span className="text-neutral-500">
                ({isPositive ? "+" : ""}
                {changePercent}%)
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * MetricsRow - Displays multiple metric cards in a responsive row
 */
export function MetricsRow({ children, className = "" }) {
  return (
    <div
      className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 ${className}`}
    >
      {children}
    </div>
  );
}
