import { create } from "zustand";
import { nanoid } from "nanoid";
import { ORDER_STATUS } from "@/config/constants";

export const useTicketStore = create((set, get) => ({
  tickets: [],
  activeTicketId: null,

  // Create new ticket
  createTicket: (cartData, userId) => {
    const ticket = {
      id: nanoid(),
      ticketNumber: `T${Date.now()}`,
      userId,
      status: ORDER_STATUS.PARKED,
      items: cartData.items,
      discounts: cartData.discounts || [],
      discount: cartData.discount,
      tax: cartData.tax,
      customer: cartData.customer,
      notes: cartData.notes,
      subtotal: cartData.subtotal,
      total: cartData.total,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set({ tickets: [...get().tickets, ticket] });
    return ticket.id;
  },

  // Update ticket
  updateTicket: (ticketId, cartData) => {
    set({
      tickets: get().tickets.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              items: cartData.items,
              discounts: cartData.discounts || [],
              discount: cartData.discount,
              tax: cartData.tax,
              customer: cartData.customer,
              notes: cartData.notes,
              subtotal: cartData.subtotal,
              total: cartData.total,
              updatedAt: new Date().toISOString(),
            }
          : ticket
      ),
    });
  },

  // Delete ticket
  deleteTicket: (ticketId) => {
    set({
      tickets: get().tickets.filter((t) => t.id !== ticketId),
      activeTicketId:
        get().activeTicketId === ticketId ? null : get().activeTicketId,
    });
  },

  // Set active ticket
  setActiveTicket: (ticketId) => {
    set({ activeTicketId: ticketId });
  },

  // Get ticket by ID
  getTicketById: (ticketId) => {
    return get().tickets.find((t) => t.id === ticketId);
  },

  // Get active ticket
  getActiveTicket: () => {
    const { activeTicketId, tickets } = get();
    return tickets.find((t) => t.id === activeTicketId);
  },

  // Complete ticket (convert to order)
  completeTicket: (ticketId) => {
    const ticket = get().getTicketById(ticketId);
    if (ticket) {
      set({
        tickets: get().tickets.map((t) =>
          t.id === ticketId ? { ...t, status: ORDER_STATUS.COMPLETED } : t
        ),
      });
      return ticket;
    }
    return null;
  },

  // Get tickets count
  getTicketsCount: () => {
    return get().tickets.length;
  },

  // Get tickets by user
  getTicketsByUser: (userId) => {
    return get().tickets.filter((t) => t.userId === userId);
  },

  // Clear all tickets
  clearTickets: () => {
    set({ tickets: [], activeTicketId: null });
  },

  // Load tickets from database
  loadTickets: (tickets) => {
    set({ tickets });
  },
}));

export default useTicketStore;
