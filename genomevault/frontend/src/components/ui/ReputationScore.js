export default function ReputationScore({ score = 0, completedStudies = 0, size = "md" }) {
  const color = score >= 80 ? "#00ff88" : score >= 50 ? "#ffaa00" : score > 0 ? "#ff6b6b" : "#4a7a4a";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : score > 0 ? "New" : "Unrated";

  const radius = size === "lg" ? 44 : 28;
  const stroke = size === "lg" ? 4  :  3;
  const dim    = radius * 2 + stroke * 2;
  const circ   = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-shrink-0" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
          {/* Background ring */}
          <circle cx={dim/2} cy={dim/2} r={radius}
            fill="none" stroke="rgba(74,122,74,0.2)" strokeWidth={stroke} />
          {/* Progress ring */}
          <circle cx={dim/2} cy={dim/2} r={radius}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${dim/2} ${dim/2})`}
            style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: "stroke-dashoffset 1s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-heading font-bold" style={{ color, fontSize: size === "lg" ? 20 : 13 }}>
            {score}
          </span>
        </div>
      </div>
      <div>
        <p className="font-mono text-xs" style={{ color }}>{label}</p>
        <p className="font-mono text-xs text-gv-muted">{completedStudies} studies</p>
      </div>
    </div>
  );
}
