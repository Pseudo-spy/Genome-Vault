import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useWallet } from "../../hooks/useWallet";
import useAuthStore from "../../context/authStore";

export default function WalletButton({ className = "" }) {
  const { address, connecting, connect, disconnect, formatAddress } = useWallet();
  const { role } = useAuthStore();
  const btnRef = useRef(null);

  useEffect(() => {
    if (address && btnRef.current) {
      gsap.fromTo(btnRef.current,
        { borderColor: "rgba(0,255,136,0)", boxShadow: "none" },
        { borderColor: "rgba(0,255,136,0.6)", boxShadow: "0 0 15px rgba(0,255,136,0.3)", duration: 0.5, yoyo: true, repeat: 1 }
      );
    }
  }, [address]);

  if (address) {
    return (
      <div ref={btnRef} className={`flex items-center gap-3 border border-gv-green/40 px-4 py-2 ${className}`}>
        <div className="w-2 h-2 bg-gv-green rounded-full animate-pulse" />
        <div>
          <p className="font-mono text-xs text-gv-green">{formatAddress(address)}</p>
          {role && <p className="font-mono text-xs text-gv-muted capitalize">{role}</p>}
        </div>
        <button onClick={disconnect}
          className="ml-2 font-mono text-xs text-gv-muted hover:text-gv-danger transition-colors border-l border-gv-border pl-3">
          ✕
        </button>
      </div>
    );
  }

  return (
    <button ref={btnRef} onClick={connect} disabled={connecting}
      className={`border border-gv-green/40 px-4 py-2 font-mono text-sm text-gv-green hover:bg-gv-green hover:text-gv-black transition-all duration-200 disabled:opacity-50 ${className}`}>
      {connecting ? (
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 border border-gv-green border-t-transparent animate-spin" />
          Connecting…
        </span>
      ) : "Connect Wallet"}
    </button>
  );
}
