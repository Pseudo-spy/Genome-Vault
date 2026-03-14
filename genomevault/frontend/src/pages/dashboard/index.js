import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useDropzone } from "react-dropzone";
import { gsap } from "gsap";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Navbar from "../../components/layout/Navbar";
import SignatureModal from "../../components/modals/SignatureModal";
import useAuthStore from "../../context/authStore";
import api from "../../utils/api";
import toast from "react-hot-toast";
import crypto from "crypto";

const TABS = ["Overview", "My Datasets", "Upload", "Access Requests", "Earnings", "Audit Log"];

export default function Dashboard() {
  const router  = useRouter();
  const { isAuthenticated, role, address } = useAuthStore();
  const [tab, setTab]         = useState("Overview");
  const [datasets, setDatasets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading]   = useState(false);

  // Upload state
  const [uploadFile, setUploadFile]     = useState(null);
  const [uploadPrice, setUploadPrice]   = useState("");
  const [uploadMeta, setUploadMeta]     = useState({ ancestry: "", sequencingType: "VCF", populationRegion: "", description: "" });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading]       = useState(false);
  const [sigModal, setSigModal]         = useState({ open: false, action: null, data: null });

  const progressBarRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated()) {
  router.replace("/");
  return;
}
if (role === "admin") {
  router.replace("/admin/dashboard");
  return;
}
if (role === "researcher") {
  router.replace("/researcher/dashboard");
  return;
}
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [ds, rq, ea, al] = await Promise.all([
        api.get("/datasets/my"),
        api.get("/access/pending"),
        api.get("/earnings"),
        api.get("/access/audit-log")
      ]);
      setDatasets(ds.data);
      setRequests(rq.data);
      setEarnings(ea.data);
      setAuditLog(al.data);
    } catch (e) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  // Dropzone
  const onDrop = useCallback(accepted => {
    if (accepted[0]) setUploadFile(accepted[0]);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/octet-stream": [".vcf",".fastq",".bam",".fasta",".gz"] },
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024
  });

  // Animate progress bar when uploading
  useEffect(() => {
    if (!progressBarRef.current) return;
    gsap.to(progressBarRef.current, { width: `${uploadProgress}%`, duration: 0.5, ease: "power1.out" });
  }, [uploadProgress]);

  function buildUploadMessage(fileHash) {
    return `Genome Upload Authorization\n\nWallet Address: ${address}\nDataset Hash: ${fileHash}\nTimestamp: ${Date.now()}\n\nI authorize the upload of this genomic dataset to the GenomeVault platform.`;
  }

