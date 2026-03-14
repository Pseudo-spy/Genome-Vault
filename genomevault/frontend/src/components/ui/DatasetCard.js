import { useState } from "react";
import { useWallet } from "../../hooks/useWallet";
import api from "../../utils/api";
import toast from "react-hot-toast";
import SignatureModal from "../modals/SignatureModal";

export default function DatasetCard({ dataset, onRequested }) {
  const { address, signMessage } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [showSig, setShowSig]     = useState(false);
  const [sigMsg, setSigMsg]       = useState("");
  const [form, setForm] = useState({ researchObjective: "", fundingSource: "", durationDays: "30" });
  const [submitting, setSubmitting] = useState(false);

  const SEQ_COLORS = {
    WGS: "#00ff88", WES: "#00ffcc", "SNP-array": "#a78bfa",
    "RNA-seq": "#ffaa00", FASTQ: "#94a3b8", VCF: "#60a5fa", BAM: "#f472b6", other: "#4a7a4a"
  };

  const handleRequestClick = () => {
    if (!address) return toast.error("Connect wallet to request access");
    if (!form.researchObjective.trim()) return toast.error("Describe your research objective");
    const ts = Date.now();
    const msg = `Research Data Access Request\n\nResearcher Wallet: ${address}\nDataset ID: ${dataset._id}\nResearch Purpose: ${form.researchObjective}\nTimestamp: ${ts}\n\nI confirm that this data will only be used for approved research purposes.`;
    setSigMsg(msg);
    setShowSig(true);
  };

  const handleSigned = async (signature) => {
    setShowSig(false);
    setSubmitting(true);
    try {
      await api.post("/access/request", {
        datasetId:         dataset._id,
        researchObjective: form.researchObjective,
        fundingSource:     form.fundingSource,
        durationDays:      parseInt(form.durationDays),
        signatureHash:     signature,
        signedMessage:     sigMsg,
      });
      toast.success("Access request submitted and signed on-chain");
      setShowModal(false);
      onRequested?.();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const seqType = dataset.metadata?.sequencingType || "other";
  const color   = SEQ_COLORS[seqType] || "#4a7a4a";

  return (
    <>
      <div className="glass-card border-glow p-5 flex flex-col gap-4 hover:border-gv-green/30 transition-all duration-300 group">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-mono text-xs px-2 py-0.5 border" style={{ borderColor: color, color }}>
                {seqType}
              </span>
              {dataset.metadata?.ancestry && (
                <span className="font-mono text-xs text-gv-muted">{dataset.metadata.ancestry}</span>
              )}
            </div>
            <p className="font-heading text-gv-text text-base truncate">{dataset.fileName || "Genome Dataset"}</p>
            <p className="font-mono text-xs text-gv-muted mt-0.5">
              {dataset.metadata?.populationRegion} · {dataset.metadata?.snpCount
                ? `${(dataset.metadata.snpCount / 1000).toFixed(0)}K SNPs` : ""}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-heading text-xl font-bold text-gv-green">
              {dataset.price > 0 ? `${dataset.price} MATIC` : "FREE"}
            </p>
            <p className="font-mono text-xs text-gv-muted">{dataset.accessCount || 0} accesses</p>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          {dataset.metadata?.coverage > 0 && (
            <div className="bg-gv-black/50 px-2 py-1.5">
              <span className="text-gv-muted">Coverage: </span>
              <span className="text-gv-text">{dataset.metadata.coverage}×</span>
            </div>
          )}
          {dataset.metadata?.qualityScore > 0 && (
            <div className="bg-gv-black/50 px-2 py-1.5">
              <span className="text-gv-muted">Quality: </span>
              <span className="text-gv-text">{dataset.metadata.qualityScore}%</span>
            </div>
          )}
          {dataset.fileSize > 0 && (
            <div className="bg-gv-black/50 px-2 py-1.5">
              <span className="text-gv-muted">Size: </span>
              <span className="text-gv-text">{(dataset.fileSize / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          )}
          <div className="bg-gv-black/50 px-2 py-1.5">
            <span className="text-gv-muted">Added: </span>
            <span className="text-gv-text">{new Date(dataset.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Description */}
        {dataset.metadata?.description && (
          <p className="font-mono text-xs text-gv-muted leading-relaxed line-clamp-2">
            {dataset.metadata.description}
          </p>
        )}

        {/* CID */}
        <p className="font-mono text-xs text-gv-muted/50 truncate">
          IPFS: {dataset.ipfsCID?.slice(0, 20)}…
        </p>

        {/* Request button */}
        <button onClick={() => setShowModal(true)}
          className="w-full py-2.5 border border-gv-green/40 text-gv-green font-mono text-xs uppercase tracking-wider
                     hover:bg-gv-green hover:text-gv-black transition-all duration-200 group-hover:border-gv-green">
          Request Access
        </button>
      </div>

      {/* Request modal */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: "rgba(5,10,5,0.9)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="glass-card border-glow w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-gv-green text-lg tracking-wide">Request Data Access</h3>
              <button onClick={() => setShowModal(false)} className="text-gv-muted hover:text-gv-green font-mono">✕</button>
            </div>

            {/* Dataset summary */}
            <div className="bg-gv-black/50 border border-gv-border p-3 font-mono text-xs space-y-1">
              <p className="text-gv-muted">Dataset: <span className="text-gv-text">{dataset.fileName}</span></p>
              <p className="text-gv-muted">Price: <span className="text-gv-green">{dataset.price || 0} MATIC</span></p>
              <p className="text-gv-muted">IPFS: <span className="text-gv-text">{dataset.ipfsCID?.slice(0,30)}…</span></p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gv-muted text-xs font-mono uppercase tracking-wider mb-1 block">Research objective *</label>
                <textarea rows={3} value={form.researchObjective}
                  onChange={e => setForm(f => ({ ...f, researchObjective: e.target.value }))}
                  className="gv-input text-sm resize-none"
                  placeholder="Describe your research goals and how you will use this data…" />
              </div>
              <div>
                <label className="text-gv-muted text-xs font-mono uppercase tracking-wider mb-1 block">Funding source</label>
                <input value={form.fundingSource}
                  onChange={e => setForm(f => ({ ...f, fundingSource: e.target.value }))}
                  className="gv-input text-sm" placeholder="NIH Grant, University Fund, Private…" />
              </div>
              <div>
                <label className="text-gv-muted text-xs font-mono uppercase tracking-wider mb-1 block">Access duration (days)</label>
                <select value={form.durationDays}
                  onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))}
                  className="gv-input text-sm bg-gv-panel">
                  {["7","14","30","60","90","180","365"].map(d => (
                    <option key={d} value={d}>{d} days</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 border border-gv-border text-gv-muted font-mono text-sm hover:border-gv-green hover:text-gv-green transition-all">
                Cancel
              </button>
              <button onClick={handleRequestClick} disabled={submitting}
                className="flex-1 btn-primary text-sm py-3 disabled:opacity-50">
                {submitting ? "Submitting…" : "Sign & Submit →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature modal */}
      <SignatureModal
        isOpen={showSig}
        onClose={() => setShowSig(false)}
        onSigned={handleSigned}
        title="Sign Research Access Request"
        message={sigMsg}
        actionLabel="Confirm research request"
      />
    </>
  );
}
