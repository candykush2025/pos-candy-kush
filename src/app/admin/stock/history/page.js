"use client";

import StockHistorySection from "@/components/admin/stock/StockHistorySection";

export default function StockHistoryPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold">Stock History</h1>
          <p className="text-neutral-500 mt-1 lg:mt-2 text-sm lg:text-base hidden sm:block">
            View complete history of all stock movements
          </p>
        </div>
      </div>

      <StockHistorySection />
    </div>
  );
}
