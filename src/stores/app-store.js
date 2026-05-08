import { create } from "zustand";

export const useAppStore = create((set) => ({
  activeAccount: null,
  network: "sepolia",
  setActiveAccount: (activeAccount) => set({ activeAccount }),
  setNetwork: (network) => set({ network }),
}));