async function handleUploadClick() {
  if (!uploadFile) return toast.error("Please select a file first");
  if (!address)    return toast.error("Connect your wallet first");

  const fileHash = Date.now().toString(16) + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
  const msg = buildUploadMessage(fileHash);
  setSigModal({ open: true, action: "upload", data: { fileHash, msg } });
}

  async function handleUploadSigned(signature) {
    setSigModal({ open: false, action: null, data: null });
    setUploading(true);
    setUploadProgress(5);

    const formData = new FormData();
    formData.append("genomeFile", uploadFile);
    formData.append("price", uploadPrice || "0");
    formData.append("signatureHash", signature);
    formData.append("metadata", JSON.stringify(uploadMeta));

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 8, 85));
      }, 600);

      await api.post("/datasets/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: e => setUploadProgress(Math.round((e.loaded / e.total) * 70))
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      toast.success("Dataset uploaded and registered on blockchain!");
      setUploadFile(null);
      setTab("My Datasets");
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  }

  async function handleApprove(requestId) {
    setSigModal({
      open: true, action: "approve", data: { requestId },
    });
  }

  async function handleApproveSigned(signature) {
    const { requestId } = sigModal.data;
    setSigModal({ open: false, action: null, data: null });
    try {
      await api.post(`/access/${requestId}/approve`, { signatureHash: signature });
      toast.success("Access approved");
      fetchAll();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Approval failed");
    }
  }

  async function handleReject(id) {
    try {
      await api.post(`/access/${id}/reject`);
      toast.success("Request rejected");
      fetchAll();
    } catch { toast.error("Failed"); }
  }

  async function handleRevoke(id) {
    try {
      await api.post(`/access/${id}/revoke`);
      toast.success("Access revoked");
      fetchAll();
    } catch { toast.error("Failed"); }
  }

  function onSigned(sig) {
    if (sigModal.action === "upload")  handleUploadSigned(sig);
    if (sigModal.action === "approve") handleApproveSigned(sig);
  }

  const statusBadge = s => ({
    pending:  <span className="badge-pending">{s}</span>,
    approved: <span className="badge-approved">{s}</span>,
    rejected: <span className="badge-rejected">{s}</span>,
    revoked:  <span className="badge-rejected">{s}</span>,
  }[s] || <span className="font-mono text-xs text-gv-muted">{s}</span>);

  return (
    <>
      <Head><title>Dashboard — GenomeVault</title></Head>
      <Navbar />

      <div className="min-h-screen grid-bg pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-gv-green tracking-widest mb-1">DATA OWNER</p>
              <h1 className="font-heading text-3xl font-bold text-white">My Dashboard</h1>
              <p className="font-mono text-xs text-gv-muted mt-1">{address}</p>
            </div>
            <button onClick={fetchAll} className="btn-ghost text-xs py-2 px-4 self-start">
              REFRESH
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gv-border mb-8 overflow-x-auto">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`font-mono text-xs tracking-wider px-4 py-3 whitespace-nowrap transition-all duration-200 border-b-2
                  ${tab === t
                    ? "border-gv-green text-gv-green"
                    : "border-transparent text-gv-muted hover:text-gv-text"}`}>
                {t.toUpperCase()}
                {t === "Access Requests" && requests.length > 0 &&
                  <span className="ml-2 bg-gv-green text-gv-black rounded-full text-xs px-1.5 py-0.5">
                    {requests.length}
                  </span>}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {tab === "Overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Datasets",      value: datasets.length, color: "#00ff88" },
                  { label: "Total Accesses",value: earnings?.totalAccesses || 0, color: "#00ccff" },
                  { label: "Pending Requests",value: requests.length, color: "#ffaa00" },
                  { label: "Earnings (MATIC)",value: (earnings?.totalEarnings || 0).toFixed(4), color: "#ff88aa" },
                ].map(s => (
                  <div key={s.label} className="glass-card p-5">
                    <p className="font-mono text-xs text-gv-muted tracking-wider mb-2">{s.label.toUpperCase()}</p>
                    <p className="font-heading text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Earnings chart */}
              {earnings?.monthly && (
                <div className="glass-card p-6">
                  <p className="font-mono text-xs text-gv-green tracking-wider mb-4">MONTHLY EARNINGS (MATIC)</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={Object.entries(earnings.monthly).map(([k,v]) => ({ month: k, value: +v.toFixed(4) }))}>
                      <defs>
                        <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#00ff88" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fill: "#4a7a4a", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#4a7a4a", fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ background: "#0f1f0f", border: "1px solid #1a3a1a", fontFamily: "JetBrains Mono", fontSize: 11 }}
                        labelStyle={{ color: "#00ff88" }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#00ff88" fill="url(#earnGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ── MY DATASETS ── */}
          {tab === "My Datasets" && (
            <div className="space-y-4">
              {datasets.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <p className="font-mono text-sm text-gv-muted">No datasets uploaded yet.</p>
                  <button onClick={() => setTab("Upload")} className="btn-primary mt-4 text-xs">
                    UPLOAD YOUR FIRST DATASET
                  </button>
                </div>
              ) : datasets.map(ds => (
                <div key={ds._id} className="glass-card p-5 hover:border-gv-green/30 transition-all duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="font-heading text-base font-bold text-white truncate">{ds.fileName}</span>
                        <span className={`font-mono text-xs px-2 py-0.5 border ${ds.isActive ? "text-gv-green border-gv-green/30" : "text-gv-muted border-gv-border"}`}>
                          {ds.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                        {[
                          { l: "CID", v: ds.ipfsCID?.slice(0,16) + "..." },
                          { l: "Price", v: ds.price + " MATIC" },
                          { l: "Accesses", v: ds.accessCount || 0 },
                          { l: "Type", v: ds.metadata?.sequencingType || "—" },
                        ].map(i => (
                          <div key={i.l}>
                            <p className="font-mono text-xs text-gv-muted">{i.l}</p>
                            <p className="font-mono text-xs text-gv-text mt-0.5">{i.v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── UPLOAD ── */}
          {tab === "Upload" && (
            <div className="max-w-2xl space-y-6">
              {/* Dropzone */}
              <div {...getRootProps()} className={`glass-card p-10 text-center cursor-pointer border-2 border-dashed
                transition-all duration-300 ${isDragActive ? "border-gv-green bg-gv-green/10" : "border-gv-border hover:border-gv-green/50"}`}>
                <input {...getInputProps()} />
                <div className="w-12 h-12 border border-gv-green/40 flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="1.5">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeLinecap="round"/>
                  </svg>
                </div>
                {uploadFile ? (
                  <div>
                    <p className="font-mono text-sm text-gv-green">{uploadFile.name}</p>
                    <p className="font-mono text-xs text-gv-muted mt-1">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <>
                    <p className="font-mono text-sm text-gv-text mb-1">
                      {isDragActive ? "Drop your genome file here" : "Drag & drop genome file, or click to select"}
                    </p>
                    <p className="font-mono text-xs text-gv-muted">Supported: .vcf .fastq .bam .fasta .gz · Max 500 MB</p>
                  </>
                )}
              </div>

              {/* Metadata */}
              <div className="glass-card p-6 space-y-4">
                <p className="font-mono text-xs text-gv-green tracking-wider">DATASET METADATA</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-xs text-gv-muted block mb-1.5">Ancestry</label>
                    <input className="gv-input" placeholder="e.g. South Asian"
                      value={uploadMeta.ancestry} onChange={e => setUploadMeta(p => ({...p, ancestry: e.target.value}))} />
                  </div>
                  <div>
                    <label className="font-mono text-xs text-gv-muted block mb-1.5">Sequencing Type</label>
                    <select className="gv-input" value={uploadMeta.sequencingType}
                      onChange={e => setUploadMeta(p => ({...p, sequencingType: e.target.value}))}>
                      {["VCF","FASTQ","BAM","WGS","WES","SNP-array","RNA-seq"].map(t =>
                        <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-mono text-xs text-gv-muted block mb-1.5">Population Region</label>
                    <input className="gv-input" placeholder="e.g. India, Europe..."
                      value={uploadMeta.populationRegion}
                      onChange={e => setUploadMeta(p => ({...p, populationRegion: e.target.value}))} />
                  </div>
                  <div>
                    <label className="font-mono text-xs text-gv-muted block mb-1.5">Price (MATIC)</label>
                    <input className="gv-input" type="number" min="0" step="0.01" placeholder="0.00"
                      value={uploadPrice} onChange={e => setUploadPrice(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="font-mono text-xs text-gv-muted block mb-1.5">Description</label>
                  <textarea className="gv-input h-20 resize-none" placeholder="Brief description of this dataset..."
                    value={uploadMeta.description}
                    onChange={e => setUploadMeta(p => ({...p, description: e.target.value}))} />
                </div>
              </div>

              {/* Upload progress */}
              {uploading && (
                <div className="glass-card p-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-mono text-xs text-gv-green tracking-wider">ENCRYPTING & UPLOADING</span>
                    <span className="font-mono text-xs text-gv-text">{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-gv-dark w-full">
                    <div ref={progressBarRef} className="h-full bg-gv-green shadow-glow-sm" style={{ width: "0%" }} />
                  </div>
                  <p className="font-mono text-xs text-gv-muted mt-2">
                    {uploadProgress < 30 ? "Encrypting file with AES-256..."
                     : uploadProgress < 70 ? "Uploading to IPFS..."
                     : uploadProgress < 95 ? "Registering on blockchain..."
                     : "Finalizing..."}
                  </p>
                </div>
              )}

              <button onClick={handleUploadClick} disabled={!uploadFile || uploading}
                className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed">
                {uploading ? "UPLOADING..." : "SIGN & UPLOAD DATASET"}
              </button>
            </div>
          )}

          {/* ── ACCESS REQUESTS ── */}
          {tab === "Access Requests" && (
            <div className="space-y-4">
              {requests.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <p className="font-mono text-sm text-gv-muted">No pending access requests.</p>
                </div>
              ) : requests.map(req => (
                <div key={req._id} className="glass-card p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="font-heading text-base font-bold text-white">
                          {req.researcher?.fullName || "Researcher"}
                        </span>
                        <span className="badge-pending">PENDING</span>
                        <span className="font-mono text-xs text-gv-muted">{req.researcher?.institution}</span>
                      </div>
                      <p className="font-mono text-xs text-gv-muted mb-1">Research objective:</p>
                      <p className="font-mono text-xs text-gv-text mb-3 leading-relaxed">{req.researchObjective}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { l: "Dataset", v: req.dataset?.fileName || "—" },
                          { l: "Duration", v: req.durationDays + " days" },
                          { l: "Funding", v: req.fundingSource || "—" },
                          { l: "Field", v: req.researcher?.researchField || "—" },
                        ].map(i => (
                          <div key={i.l}>
                            <p className="font-mono text-xs text-gv-muted">{i.l}</p>
                            <p className="font-mono text-xs text-gv-text mt-0.5">{i.v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3 flex-shrink-0">
                      <button onClick={() => handleApprove(req._id)} className="btn-primary text-xs py-2 px-4">APPROVE</button>
                      <button onClick={() => handleReject(req._id)}
                        className="font-mono text-xs text-gv-danger border border-gv-danger/40 px-4 py-2
                                   hover:bg-gv-danger/10 transition-all duration-200">REJECT</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── EARNINGS ── */}
          {tab === "Earnings" && earnings && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { l: "Total Earned", v: (earnings.totalEarnings || 0).toFixed(4) + " MATIC", c: "#00ff88" },
                  { l: "Total Accesses", v: earnings.totalAccesses || 0, c: "#00ccff" },
                  { l: "Active Datasets", v: earnings.datasets?.filter(d => d.isActive).length || 0, c: "#ffcc00" },
                ].map(s => (
                  <div key={s.l} className="glass-card p-5">
                    <p className="font-mono text-xs text-gv-muted tracking-wider mb-2">{s.l.toUpperCase()}</p>
                    <p className="font-heading text-3xl font-bold" style={{ color: s.c }}>{s.v}</p>
                  </div>
                ))}
              </div>
              <div className="glass-card p-5">
                <p className="font-mono text-xs text-gv-green tracking-wider mb-4">RECENT ACCESS PAYMENTS</p>
                {(earnings.recentAccesses || []).length === 0 ? (
                  <p className="font-mono text-xs text-gv-muted">No payments yet.</p>
                ) : (earnings.recentAccesses || []).slice(0,8).map(a => (
                  <div key={a._id} className="flex justify-between items-center py-3 border-b border-gv-border last:border-none">
                    <div>
                      <p className="font-mono text-xs text-gv-text">{a.researcher?.fullName || "Researcher"}</p>
                      <p className="font-mono text-xs text-gv-muted">{a.dataset?.fileName}</p>
                    </div>
                    <p className="font-mono text-xs text-gv-green">+{(a.dataset?.price * 0.95 || 0).toFixed(4)} MATIC</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── AUDIT LOG ── */}
          {tab === "Audit Log" && (
            <div className="glass-card overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-gv-border">
                    {["Action","Researcher","Dataset","Status","Date"].map(h => (
                      <th key={h} className="text-left px-5 py-3 font-mono text-xs text-gv-muted tracking-wider">{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLog.length === 0 ? (
                    <tr><td colSpan="5" className="px-5 py-8 font-mono text-xs text-gv-muted text-center">No audit logs yet.</td></tr>
                  ) : auditLog.map(log => (
                    <tr key={log._id} className="border-b border-gv-border hover:bg-gv-card/50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-gv-green">{log.status?.toUpperCase()}</td>
                      <td className="px-5 py-3 font-mono text-xs text-gv-text">{log.researcher?.fullName || "—"}</td>
                      <td className="px-5 py-3 font-mono text-xs text-gv-muted">{log.dataset?.fileName || "—"}</td>
                      <td className="px-5 py-3">{statusBadge(log.status)}</td>
                      <td className="px-5 py-3 font-mono text-xs text-gv-muted">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={sigModal.open}
        onClose={() => setSigModal({ open: false, action: null, data: null })}
        onSigned={onSigned}
        title={sigModal.action === "upload" ? "Sign Upload Authorization" : "Sign Access Approval"}
        message={
          sigModal.action === "upload"
            ? buildUploadMessage(sigModal.data?.fileHash || "")
            : `Access Approval\n\nWallet: ${address}\nRequest ID: ${sigModal.data?.requestId}\nTimestamp: ${Date.now()}\n\nI authorize this researcher to access my genomic dataset.`
        }
        details={sigModal.action === "upload"
          ? [
              { label: "File", value: uploadFile?.name },
              { label: "Wallet", value: address },
              { label: "Price", value: uploadPrice + " MATIC" },
            ]
          : [{ label: "Request ID", value: sigModal.data?.requestId }]
        }
      />
    </>
  );
}
