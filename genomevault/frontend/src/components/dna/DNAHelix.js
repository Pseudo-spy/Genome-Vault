import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export default function DNAHelix({ height = 500 }) {
  const svgRef = useRef(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Animate backbone strands
    const strands = svg.querySelectorAll(".dna-strand");
    const bases   = svg.querySelectorAll(".dna-base");
    const labels  = svg.querySelectorAll(".base-label");

    // Entrance animation
    gsap.fromTo(strands,
      { strokeDashoffset: 1000, opacity: 0 },
      { strokeDashoffset: 0, opacity: 1, duration: 2, stagger: 0.2, ease: "power2.out" }
    );
    gsap.fromTo(bases,
      { scale: 0, opacity: 0, transformOrigin: "center center" },
      { scale: 1, opacity: 1, duration: 0.3, stagger: 0.05, delay: 0.8, ease: "back.out(1.7)" }
    );
    gsap.fromTo(labels,
      { opacity: 0 },
      { opacity: 0.7, duration: 0.5, stagger: 0.04, delay: 1.2 }
    );

    // Continuous rotation / float
    gsap.to(svg, { y: -12, duration: 3, repeat: -1, yoyo: true, ease: "sine.inOut" });

    // Pulse individual base pairs
    gsap.to(bases, {
      opacity: 0.3, duration: 1, stagger: { each: 0.15, repeat: -1, yoyo: true }, ease: "sine.inOut"
    });

    // Glow pulse on strands
    gsap.to(strands, {
      filter: "drop-shadow(0 0 6px rgba(0,255,136,0.8))",
      duration: 1.5, repeat: -1, yoyo: true, ease: "sine.inOut"
    });

    return () => gsap.killTweensOf([svg, strands, bases, labels]);
  }, []);

  // Generate double helix SVG points
  const totalBases = 18;
  const w = 180, cx = 90;
  const baseSpacing = height / (totalBases + 1);
  const amplitude   = 55;

  const bases = Array.from({ length: totalBases }, (_, i) => {
    const y    = (i + 1) * baseSpacing;
    const phase = (i / totalBases) * Math.PI * 4; // two full rotations
    const x1   = cx + Math.sin(phase) * amplitude;
    const x2   = cx - Math.sin(phase) * amplitude;
    const depth = Math.cos(phase); // -1 to 1
    const BASES = ["A","T","G","C"];
    const complementMap = { A:"T", T:"A", G:"C", C:"G" };
    const b1  = BASES[i % 4];
    const b2  = complementMap[b1];
    const colorMap = { A:"#00ff88", T:"#00ccff", G:"#ff88aa", C:"#ffcc00" };
    return { y, x1, x2, depth, b1, b2, c1: colorMap[b1], c2: colorMap[b2] };
  });

  // Build smooth path for each strand
  const strand1Points = bases.map(b => `${b.x1},${b.y}`).join(" ");
  const strand2Points = bases.map(b => `${b.x2},${b.y}`).join(" ");

  return (
    <svg
      ref={svgRef}
      width={w}
      height={height}
      viewBox={`0 0 ${w} ${height}`}
      style={{ overflow: "visible" }}
      aria-label="Animated DNA helix"
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Backbone strands */}
      <polyline
        className="dna-strand"
        points={strand1Points}
        fill="none"
        stroke="#00ff88"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1000"
        filter="url(#glow)"
        opacity="0.9"
      />
      <polyline
        className="dna-strand"
        points={strand2Points}
        fill="none"
        stroke="#00ccff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1000"
        filter="url(#glow)"
        opacity="0.9"
      />

      {/* Base pairs + labels */}
      {bases.map((b, i) => {
        const inFront = b.depth > 0;
        return (
          <g key={i}>
            {/* Cross-bridge line */}
            <line
              x1={b.x1} y1={b.y} x2={b.x2} y2={b.y}
              stroke={inFront ? "rgba(0,255,136,0.5)" : "rgba(0,255,136,0.12)"}
              strokeWidth={inFront ? "1.5" : "0.8"}
              strokeDasharray={inFront ? "none" : "3 2"}
            />
            {/* Base pair circles */}
            <circle
              className="dna-base"
              cx={b.x1} cy={b.y} r={inFront ? 5 : 3}
              fill={b.c1}
              opacity={inFront ? 0.95 : 0.4}
              filter={inFront ? "url(#glow)" : "none"}
            />
            <circle
              className="dna-base"
              cx={b.x2} cy={b.y} r={inFront ? 5 : 3}
              fill={b.c2}
              opacity={inFront ? 0.95 : 0.4}
              filter={inFront ? "url(#glow)" : "none"}
            />
            {/* Base labels */}
            {inFront && (
              <>
                <text
                  className="base-label"
                  x={b.x1 + (b.x1 > cx ? 9 : -9)}
                  y={b.y + 4}
                  textAnchor={b.x1 > cx ? "start" : "end"}
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                  fill={b.c1}
                  opacity="0"
                >
                  {b.b1}
                </text>
                <text
                  className="base-label"
                  x={b.x2 + (b.x2 > cx ? 9 : -9)}
                  y={b.y + 4}
                  textAnchor={b.x2 > cx ? "start" : "end"}
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                  fill={b.c2}
                  opacity="0"
                >
                  {b.b2}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
