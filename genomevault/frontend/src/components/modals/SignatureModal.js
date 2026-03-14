import { useWallet } from "../../hooks/useWallet";
import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ethers } from "ethers";
import toast from "react-hot-toast";

export default function SignatureModal({ isOpen, onClose, onSigned, title, message, actionLabel = "Confirm action", details = [] }) {
  const modalRef = useRef(null);
  const { signMessage } = useWallet();
  const [signing,  setSigning]  = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    gsap.fromTo(modalRef.current,
      { scale: 0.9, opacity: 0, y: 20 },
      { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.5)" }
    );
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSign() {
    setError("");
    setSigning(true);
    try {
      const signature = await signMessage(message);
      onSigned(signature);
    } catch (err) {
      setError(err.message || "Signing failed or was rejected");
    } finally {
      setSigning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4"
         style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={modalRef} className="glass-card border-glow w-full max-w-lg">
        {/* Header */}
        <div className="border-b border-gv-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-gv-green flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2">
                <path d="M12 2L8 6H3v5l-2 1 2 1v5h5l4 4 4-4h5v-5l2-1-2-1V6h-5L12 2z"/>
              </svg>
            </div>
            <span className="font-heading text-lg font-bold text-gv-green tracking-wider">{title}</span>
          </div>
          <button onClick={onClose} className="text-gv-muted hover:text-gv-green transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Message preview */}
          <div className="bg-gv-dark border border-gv-border p-4">
            <p className="font-mono text-xs text-gv-muted mb-1 tracking-wider">SIGNING MESSAGE</p>
            <pre className="font-mono text-xs text-gv-text whitespace-pre-wrap leading-relaxed">{message}</pre>
          </div>

          {/* Details grid */}
          {details.length > 0 && (
            <div className="space-y-2">
              {details.map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start gap-4">
                  <span className="font-mono text-xs text-gv-muted tracking-wider">{label}</span>
                  <span className="font-mono text-xs text-gv-text text-right break-all max-w-xs">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Security note */}
          <div className="flex items-start gap-2 px-3 py-2 bg-gv-green/5 border border-gv-green/20">
            <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            <p className="font-mono text-xs text-gv-muted">
              This is a <span className="text-gv-green">cryptographic signature only</span> — no gas fees, no blockchain transaction.
              Your private key never leaves MetaMask.
            </p>
          </div>

          {error && (
            <p className="font-mono text-xs text-gv-danger border border-gv-danger/30 px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gv-border px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 btn-ghost text-sm py-2.5">
            CANCEL
          </button>
          <button
            onClick={handleSign}
            disabled={signing}
            className="flex-1 btn-primary text-sm py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {signing ? (
              <>
                <div className="w-4 h-4 border-2 border-gv-black border-t-transparent rounded-full animate-spin" />
                SIGNING...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h4m4 0V1m-4 2V1m0 0h4"/>
                </svg>
                SIGN WITH METAMASK
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
