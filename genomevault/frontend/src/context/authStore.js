import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set, get) => ({
      token:   null,
      user:    null,
      role:    null,   // "dataOwner" | "researcher" | "admin"
      address: null,

      setAuth: (token, user, role) => set({ token, user, role, address: user?.walletAddress || null }),
      setAddress: (address) => set({ address }),
      logout: () => set({ token: null, user: null, role: null, address: null }),
      isAuthenticated: () => !!get().token,
    }),
    { name: "gv-auth" }
  )
);

export default useAuthStore;
