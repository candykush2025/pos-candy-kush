"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";

/**
 * ReportDataTable - Data table for reports with sorting and export
 */
export function ReportDataTable({
  columns,
  data,
  currency = "฿",
  onSort,
  sortBy,
  sortOrder,
  showExport = true,
  exportFilename = "report",
}) {
  const [currentSortBy, setCurrentSortBy] = useState(sortBy || columns[0]?.key);
  const [currentSortOrder, setCurrentSortOrder] = useState(sortOrder || "desc");

  const handleSort = (key) => {
    const newOrder =
      currentSortBy === key && currentSortOrder === "desc" ? "asc" : "desc";
    setCurrentSortBy(key);
    setCurrentSortOrder(newOrder);
    onSort?.(key, newOrder);
  };

  // Export to CSV (only visible columns)
  const exportToCSV = () => {
    const visibleColumns = columns.filter((col) => !col.hidden);
    const headers = visibleColumns.map((col) => col.label).join(",");
    const rows = data.map((row) =>
      visibleColumns
        .map((col) => {
          let value = row[col.key];
          if (col.format === "currency" && typeof value === "number") {
            value = value.toFixed(2);
          }
          // Escape commas and quotes
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? "";
        })
        .join(",")
    );
    const csv = [headers, ...rows].join("\n");
    downloadFile(csv, `${exportFilename}.csv`, "text/csv");
  };

  // Export to JSON
  const exportToJSON = () => {
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, `${exportFilename}.json`, "application/json");
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Format cell value
  const formatCell = (value, column) => {
    if (value === null || value === undefined) return "-";

    if (column.format === "currency") {
      return `${currency}${value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    if (column.format === "number") {
      return value.toLocaleString("en-US");
    }
    if (column.format === "percent") {
      return `${value.toFixed(1)}%`;
    }
    if (column.format === "date" && value instanceof Date) {
      return value.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    return value;
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg border dark:border-neutral-800">
      {/* Header with export */}
      {showExport && (
        <div className="flex items-center justify-between p-4 border-b dark:border-neutral-800">
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            {data.length} records
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToJSON}>
                <FileText className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
              {columns
                .filter((column) => !column.hidden)
                .map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider ${
                      column.sortable
                        ? "cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        : ""
                    } ${column.align === "right" ? "text-right" : ""}`}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-1">
                      {column.label}
                      {column.sortable && currentSortBy === column.key && (
                        <span>{currentSortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-neutral-800">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.filter((col) => !col.hidden).length}
                  className="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400"
                >
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                  {columns
                    .filter((column) => !column.hidden)
                    .map((column) => (
                      <td
                        key={column.key}
                        className={`px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 ${
                          column.align === "right" ? "text-right" : ""
                        }`}
                      >
                        {column.render
                          ? column.render(row[column.key], row)
                          : formatCell(row[column.key], column)}
                      </td>
                    ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * TablePagination - Pagination controls for tables
 */
export function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) {
  return (
    <div className="flex items-center justify-between p-4 border-t dark:border-neutral-800">
      <div className="flex items-center gap-2">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          Showing
        </span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          className="h-8 px-2 text-sm border rounded bg-white dark:bg-neutral-800 dark:border-neutral-700"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          of {totalItems} records
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange?.(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span className="px-3 text-sm text-neutral-600 dark:text-neutral-400">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange?.(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
