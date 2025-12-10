"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Theme colors matching Loyverse style
const CHART_COLORS = {
  primary: "#8BC34A", // Green
  secondary: "#4CAF50",
  tertiary: "#2196F3",
  quaternary: "#FF9800",
  negative: "#f44336",
  neutral: "#9E9E9E",
};

const PIE_COLORS = [
  "#8BC34A",
  "#4CAF50",
  "#2196F3",
  "#FF9800",
  "#9C27B0",
  "#00BCD4",
  "#E91E63",
  "#3F51B5",
  "#FF5722",
  "#009688",
];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, currency = "฿" }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          {label}
        </p>
        {payload.map((entry, index) => (
          <p
            key={index}
            className="text-sm"
            style={{ color: entry.color || CHART_COLORS.primary }}
          >
            <span className="font-semibold">
              {currency}
              {entry.value?.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/**
 * SalesAreaChart - Area chart for sales trends
 */
export function SalesAreaChart({
  data,
  dataKey = "value",
  xAxisKey = "date",
  title,
  height = 350,
  currency = "฿",
  color = CHART_COLORS.primary,
}) {
  const formatYAxis = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value;
  };

  return (
    <Card>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 12, fill: "#6B7280" }}
              tickLine={false}
              axisLine={{ stroke: "#E5E7EB" }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 12, fill: "#6B7280" }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValue)"
              dot={{ fill: "#fff", stroke: color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * SalesBarChart - Bar chart for category/item comparison
 * Supports single dataKey or multiple dataKeys for stacked bars
 */
export function SalesBarChart({
  data,
  dataKey = "value",
  dataKeys = null, // Array of keys for stacked bars
  colors = null, // Array of colors for stacked bars
  xAxisKey = "name",
  title,
  height = 350,
  currency = "฿",
  color = CHART_COLORS.primary,
  layout = "vertical", // or "horizontal"
  stacked = false,
  formatTooltip = null,
}) {
  const formatValue = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value;
  };

  // Custom tooltip for stacked bars
  const StackedTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {label}
          </p>
          {payload.map(
            (entry, index) =>
              entry.value > 0 && (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm mb-1"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-neutral-600 dark:text-neutral-400">
                    {entry.dataKey}
                  </span>
                  <span
                    className="font-semibold ml-auto"
                    style={{ color: entry.color }}
                  >
                    {formatTooltip
                      ? formatTooltip(entry.value)
                      : `${currency}${entry.value?.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`}
                  </span>
                </div>
              )
          )}
        </div>
      );
    }
    return null;
  };

  // Use stacked bars if dataKeys are provided
  const isStacked = stacked && dataKeys && dataKeys.length > 0;

  return (
    <Card>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout={layout}
            margin={
              layout === "vertical"
                ? { top: 10, right: 30, left: 100, bottom: 0 }
                : { top: 10, right: 30, left: 0, bottom: 60 }
            }
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            {layout === "vertical" ? (
              <>
                <XAxis
                  type="number"
                  tickFormatter={formatValue}
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey={xAxisKey}
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  tickLine={false}
                  width={90}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={xAxisKey}
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                />
                <YAxis
                  tickFormatter={formatValue}
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  tickLine={false}
                />
              </>
            )}
            <Tooltip
              content={
                isStacked ? (
                  <StackedTooltip />
                ) : (
                  <CustomTooltip currency={currency} />
                )
              }
            />
            {isStacked ? (
              dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="stack"
                  fill={
                    colors?.[index] || PIE_COLORS[index % PIE_COLORS.length]
                  }
                />
              ))
            ) : (
              <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * SalesLineChart - Line chart for multi-metric comparison
 * Supports multiple dataKeys for multi-line charts
 */
export function SalesLineChart({
  data,
  lines = [{ dataKey: "value", color: CHART_COLORS.primary, name: "Sales" }],
  dataKeys = null, // Array of keys for multiple lines
  colors = null, // Array of colors for multiple lines
  xAxisKey = "date",
  title,
  height = 350,
  currency = "฿",
  formatTooltip = null,
}) {
  const formatYAxis = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value;
  };

  // Custom tooltip for multi-line chart
  const MultiLineTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {label}
          </p>
          {payload.map(
            (entry, index) =>
              entry.value > 0 && (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm mb-1"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-neutral-600 dark:text-neutral-400">
                    {entry.dataKey}
                  </span>
                  <span
                    className="font-semibold ml-auto"
                    style={{ color: entry.color }}
                  >
                    {formatTooltip
                      ? formatTooltip(entry.value)
                      : `${currency}${entry.value?.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`}
                  </span>
                </div>
              )
          )}
        </div>
      );
    }
    return null;
  };

  // Use dataKeys if provided
  const useDataKeys = dataKeys && dataKeys.length > 0;
  const linesToRender = useDataKeys
    ? dataKeys.map((key, index) => ({
        dataKey: key,
        name: key,
        color: colors?.[index] || PIE_COLORS[index % PIE_COLORS.length],
      }))
    : lines;

  return (
    <Card>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 10, fill: "#6B7280" }}
              tickLine={false}
              axisLine={{ stroke: "#E5E7EB" }}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 12, fill: "#6B7280" }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip
              content={
                useDataKeys ? (
                  <MultiLineTooltip />
                ) : (
                  <CustomTooltip currency={currency} />
                )
              }
            />
            {useDataKeys && <Legend />}
            {linesToRender.map((line, index) => (
              <Line
                key={index}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name}
                stroke={line.color}
                strokeWidth={2}
                dot={{ fill: "#fff", stroke: line.color, strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * SalesPieChart - Pie chart for distribution
 */
export function SalesPieChart({
  data,
  dataKey = "value",
  nameKey = "name",
  title,
  height = 350,
  currency = "฿",
  showLegend = true,
  formatTooltip = null,
}) {
  const total = data.reduce((sum, item) => sum + (item[dataKey] || 0), 0);

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percent = ((item.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {item.name}
          </p>
          <p className="text-sm" style={{ color: item.payload.fill }}>
            {formatTooltip
              ? formatTooltip(item.value)
              : `${currency}${item.value?.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}{" "}
            ({percent}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              dataKey={dataKey}
              nameKey={nameKey}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
            {showLegend && (
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                formatter={(value, entry) => (
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    {value}
                  </span>
                )}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Export colors for use in other components
export { CHART_COLORS, PIE_COLORS };
