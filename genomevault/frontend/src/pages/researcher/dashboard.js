import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Navbar from "../../components/layout/Navbar";
import SignatureModal from "../../components/modals/SignatureModal";
import useAuthStore from "../../context/authStore";
import api from "../../utils/api";
import toast from "react-hot-toast";

const TABS = ["Marketplace", "My Requests", "Active Studies"];

const SEQ_TYPES = ["All","VCF","FASTQ","BAM","WGS","WES","SNP-array"];

export default function ResearcherDashboard() {
  const router = useRouter();
  const { isAuthenticated, role, address, user } = useAuthStore();
  const [tab, setTab]         = useState("Marketplace");
  const [datasets, setDatasets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [filters, setFilters]   = useState({ sequencingType: "All", ancestry: "", region: "" });
  const [loading, setLoading]   = useState(false);
  const [sigModal, setSigModal] = useState({ open: false, dataset: null });
  const [reqForm, setReqForm]   = useState({ objective: "", funding: "", duration: 30 });

  useEffect(() => {
    if (!isAuthenticated() || role !== "researcher") { router.replace("/researcher/login"); return; }
    fetchMarketplace();
    fetchRequests();
  }, []);

  async function fetchMarketplace() {
    setLoading(true);
    try {
      const params = {};
      if (filters.sequencingType !== "All") params.sequencingType = filters.sequencingType;
      if (filters.ancestry)  params.ancestry = filters.ancestry;
      if (filters.region)    params.region    = filters.region;
      const { data } = await api.get("/datasets/marketplace", { params });
      setDatasets(data.datasets || []);
    } catch { toast.error("Failed to load marketplace"); }
    finally { setLoading(false); }
  }

  async function fetchRequests() {
    try {
      const { data } = await api.get("/access/my-requests");
      setRequests(data);
    } catch {}
  }

  useEffect(() => { fetchMarketplace(); }, [filters]);

  function buildRequestMessage(dataset) {
    return `Research Data Access Request\n\nResearcher Wallet: ${address}\nDataset ID: ${dataset._id}\nResearch Purpose: ${reqForm.objective}\nTimestamp: ${Date.now()}\n\nI confirm this data will only be used for approved research purposes.`;
  }

  async function handleRequestSigned(sig) {
    const ds = sigModal.dataset;
    setSigModal({ open: false, dataset: null });
    try {
      await api.post("/access/request", {
        datasetId:          ds._id,
        researchObjective:  reqForm.objective,
        fundingSource:      reqForm.funding,
        durationDays:       reqForm.duration,
        signatureHash:      sig,
      });
      toast.success("Access request submitted! Awaiting data owner approval.");
      setReqForm({ objective: "", funding: "", duration: 30 });
      fetchRequests();
      setTab("My Requests");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Request failed");
    }
  }

  function StatusBadge({ s }) {
    const map = {
      pending:  "badge-pending",
      approved: "badge-approved",
      rejected: "badge-rejected",
      revoked:  "badge-rejected",
    };
    return <span className={map[s] || "font-mono text-xs text-gv-muted"}>{s?.toUpperCase()}</span>;
  }

  return (
    <>
      <Head><title>Researcher Dashboard — GenomeVault</title></Head>
      <Navbar />
      <div className="min-h-screen grid-bg pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

          {/* Header */}
          <div className="mb-8">
            <p className="font-mono text-xs text-gv-cyan tracking-widest mb-1">RESEARCHER</p>
            <h1 className="font-heading text-3xl font-bold text-white">{user?.fullName || "Researcher"}</h1>
            <p className="font-mono text-xs text-gv-muted">{user?.institution} · {user?.researchField}</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gv-border mb-8">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`font-mono text-xs tracking-wider px-5 py-3 transition-all duration-200 border-b-2
                  ${tab === t ? "border-gv-cyan text-gv-cyan" : "border-transparent text-gv-muted hover:text-gv-text"}`}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {/* ── MARKETPLACE ── */}
          {tab === "Marketplace" && (
            <div>
              {/* Filters */}
              <div className="glass-card p-4 mb-6 flex flex-wrap gap-4 items-end">
                <div>
                  <label className="font-mono text-xs text-gv-muted block mb-1">Sequencing Type</label>
                  <select className="gv-input w-36"
                    value={filters.sequencingType}
                    onChange={e => setFilters(p => ({...p, sequencingType: e.target.value}))}>
                    {SEQ_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-mono text-xs text-gv-muted block mb-1">Ancestry</label>
                  <input className="gv-input w-36" placeholder="e.g. South Asian"
                    value={filters.ancestry} onChange={e => setFilters(p => ({...p, ancestry: e.target.value}))} />
                </div>
                <div>
                  <label className="font-mono text-xs text-gv-muted block mb-1">Region</label>
                  <input className="gv-input w-36" placeholder="e.g. India"
                    value={filters.region} onChange={e => setFilters(p => ({...p, region: e.target.value}))} />
                </div>
                <button onClick={fetchMarketplace} className="btn-ghost text-xs py-2 px-4">FILTER</button>
              </div>

              {loading ? (
                <div className="text-center py-16">
                  <div className="inline-block w-8 h-8 border-2 border-gv-green border-t-transparent rounded-full animate-spin" />
                </div>
              ) : datasets.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <p className="font-mono text-sm text-gv-muted">No datasets found matching your filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {datasets.map(ds => (
                    <div key={ds._id}
                      className="glass-card p-5 hover:border-gv-green/40 transition-all duration-200
                                 group cursor-pointer"
                      onMouseEnter={e => { const el = e.currentTarget; import("gsap").then(({gsap}) => gsap.to(el, {y:-4,duration:0.25})); }}
                      onMouseLeave={e => { const el = e.currentTarget; import("gsap").then(({gsap}) => gsap.to(el, {y:0, duration:0.25})); }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="font-mono text-xs border border-gv-border px-2 py-0.5 text-gv-muted">
                          {ds.metadata?.sequencingType || "GENOMIC"}
                        </span>
                        <span className="font-heading text-lg font-bold text-gv-green">
                          {ds.price || 0} MATIC
                        </span>
                      </div>
                      <h3 className="font-heading text-base font-bold text-white mb-2 truncate">
                        {ds.fileName || "Genomic Dataset"}
                      </h3>
                      <div className="space-y-1 mb-4">
                        {[
                          { l: "Ancestry", v: ds.metadata?.ancestry || "—" },
                          { l: "Region",   v: ds.metadata?.populationRegion || "—" },
                          { l: "SNPs",     v: ds.metadata?.snpCount?.toLocaleString() || "—" },
                          { l: "Coverage", v: ds.metadata?.coverage ? ds.metadata.coverage + "×" : "—" },
                        ].map(i => (
                          <div key={i.l} className="flex justify-between">
                            <span className="font-mono text-xs text-gv-muted">{i.l}</span>
                            <span className="font-mono text-xs text-gv-text">{i.v}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setSigModal({ open: true, dataset: ds })}
                        className="w-full btn-primary text-xs py-2"
                      >
                        REQUEST ACCESS
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── MY REQUESTS ── */}
          {tab === "My Requests" && (
            <div className="space-y-4">
              {requests.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <p className="font-mono text-sm text-gv-muted">No requests submitted yet.</p>
                </div>
              ) : requests.map(r => (
                <div key={r._id} className="glass-card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="font-heading text-base font-bold text-white">
                          {r.dataset?.fileName || "Dataset"}
                        </span>
                        <StatusBadge s={r.status} />
                      </div>
                      <p className="font-mono text-xs text-gv-muted mb-1">Research objective:</p>
                      <p className="font-mono text-xs text-gv-text leading-relaxed">{r.researchObjective}</p>
                      <div className="flex gap-6 mt-3">
                        <div>
                          <p className="font-mono text-xs text-gv-muted">Duration</p>
                          <p className="font-mono text-xs text-gv-text">{r.durationDays} days</p>
                        </div>
                        <div>
                          <p className="font-mono text-xs text-gv-muted">Submitted</p>
                          <p className="font-mono text-xs text-gv-text">{new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                        {r.approvedAt && (
                          <div>
                            <p className="font-mono text-xs text-gv-muted">Approved</p>
                            <p className="font-mono text-xs text-gv-green">{new Date(r.approvedAt).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ACTIVE STUDIES ── */}
          {tab === "Active Studies" && (
            <div className="space-y-4">
              {requests.filter(r => r.status === "approved").length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <p className="font-mono text-sm text-gv-muted">No active studies. Browse the marketplace to request access.</p>
                </div>
              ) : requests.filter(r => r.status === "approved").map(r => (
                <div key={r._id} className="glass-card p-5 border-gv-green/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-2 h-2 rounded-full bg-gv-green animate-pulse" />
                    <span className="font-heading text-base font-bold text-white">{r.dataset?.fileName}</span>
                    <span className="badge-approved">ACTIVE</span>
                  </div>
                  <p className="font-mono text-xs text-gv-muted mb-3">{r.researchObjective}</p>
                  <button
                    onClick={async () => {
                      try {
                        const { signMessage } = await import("../../hooks/useWallet").then(m => {
                          const hook = m.useWallet ? m.useWallet() : null;
                          return hook || { signMessage: async () => "0x" };
                        });
                        const msg = `Download Authorization\n\nResearcher: ${address}\nDataset ID: ${r.dataset?._id}\nTimestamp: ${Date.now()}\n\nI authorize this download for approved research.`;
                        toast("Please sign the download authorization in MetaMask");
                        const { data } = await api.post(`/access/${r._id}/download`, { signatureHash: "download-sig" });
                        toast.success(`IPFS CID: ${data.ipfsCID}`);
                      } catch (e) {
                        toast.error(e?.response?.data?.error || "Download failed");
                      }
                    }}
                    className="btn-primary text-xs py-2 px-4"
                  >
                    DOWNLOAD DATASET
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Request modal */}
      {sigModal.open && sigModal.dataset && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4"
             style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
             onClick={e => e.target === e.currentTarget && setSigModal({ open: false, dataset: null })}>
          <div className="glass-card border-glow w-full max-w-lg">
            <div className="border-b border-gv-border px-6 py-4 flex justify-between">
              <span className="font-heading text-lg font-bold text-gv-green">Request Dataset Access</span>
              <button onClick={() => setSigModal({ open: false, dataset: null })} className="text-gv-muted hover:text-gv-green">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="p-3 bg-gv-dark border border-gv-border">
                <p className="font-mono text-xs text-gv-muted">Dataset: <span className="text-gv-text">{sigModal.dataset.fileName}</span></p>
                <p className="font-mono text-xs text-gv-muted">Price: <span className="text-gv-green">{sigModal.dataset.price} MATIC</span></p>
              </div>
              <div>
                <label className="font-mono text-xs text-gv-muted block mb-1.5">Research Objective *</label>
                <textarea className="gv-input h-20 resize-none" placeholder="Describe your research purpose..."
                  value={reqForm.objective} onChange={e => setReqForm(p => ({...p, objective: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-xs text-gv-muted block mb-1.5">Funding Source</label>
                  <input className="gv-input" placeholder="e.g. DST Grant"
                    value={reqForm.funding} onChange={e => setReqForm(p => ({...p, funding: e.target.value}))} />
                </div>
                <div>
                  <label className="font-mono text-xs text-gv-muted block mb-1.5">Duration (days)</label>
                  <input type="number" min="1" max="365" className="gv-input"
                    value={reqForm.duration} onChange={e => setReqForm(p => ({...p, duration: +e.target.value}))} />
                </div>
              </div>
            </div>
            <div className="border-t border-gv-border px-6 py-4 flex gap-3">
              <button onClick={() => setSigModal({ open: false, dataset: null })} className="flex-1 btn-ghost text-sm py-2.5">
                CANCEL
              </button>
              <button
                disabled={!reqForm.objective}
                onClick={() => {
                  setSigModal(p => ({ ...p, open: false }));
                  setTimeout(() => {
                    document.dispatchEvent(new CustomEvent("openSignModal"));
                  }, 100);
                  // Use SignatureModal flow
                  setSigModal(p => ({ ...p, open: true, readyToSign: true }));
                }}
                className="flex-1 btn-primary text-sm py-2.5 disabled:opacity-40"
              >
                SIGN REQUEST
              </button>
            </div>
          </div>
        </div>
      )}

      <SignatureModal
        isOpen={!!(sigModal.open && sigModal.dataset && sigModal.readyToSign)}
        onClose={() => setSigModal({ open: false, dataset: null })}
        onSigned={handleRequestSigned}
        title="Sign Research Access Request"
        message={sigModal.dataset ? buildRequestMessage(sigModal.dataset) : ""}
        details={sigModal.dataset ? [
          { label: "Dataset", value: sigModal.dataset.fileName },
          { label: "Purpose", value: reqForm.objective.slice(0,60) + (reqForm.objective.length > 60 ? "..." : "") },
          { label: "Duration", value: reqForm.duration + " days" },
        ] : []}
      />
    </>
  );

  function buildRequestMessage(dataset) {
    return `Research Data Access Request\n\nResearcher Wallet: ${address}\nDataset ID: ${dataset._id}\nResearch Purpose: ${reqForm.objective}\nTimestamp: ${Date.now()}\n\nI confirm this data will only be used for approved research purposes.`;
  }
}
