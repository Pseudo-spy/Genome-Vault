import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export default function LoadingScreen({ message = "Initializing GenomeVault…" }) {
  const dotsRef = useRef([]);

  useEffect(() => {
    const tl = gsap.timeline({ repeat: -1 });
    dotsRef.current.forEach((dot, i) => {
      tl.to(dot, { opacity: 1, scale: 1.2, duration: 0.3, ease: "power2.out" }, i * 0.15)
        .to(dot, { opacity: 0.2, scale: 1, duration: 0.3 }, i * 0.15 + 0.3);
    });
    return () => tl.kill();
  }, []);

  return (
    <div className="fixed inset-0 bg-gv-black grid-bg flex flex-col items-center justify-center z-50">
      {/* DNA strand animation */}
      <div className="relative w-16 h-16 mb-8">
        {[...Array(6)].map((_, i) => (
          <div key={i}
            ref={el => dotsRef.current[i] = el}
            className="absolute w-3 h-3 rounded-full bg-gv-green opacity-20"
            style={{
              left: i % 2 === 0 ? "0%" : "75%",
              top: `${i * 16}%`,
              boxShadow: "0 0 8px rgba(0,255,136,0.6)"
            }} />
        ))}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gv-green/20" />
      </div>

      <p className="font-heading text-gv-green text-xl tracking-widest mb-2 neon-text">GENOMEVAULT</p>
      <p className="font-mono text-xs text-gv-muted animate-pulse">{message}</p>
    </div>
  );
}
