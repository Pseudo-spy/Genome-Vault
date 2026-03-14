import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { gsap } from "gsap";
import { useWallet } from "../../hooks/useWallet";
import useAuthStore from "../../context/authStore";

export default function Navbar() {
  const router = useRouter();
  const navRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { connect, disconnect, connecting, formatAddress } = useWallet();
  const { address, role, isAuthenticated } = useAuthStore();

  useEffect(() => {
    gsap.fromTo(navRef.current,
      { y: -60, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }
    );
  }, []);

  const dashboardHref = role === "researcher" ? "/researcher/dashboard"
                      : role === "admin"       ? "/admin/dashboard"
                      :                          "/dashboard";

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-gv-border"
      style={{ backdropFilter: "blur(20px)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 border border-gv-green flex items-center justify-center
                          group-hover:shadow-glow-sm transition-all duration-300">
            <span className="text-gv-green font-mono text-sm font-bold">GV</span>
          </div>
          <span className="font-heading text-xl font-bold text-gv-green tracking-widest">
            GENOME<span className="text-white">VAULT</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { href: "/#how-it-works", label: "How it works" },
            { href: "/researcher/signup", label: "For Researchers" },
          ].map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono text-xs text-gv-muted hover:text-gv-green transition-colors duration-200 tracking-wider uppercase"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated() ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-gv-border">
                <div className="w-2 h-2 rounded-full bg-gv-green animate-pulse" />
                <span className="font-mono text-xs text-gv-text">{formatAddress(address)}</span>
                <span className={`ml-1 text-xs px-1.5 py-0.5 font-mono ${
                  role === "researcher" ? "text-gv-cyan border border-gv-cyan/30" :
                  role === "admin"      ? "text-gv-amber border border-amber-600/30" :
                                          "text-gv-green border border-gv-green/30"
                }`}>{role}</span>
              </div>
              <Link href={dashboardHref} className="btn-ghost text-xs py-2 px-4 hidden sm:block">
                Dashboard
              </Link>
              <button onClick={disconnect}
                className="font-mono text-xs text-gv-danger border border-gv-danger/40
                           px-3 py-2 hover:bg-gv-danger/10 transition-all duration-200">
                Disconnect
              </button>
            </>
          ) : (
            <>
              <Link href="/researcher/login"
                className="hidden sm:block font-mono text-xs text-gv-cyan border border-gv-cyan/40
                           px-4 py-2 hover:bg-gv-cyan/10 transition-all duration-200 tracking-wider">
                RESEARCHER
              </Link>
              <button
                onClick={connect}
                disabled={connecting}
                className="btn-primary text-xs py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connecting ? "CONNECTING..." : "CONNECT WALLET"}
              </button>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-gv-green ml-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              {menuOpen
                ? <path d="M4 4l12 12M4 16L16 4" stroke="currentColor" strokeWidth="2" fill="none"/>
                : <path d="M2 5h16M2 10h16M2 15h16" stroke="currentColor" strokeWidth="2" fill="none"/>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden glass-card border-t border-gv-border px-4 py-4 space-y-3">
          <Link href="/#how-it-works" className="block font-mono text-xs text-gv-muted hover:text-gv-green py-2 tracking-wider">
            HOW IT WORKS
          </Link>
          <Link href="/researcher/signup" className="block font-mono text-xs text-gv-muted hover:text-gv-green py-2 tracking-wider">
            FOR RESEARCHERS
          </Link>
          {isAuthenticated() && (
            <Link href={dashboardHref} className="block font-mono text-xs text-gv-green py-2 tracking-wider">
              DASHBOARD
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
