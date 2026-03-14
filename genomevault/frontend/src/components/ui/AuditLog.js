import { useState, useEffect } from "react";
import api from "../../utils/api";
import toast from "react-hot-toast";

const ACTION_COLORS = {
  uploadGenome:  "#00ff88",
  requestAccess: "#00ffcc",
  approveAccess: "#a78bfa",
  revokeAccess:  "#ffaa00",
  rejectAccess:  "#ff4444",
  downloadData:  "#60a5fa",
};

export default function AuditLog() {
  const [logs, setLogs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");

  useEffect(() => {
    api.get("/access/audit-log")
      .then(r => setLogs(r.data))
      .catch(() => toast.error("Failed to load audit log"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? logs : logs.filter(l => l.status === filter || l.actionType === filter);

  if (loading) return (
    <div className="glass-card p-8 text-center">
      <div className="w-6 h-6 border-2 border-gv-green border-t-transparent animate-spin mx-auto mb-3" />
      <p className="font-mono text-gv-muted text-sm">Loading audit trail…</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all","pending","approved","rejected","revoked"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 font-mono text-xs uppercase tracking-wider border transition-all
              ${filter === f ? "border-gv-green text-gv-green" : "border-gv-border text-gv-muted hover:border-gv-green/40"}`}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="font-mono text-gv-muted">No audit records found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log, i) => {
            const actionColor = ACTION_COLORS[log.status] || "#4a7a4a";
            const ts = log.createdAt || log.approvedAt || log.updatedAt;
            return (
              <div key={log._id || i}
                className="glass-card p-4 flex items-center gap-4 hover:border-gv-green/20 transition-all duration-200 flex-wrap">

                {/* Action indicator */}
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: actionColor, boxShadow: `0 0 6px ${actionColor}` }} />

                {/* Action type */}
                <span className="font-mono text-xs uppercase tracking-wider flex-shrink-0"
                  style={{ color: actionColor }}>
                  {log.status || "access"}
                </span>

                {/* Researcher */}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-gv-text truncate">
                    {log.researcher?.fullName || "Unknown researcher"}
                  </p>
                  <p className="font-mono text-xs text-gv-muted truncate">
                    {log.researcher?.institution} · {log.dataset?.fileName}
                  </p>
                </div>

                {/* Sig hash */}
                {log.signatureHash && (
                  <p className="font-mono text-xs text-gv-muted/40 hidden lg:block flex-shrink-0 max-w-32 truncate">
                    {log.signatureHash.slice(0, 16)}…
                  </p>
                )}

                {/* Timestamp */}
                {ts && (
                  <p className="font-mono text-xs text-gv-muted flex-shrink-0">
                    {new Date(ts).toLocaleString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
