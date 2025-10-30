"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  History,
  TrendingUp,
  TrendingDown,
  Search,
  Package,
} from "lucide-react";
import { stockHistoryService } from "@/lib/firebase/stockHistoryService";
import { toast } from "sonner";

const typeLabels = {
  initial: {
    label: "Initial Stock",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  sale: {
    label: "Sale",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
  purchase_order: {
    label: "Purchase Order",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  adjustment: {
    label: "Manual Adjustment",
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
};

export default function StockHistorySection() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const { history: data } = await stockHistoryService.getAllHistory(200);
      setHistory(data);
    } catch (error) {
      console.error("Error loading stock history:", error);
      toast.error("Failed to load stock history");
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.productSku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.referenceId?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search by product name, SKU, or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-neutral-500 mt-4">Loading history...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Stock History</h3>
            <p className="text-neutral-500">
              {searchQuery
                ? "No results found"
                : "Stock movements will appear here"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 dark:bg-neutral-800 border-b dark:border-neutral-700">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">Date</th>
                  <th className="text-left p-4 font-semibold text-sm">Item</th>
                  <th className="text-left p-4 font-semibold text-sm">
                    Employee
                  </th>
                  <th className="text-left p-4 font-semibold text-sm">
                    Reason
                  </th>
                  <th className="text-center p-4 font-semibold text-sm">
                    Adjustment
                  </th>
                  <th className="text-center p-4 font-semibold text-sm">
                    Stock After
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-neutral-700">
                {filteredHistory.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    {/* Date */}
                    <td className="p-4">
                      <div className="text-sm">
                        {item.createdAt?.toDate
                          ? item.createdAt
                              .toDate()
                              .toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                          : "N/A"}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {item.createdAt?.toDate
                          ? item.createdAt
                              .toDate()
                              .toLocaleTimeString("en-GB", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                          : ""}
                      </div>
                    </td>

                    {/* Item */}
                    <td className="p-4">
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {item.productName}
                      </div>
                      {item.productSku && (
                        <div className="text-xs text-neutral-500">
                          SKU: {item.productSku}
                        </div>
                      )}
                    </td>

                    {/* Employee */}
                    <td className="p-4">
                      <div className="text-sm">{item.userName || "System"}</div>
                    </td>

                    {/* Reason */}
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <Badge className={typeLabels[item.type]?.color || ""}>
                          {typeLabels[item.type]?.label || item.type}
                        </Badge>
                        {item.reason && (
                          <div className="text-xs text-neutral-500 mt-1">
                            {item.reason}
                          </div>
                        )}
                        {item.referenceId && (
                          <div className="text-xs text-neutral-400">
                            Ref: {item.referenceId}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Adjustment */}
                    <td className="p-4 text-center">
                      <div
                        className={`font-bold text-lg ${
                          item.quantity > 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {item.quantity > 0 ? "+" : ""}
                        {item.quantity}
                      </div>
                    </td>

                    {/* Stock After */}
                    <td className="p-4 text-center">
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {item.newStock}
                      </div>
                      <div className="text-xs text-neutral-500">
                        (was {item.previousStock})
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
