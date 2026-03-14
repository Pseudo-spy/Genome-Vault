import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import api from "../../utils/api";
import toast from "react-hot-toast";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gv-panel border border-gv-green/30 p-3 font-mono text-xs">
      <p className="text-gv-muted mb-1">{label}</p>
      <p className="text-gv-green">{payload[0]?.value?.toFixed(2)} MATIC</p>
    </div>
  );
};

export default function EarningsDashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/earnings")
      .then(r => setData(r.data))
      .catch(() => toast.error("Failed to load earnings"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="glass-card p-10 text-center">
      <div className="w-6 h-6 border-2 border-gv-green border-t-transparent animate-spin mx-auto mb-3" />
      <p className="font-mono text-gv-muted text-sm">Loading earnings…</p>
    </div>
  );

  if (!data) return null;

  const monthlyChartData = Object.entries(data.monthly || {})
    .map(([k, v]) => ({ month: k, earnings: parseFloat(v.toFixed(4)) }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  const statCards = [
    { label: "Total earnings",   value: `${data.totalEarnings?.toFixed(4) || "0.0000"} MATIC`, color: "#00ff88" },
    { label: "Total accesses",   value: data.totalAccesses || 0,                               color: "#00ffcc" },
    { label: "Active datasets",  value: data.datasets?.filter(d => d.isActive !== false).length || 0, color: "#a78bfa" },
    { label: "Avg per access",   value: data.totalAccesses > 0
        ? `${(data.totalEarnings / data.totalAccesses).toFixed(4)} MATIC` : "—",               color: "#ffaa00" },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="glass-card p-5 border-glow">
            <p className="font-mono text-xs text-gv-muted uppercase tracking-wider mb-2">{s.label}</p>
            <p className="font-heading text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly earnings chart */}
      {monthlyChartData.length > 0 && (
        <div className="glass-card p-5 border-glow">
          <p className="font-mono text-xs text-gv-muted uppercase tracking-wider mb-4">Monthly Earnings (MATIC)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,136,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#4a7a4a", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a7a4a", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="earnings" fill="#00ff88" radius={[2,2,0,0]}
                style={{ filter: "drop-shadow(0 0 4px rgba(0,255,136,0.4))" }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-dataset earnings */}
      {data.datasets?.length > 0 && (
        <div className="glass-card p-5 border-glow">
          <p className="font-mono text-xs text-gv-muted uppercase tracking-wider mb-4">Dataset Performance</p>
          <div className="space-y-3">
            {data.datasets.map(d => {
              const earned = (d.price || 0) * (d.accessCount || 0) * 0.95;
              const maxEarned = Math.max(...data.datasets.map(x => (x.price||0)*(x.accessCount||0)*0.95), 1);
              return (
                <div key={d._id} className="space-y-1">
                  <div className="flex justify-between font-mono text-xs">
                    <span className="text-gv-text truncate max-w-xs">{d.fileName || d._id}</span>
                    <span className="text-gv-green ml-4 flex-shrink-0">{earned.toFixed(4)} MATIC</span>
                  </div>
                  <div className="h-1 bg-gv-panel border border-gv-border overflow-hidden">
                    <div className="h-full bg-gv-green/70 transition-all duration-700"
                      style={{ width: `${(earned / maxEarned) * 100}%` }} />
                  </div>
                  <p className="text-gv-muted text-xs font-mono">{d.accessCount || 0} accesses · {d.price || 0} MATIC each</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent access history */}
      {data.recentAccesses?.length > 0 && (
        <div className="glass-card p-5 border-glow">
          <p className="font-mono text-xs text-gv-muted uppercase tracking-wider mb-4">Recent Access Revenue</p>
          <div className="space-y-2">
            {data.recentAccesses.map(r => (
              <div key={r._id} className="flex items-center justify-between py-2.5 border-b border-gv-border/50 last:border-0">
                <div>
                  <p className="font-mono text-sm text-gv-text">
                    {r.researcher?.fullName || "Researcher"}
                  </p>
                  <p className="font-mono text-xs text-gv-muted">
                    {r.researcher?.institution} · {r.dataset?.fileName}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="font-heading text-lg text-gv-green font-bold">
                    +{((r.dataset?.price || 0) * 0.95).toFixed(4)}
                  </p>
                  <p className="font-mono text-xs text-gv-muted">
                    {r.approvedAt ? new Date(r.approvedAt).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdraw button */}
      <div className="glass-card p-5 border-glow flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-gv-muted uppercase tracking-wider">Available to withdraw</p>
          <p className="font-heading text-3xl font-bold text-gv-green">{data.totalEarnings?.toFixed(4) || "0"} MATIC</p>
          <p className="font-mono text-xs text-gv-muted mt-1">Platform commission: 5%</p>
        </div>
        <button
          onClick={() => toast("Connect wallet and call PaymentContract.withdraw()", { icon: "ℹ️" })}
          className="btn-primary text-sm py-3 px-6 flex-shrink-0">
          Withdraw →
        </button>
      </div>
    </div>
  );
}
