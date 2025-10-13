"use client";

import { useState, useEffect } from "react";
import { useTicketStore } from "@/store/useTicketStore";
import { useCartStore } from "@/store/useCartStore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Ticket,
  Search,
  Trash2,
  Eye,
  ShoppingCart,
  Calendar,
  DollarSign,
  Package,
  Clock,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { toast } from "sonner";

// Ticket Card Component
function TicketCard({ ticket, onView, onDelete, onResume }) {
  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="h-5 w-5 text-gray-500" />
            <h3 className="font-bold text-lg">
              {ticket.name || `Ticket #${ticket.id.slice(0, 8)}`}
            </h3>
          </div>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDateTime(ticket.createdAt)}
          </p>
        </div>
        <Badge variant="secondary">{ticket.items?.length || 0} items</Badge>
      </div>

      <Separator className="my-3" />

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal:</span>
          <span>{formatCurrency(ticket.subtotal || 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Discount:</span>
          <span className="text-red-600">
            -{formatCurrency(ticket.discountAmount || 0)}
          </span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Total:</span>
          <span className="text-lg">{formatCurrency(ticket.total || 0)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" onClick={() => onView(ticket)}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="default" size="sm" onClick={() => onResume(ticket)}>
          <ShoppingCart className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(ticket.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

// Ticket Details Modal Component
function TicketDetailsModal({ ticket, open, onClose }) {
  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ticket Details</DialogTitle>
          <DialogDescription>
            {ticket.name || `Ticket #${ticket.id.slice(0, 8)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Created
            </div>
            <div className="font-medium">
              {formatDateTime(ticket.createdAt)}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">
              Items ({ticket.items?.length || 0})
            </h4>
            <div className="space-y-2">
              {ticket.items?.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(item.price)} × {item.quantity}
                    </div>
                  </div>
                  <div className="font-bold">{formatCurrency(item.total)}</div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span>{formatCurrency(ticket.subtotal || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount:</span>
              <span className="text-red-600">
                -{formatCurrency(ticket.discountAmount || 0)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>{formatCurrency(ticket.total || 0)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Tickets Page Component
export default function TicketsPage() {
  const router = useRouter();
  const { tickets, deleteTicket, setActiveTicket } = useTicketStore();
  const { loadCart } = useCartStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    setFilteredTickets(tickets);
  }, [tickets]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTickets(tickets);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = tickets.filter(
        (ticket) =>
          ticket.name?.toLowerCase().includes(query) ||
          ticket.id.toLowerCase().includes(query) ||
          ticket.items?.some((item) => item.name.toLowerCase().includes(query))
      );
      setFilteredTickets(filtered);
    }
  }, [searchQuery, tickets]);

  const handleViewTicket = (ticket) => {
    setSelectedTicket(ticket);
    setShowDetailsModal(true);
  };

  const handleDeleteTicket = (ticketId) => {
    if (confirm("Are you sure you want to delete this ticket?")) {
      deleteTicket(ticketId);
      toast.success("Ticket deleted successfully");
    }
  };

  const handleResumeTicket = (ticket) => {
    setActiveTicket(ticket.id);
    // Load entire cart data including items, discount, tax, customer
    loadCart({
      items: ticket.items || [],
      discount: ticket.discount || { type: "percentage", value: 0 },
      tax: ticket.tax || { rate: 0, amount: 0 },
      customer: ticket.customer || null,
      notes: ticket.notes || "",
    });
    toast.success("Ticket loaded into cart");
    router.push("/sales");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Ticket className="h-8 w-8" />
              Saved Tickets
            </h1>
            <p className="text-gray-600 mt-1">
              Manage and resume parked transactions
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {tickets.length} Tickets
          </Badge>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search tickets by name, ID, or items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
      </div>

      {/* Tickets Grid */}
      {filteredTickets.length === 0 ? (
        <Card className="p-12 text-center">
          <Ticket className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            {searchQuery ? "No tickets found" : "No saved tickets"}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery
              ? "Try adjusting your search query"
              : "Parked tickets will appear here"}
          </p>
          {!searchQuery && (
            <Button onClick={() => router.push("/sales")}>Go to Sales</Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onView={handleViewTicket}
              onDelete={handleDeleteTicket}
              onResume={handleResumeTicket}
            />
          ))}
        </div>
      )}

      {/* Ticket Details Modal */}
      <TicketDetailsModal
        ticket={selectedTicket}
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />
    </div>
  );
}
