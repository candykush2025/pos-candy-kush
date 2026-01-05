"use client";

import StockManagementSection from "@/components/admin/stock/StockManagementSection";

export default function StockManagementPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold">Stock Management</h1>
          <p className="text-neutral-500 mt-1 lg:mt-2 text-sm lg:text-base hidden sm:block">
            View and monitor all product stock levels
          </p>
        </div>
      </div>

      <StockManagementSection />
    </div>
  );
}
