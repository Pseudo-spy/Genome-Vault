import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Navbar from "../../components/layout/Navbar";
import useAuthStore from "../../context/authStore";
import api from "../../utils/api";
import toast from "react-hot-toast";

const TABS = ["Overview", "Researchers", "Datasets", "Suspicious"];

export default function AdminDashboard() {
  const router = useRouter();
  const { isAuthenticated, role } = useAuthStore();
  const [tab, setTab]           = useState("Overview");
  const [analytics, setAnalytics] = useState(null);
  const [researchers, setResearchers] = useState([]);
  const [resFilter, setResFilter]     = useState("pending");
  const [suspicious, setSuspicious]   = useState([]);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/"); return; }
if (role && role !== "admin") { router.replace("/"); return; }
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [a, r, s] = await Promise.all([
        api.get("/admin/analytics"),
        api.get(`/admin/researchers?status=${resFilter}`),
        api.get("/admin/suspicious")
      ]);
      setAnalytics(a.data);
      setResearchers(r.data);
      setSuspicious(s.data);
    } catch { toast.error("Failed to load admin data"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (tab === "Researchers") {
      api.get(`/admin/researchers?status=${resFilter}`)
        .then(r => setResearchers(r.data))
        .catch(() => {});
    }
  }, [resFilter, tab]);

  async function verifyResearcher(id, status) {
    try {
      await api.patch(`/admin/researchers/${id}/verify`, { status });
      toast.success(`Researcher ${status}`);
      fetchAll();
    } catch { toast.error("Failed"); }
  }

  return (
    <>
      <Head><title>Admin — GenomeVault</title></Head>
      <Navbar />
      <div className="min-h-screen grid-bg pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

          <div className="mb-8">
            <p className="font-mono text-xs text-gv-amber tracking-widest mb-1">ADMIN PANEL</p>
            <h1 className="font-heading text-3xl font-bold text-white">Platform Administration</h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gv-border mb-8">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`font-mono text-xs tracking-wider px-5 py-3 transition-all duration-200 border-b-2
                  ${tab === t ? "border-gv-amber text-gv-amber" : "border-transparent text-gv-muted hover:text-gv-text"}`}>
                {t.toUpperCase()}
                {t === "Researchers" && analytics?.researchers?.pending > 0 &&
                  <span className="ml-2 bg-gv-amber text-gv-black rounded-full text-xs px-1.5 py-0.5">
                    {analytics.researchers.pending}
                  </span>}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {tab === "Overview" && analytics && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { l: "Total Datasets",    v: analytics.datasets.total,              c: "#00ff88" },
                  { l: "Active Datasets",   v: analytics.datasets.active,             c: "#00ccff" },
                  { l: "Total Researchers", v: analytics.researchers.total,           c: "#ffcc00" },
                  { l: "Pending Verify",    v: analytics.researchers.pending,         c: "#ff8844" },
                  { l: "Verified",          v: analytics.researchers.verified,        c: "#00ff88" },
                  { l: "Access Requests",   v: analytics.access.totalRequests,        c: "#00ccff" },
                  { l: "Approved Access",   v: analytics.access.approvedRequests,     c: "#00ff88" },
                  { l: "New This Week",     v: analytics.datasets.recentUploads,      c: "#ffcc00" },
                ].map(s => (
                  <div key={s.l} className="glass-card p-4">
                    <p className="font-mono text-xs text-gv-muted tracking-wider mb-2">{s.l.toUpperCase()}</p>
                    <p className="font-heading text-3xl font-bold" style={{ color: s.c }}>{s.v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── RESEARCHERS ── */}
          {tab === "Researchers" && (
            <div>
              <div className="flex gap-2 mb-6 flex-wrap">
                {["pending","verified","rejected"].map(s => (
                  <button key={s} onClick={() => setResFilter(s)}
                    className={`font-mono text-xs px-4 py-2 border transition-all duration-200
                      ${resFilter === s ? "border-gv-green text-gv-green bg-gv-green/10" : "border-gv-border text-gv-muted hover:border-gv-green/40"}`}>
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {researchers.length === 0 ? (
                  <div className="glass-card p-12 text-center">
                    <p className="font-mono text-sm text-gv-muted">No {resFilter} researchers.</p>
                  </div>
                ) : researchers.map(r => (
                  <div key={r._id} className="glass-card p-5">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="font-heading text-base font-bold text-white">{r.fullName}</h3>
                          <span className={
                            r.status === "verified" ? "badge-verified" :
                            r.status === "rejected" ? "badge-rejected" : "badge-pending"
                          }>{r.status}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { l:"Email",       v: r.email },
                            { l:"Institution", v: r.institution },
                            { l:"Field",       v: r.researchField },
                            { l:"Applied",     v: new Date(r.createdAt).toLocaleDateString() },
                          ].map(i => (
                            <div key={i.l}>
                              <p className="font-mono text-xs text-gv-muted">{i.l}</p>
                              <p className="font-mono text-xs text-gv-text mt-0.5 break-all">{i.v}</p>
                            </div>
                          ))}
                        </div>
                        {r.institutionalIdCID && (
                          <a href={`${process.env.NEXT_PUBLIC_IPFS_GATEWAY}/${r.institutionalIdCID}`}
                             target="_blank" rel="noopener noreferrer"
                             className="inline-block mt-3 font-mono text-xs text-gv-cyan hover:underline">
                            View Institutional ID →
                          </a>
                        )}
                      </div>
                      {r.status === "pending" && (
                        <div className="flex gap-3 flex-shrink-0">
                          <button onClick={() => verifyResearcher(r._id, "verified")}
                            className="btn-primary text-xs py-2 px-4">VERIFY</button>
                          <button onClick={() => verifyResearcher(r._id, "rejected")}
                            className="font-mono text-xs text-gv-danger border border-gv-danger/40 px-4 py-2
                                       hover:bg-gv-danger/10 transition-all duration-200">REJECT</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SUSPICIOUS ── */}
          {tab === "Suspicious" && (
            <div>
              <p className="font-mono text-xs text-gv-muted mb-4">
                Researchers with more than 20 access requests in the last 24 hours.
              </p>
              {suspicious.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-gv-green animate-pulse" />
                    <p className="font-mono text-sm text-gv-green">No suspicious activity detected.</p>
                  </div>
                </div>
              ) : suspicious.map(s => (
                <div key={s._id} className="glass-card p-5 border-gv-danger/30 mb-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-mono text-sm text-gv-danger font-bold">
                        {s.researcher?.[0]?.fullName || s._id}
                      </p>
                      <p className="font-mono text-xs text-gv-muted">{s.researcher?.[0]?.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-heading text-2xl font-bold text-gv-danger">{s.count}</p>
                      <p className="font-mono text-xs text-gv-muted">requests in 24h</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
