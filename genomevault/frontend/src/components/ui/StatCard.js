import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export default function StatCard({ label, value, sub, color = "#00ff88", onClick }) {
  const valRef = useRef(null);

  useEffect(() => {
    if (valRef.current) {
      gsap.fromTo(valRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
    }
  }, [value]);

  return (
    <div
      onClick={onClick}
      className={`glass-card border-glow p-5 transition-all duration-300 ${onClick ? "cursor-pointer hover:border-gv-green/50" : ""}`}>
      <p className="font-mono text-xs text-gv-muted uppercase tracking-widest mb-2">{label}</p>
      <p ref={valRef} className="font-heading text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="font-mono text-xs text-gv-muted mt-1">{sub}</p>}
    </div>
  );
}
