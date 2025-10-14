import { create } from "zustand";

export const usePosTabStore = create((set) => ({
  activeTab: "sales",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
