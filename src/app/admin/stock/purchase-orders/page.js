"use client";

import PurchaseOrdersSection from "@/components/admin/stock/PurchaseOrdersSection";

export default function PurchaseOrdersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold">Purchase Orders</h1>
          <p className="text-neutral-500 mt-1 lg:mt-2 text-sm lg:text-base hidden sm:block">
            Create and manage purchase orders to receive stock
          </p>
        </div>
      </div>

      <PurchaseOrdersSection />
    </div>
  );
}
