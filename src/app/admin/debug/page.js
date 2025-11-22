"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getDocument,
  updateDocument,
  COLLECTIONS,
} from "@/lib/firebase/firestore";
import { toast } from "sonner";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Timestamp } from "firebase/firestore";

export default function DebugPage() {
  const [documentId, setDocumentId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadOrder = async () => {
    if (!documentId.trim()) {
      toast.error("Please enter a document ID");
      return;
    }

    setLoading(true);
    try {
      const order = await getDocument(COLLECTIONS.ORDERS, documentId.trim());
      if (order) {
        setOrderData(order);
        toast.success("Order loaded successfully");
      } else {
        toast.error("Order not found");
        setOrderData(null);
      }
    } catch (error) {
      console.error("Error loading order:", error);
      toast.error("Failed to load order");
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderDates = async () => {
    if (!orderData) {
      toast.error("No order loaded");
      return;
    }

    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    setLoading(true);
    try {
      // Create new date values
      const newTimestamp = Timestamp.fromDate(selectedDate);
      const newDateString = selectedDate.toISOString();

      // Prepare update data
      const updateData = {
        ...orderData,
        createdAt: newTimestamp,
        created_at: newDateString,
        updatedAt: newTimestamp,
        updated_at: newDateString,
        syncedAt: newDateString,
        receipt_date: newDateString,
        // Update payments array
        payments:
          orderData.payments?.map((payment) => ({
            ...payment,
            paid_at: newDateString,
          })) || [],
      };

      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData._firestoreId;
      delete updateData._dataId;

      await updateDocument(COLLECTIONS.ORDERS, documentId, updateData);

      // Reload the order to show updated data
      const updatedOrder = await getDocument(COLLECTIONS.ORDERS, documentId);
      setOrderData(updatedOrder);

      toast.success("Order dates updated successfully");
    } catch (error) {
      console.error("Error updating order dates:", error);
      toast.error("Failed to update order dates");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Order Date Debug Tool</CardTitle>
          <CardDescription>
            Load an order by document ID and update all date fields to a new
            date.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="documentId" className="block text-sm font-medium">
                Document ID
              </label>
              <Input
                id="documentId"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder="Enter order document ID"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">New Date</label>
              <DatePicker
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                dateFormat="yyyy-MM-dd HH:mm:ss"
                showTimeSelect
                timeFormat="HH:mm:ss"
                timeIntervals={1}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={loadOrder} disabled={loading}>
              {loading ? "Loading..." : "Load Order"}
            </Button>
            <Button
              onClick={updateOrderDates}
              disabled={loading || !orderData}
              variant="destructive"
            >
              {loading ? "Updating..." : "Update Dates"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {orderData && (
        <Card>
          <CardHeader>
            <CardTitle>Current Order Data</CardTitle>
            <CardDescription>Document ID: {orderData.id}</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={JSON.stringify(orderData, null, 2)}
              readOnly
              className="min-h-[400px] font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
