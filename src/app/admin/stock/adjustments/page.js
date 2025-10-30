"use client";

import StockAdjustmentSection from "@/components/admin/stock/StockAdjustmentSection";

export default function StockAdjustmentPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold">Stock Adjustment</h1>
          <p className="text-neutral-500 mt-1 lg:mt-2 text-sm lg:text-base hidden sm:block">
            Manually adjust stock levels with reasons
          </p>
        </div>
      </div>

      <StockAdjustmentSection />
    </div>
  );
}
