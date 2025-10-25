"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/store/useCartStore";
import { useTicketStore } from "@/store/useTicketStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Ticket, Trash2, Clock, User, DollarSign } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { toast } from "sonner";

export default function TicketsSection({ onSwitchToSales }) {
  const { user } = useAuthStore();
  const { tickets, deleteTicket, getTicketById } = useTicketStore();
  const { loadCart, setCustomer } = useCartStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const handleResumeTicket = (ticket) => {
    // Load ticket data into cart
    loadCart({
      items: ticket.items,
      discount: ticket.discount,
      tax: ticket.tax,
      customer: ticket.customer,
      notes: ticket.notes,
    });

    // Set customer if exists
    if (ticket.customer) {
      setCustomer(ticket.customer);
    }

    toast.success(`Ticket ${ticket.ticketNumber} resumed`);

    // Switch to sales tab
    if (onSwitchToSales) {
      onSwitchToSales();
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!confirm("Are you sure you want to delete this ticket?")) return;

    try {
      await deleteTicket(ticketId);
      toast.success("Ticket deleted successfully");
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toast.error("Failed to delete ticket");
    }
  };

  const handleViewDetails = (ticket) => {
    setSelectedTicket(ticket);
    setShowDetailsModal(true);
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.ticketNumber?.toLowerCase().includes(query) ||
      ticket.customer?.name?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="h-full flex flex-col p-6 overflow-auto bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Ticket className="h-8 w-8 text-primary" />
          Saved Tickets
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Resume or manage your saved tickets
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tickets by number or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tickets Grid */}
      {filteredTickets.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No saved tickets</p>
            <p className="text-sm text-gray-400 mt-2">
              Save tickets from the Sales tab
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTickets.map((ticket) => (
            <Card key={ticket.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {ticket.ticketNumber}
                    </CardTitle>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(ticket.createdAt, "datetime")}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {ticket.items?.length || 0} items
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticket.customer && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    {ticket.customer.name}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(ticket.total)}
                  </span>
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleResumeTicket(ticket)}
                  >
                    Resume
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleViewDetails(ticket)}
                  >
                    Details
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDeleteTicket(ticket.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
            <DialogDescription>
              {selectedTicket?.ticketNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              {selectedTicket.customer && (
                <div>
                  <h3 className="font-semibold mb-2">Customer</h3>
                  <p>{selectedTicket.customer.name}</p>
                  <p className="text-sm text-gray-500">
                    {selectedTicket.customer.customerCode}
                  </p>
                </div>
              )}
              <div>
                <h3 className="font-semibold mb-2">Items</h3>
                <div className="space-y-2">
                  {selectedTicket.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>{formatCurrency(selectedTicket.total)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
