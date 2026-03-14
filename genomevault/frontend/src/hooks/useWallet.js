import { useState, useCallback } from "react";
import { ethers } from "ethers";
import useAuthStore from "../context/authStore";
import api from "../utils/api";
import toast from "react-hot-toast";

export function useWallet() {
  const [connecting, setConnecting] = useState(false);
  const { address, setAuth, setAddress, logout } = useAuthStore();

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      toast.error("MetaMask not installed. Please install MetaMask.");
      return null;
    }
    setConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer  = await provider.getSigner();
      const addr    = await signer.getAddress();

      // Build and sign auth message
      const timestamp = Date.now();
      const message = `GenomeVault Authentication\n\nWallet: ${addr}\nTimestamp: ${timestamp}\n\nSign this message to authenticate. This does not initiate a transaction.`;

      const signature = await signer.signMessage(message);

      // Backend verify + get JWT
      const { data } = await api.post("/auth/wallet-login", { address: addr, signature, message });
      setAuth(data.token, data.user, data.role);
      toast.success(`Connected as ${data.role}`);
      return { address: addr, role: data.role };
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || "Connection failed");
      return null;
    } finally {
      setConnecting(false);
    }
  }, [setAuth]);

  const signMessage = useCallback(async (message) => {
    if (!window.ethereum) throw new Error("MetaMask not available");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer   = await provider.getSigner();
    return signer.signMessage(message);
  }, []);

  const disconnect = useCallback(() => {
    logout();
    toast.success("Disconnected");
  }, [logout]);

  const formatAddress = (addr) =>
    addr ? `${addr.slice(0,6)}...${addr.slice(-4)}` : "";

  return { address, connecting, connect, disconnect, signMessage, formatAddress };
}
