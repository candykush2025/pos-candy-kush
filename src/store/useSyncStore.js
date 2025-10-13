import { create } from "zustand";
import { SYNC_STATUS } from "@/config/constants";

export const useSyncStore = create((set, get) => ({
  status: SYNC_STATUS.SYNCED,
  isOnline: true,
  lastSyncTime: null,
  pendingCount: 0,
  errors: [],

  // Set online status
  setOnline: (isOnline) => {
    set({
      isOnline,
      status: isOnline ? get().status : SYNC_STATUS.OFFLINE,
    });
  },

  // Set sync status
  setStatus: (status) => {
    set({ status });
  },

  // Set last sync time
  setLastSyncTime: (timestamp) => {
    set({ lastSyncTime: timestamp });
  },

  // Set pending count
  setPendingCount: (count) => {
    set({ pendingCount: count });
  },

  // Add sync error
  addError: (error) => {
    set({ errors: [...get().errors, { ...error, timestamp: Date.now() }] });
  },

  // Clear errors
  clearErrors: () => {
    set({ errors: [] });
  },

  // Get sync info
  getSyncInfo: () => {
    const state = get();
    return {
      status: state.status,
      isOnline: state.isOnline,
      lastSyncTime: state.lastSyncTime,
      pendingCount: state.pendingCount,
      hasErrors: state.errors.length > 0,
    };
  },
}));

export default useSyncStore;
