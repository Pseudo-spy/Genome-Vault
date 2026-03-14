import { useState, useEffect } from "react";
import api from "../../utils/api";
import useAuthStore from "../../context/authStore";
import toast from "react-hot-toast";
import SignatureModal from "../modals/SignatureModal";

const STATUS_BADGE = {
  pending:  "badge-pending",
  approved: "badge-approved",
  rejected: "badge-rejected",
  revoked:  "badge-rejected",
};

export default function AccessControlPanel() {
  const { address } = useAuthStore();
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("all");
  const [showSig, setShowSig]     = useState(false);
  const [sigAction, setSigAction] = useState(null); // { type, requestId, msg }
  const [processing, setProcessing] = useState({});

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/access/pending");
      // Also fetch all access logs for complete picture
      const { data: auditData } = await api.get("/access/audit-log");
      const combined = [...data, ...auditData.filter(r => r.status !== "pending")];
      // deduplicate by _id
      const unique = Array.from(new Map(combined.map(r => [r._id, r])).values());
      setRequests(unique);
    } catch (err) {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const initiateApprove = (req) => {
    const msg = `Access Approval Authorization\n\nOwner Wallet: ${address}\nResearcher: ${req.researcher?.walletAddress || req.researcherAddress}\nDataset: ${req.dataset?.fileName || req.dataset?._id}\nRequest ID: ${req._id}\nTimestamp: ${Date.now()}\n\nI approve this research access request for my genomic dataset.`;
    setSigAction({ type: "approve", requestId: req._id, msg });
    setShowSig(true);
  };

  const initiateRevoke = (req) => {
    const msg = `Access Revocation\n\nOwner Wallet: ${address}\nRequest ID: ${req._id}\nTimestamp: ${Date.now()}\n\nI revoke access to my genomic dataset for this researcher.`;
    setSigAction({ type: "revoke", requestId: req._id, msg });
    setShowSig(true);
  };

  const handleSigned = async (signature) => {
    setShowSig(false);
    const { type, requestId } = sigAction;
    setProcessing(p => ({ ...p, [requestId]: true }));
    try {
      if (type === "approve") {
        await api.post(`/access/${requestId}/approve`, { signatureHash: signature });
        toast.success("Access approved and key shared");
      } else if (type === "revoke") {
        await api.post(`/access/${requestId}/revoke`);
        toast.success("Access revoked");
      }
      fetchRequests();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Action failed");
    } finally {
      setProcessing(p => ({ ...p, [requestId]: false }));
    }
  };

  const handleReject = async (requestId) => {
    if (!confirm("Reject this access request?")) return;
    setProcessing(p => ({ ...p, [requestId]: true }));
    try {
      await api.post(`/access/${requestId}/reject`);
      toast.success("Request rejected");
      fetchRequests();
    } catch (err) {
      toast.error("Rejection failed");
    } finally {
      setProcessing(p => ({ ...p, [requestId]: false }));
    }
  };

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);

  if (loading) return (
    <div className="glass-card p-8 text-center">
      <div className="w-6 h-6 border-2 border-gv-green border-t-transparent animate-spin mx-auto mb-3" />
      <p className="font-mono text-gv-muted text-sm">Loading access requests…</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all","pending","approved","rejected","revoked"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-wider border transition-all duration-200
              ${filter === f ? "border-gv-green text-gv-green bg-gv-green/10" : "border-gv-border text-gv-muted hover:border-gv-green/50"}`}>
            {f} {f === "all" ? `(${requests.length})` : `(${requests.filter(r => r.status === f).length})`}
          </button>
        ))}
        <button onClick={fetchRequests} className="ml-auto px-3 py-2 border border-gv-border text-gv-muted font-mono text-xs hover:text-gv-green hover:border-gv-green transition-all">
          ↻ Refresh
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="font-mono text-gv-muted">No {filter === "all" ? "" : filter} requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(req => (
            <div key={req._id} className="glass-card border-glow p-5 hover:border-gv-green/30 transition-all duration-200">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={STATUS_BADGE[req.status] || "badge-pending"}>{req.status}</span>
                    <span className="font-mono text-gv-muted text-xs">{req._id?.slice(-8)}</span>
                  </div>
                  <p className="font-heading text-gv-text text-base mb-1">
                    {req.researcher?.fullName || "Researcher"}
                  </p>
                  <p className="font-mono text-xs text-gv-muted">
                    {req.researcher?.institution} · {req.researcher?.researchField}
                  </p>
                  {req.researcher?.walletAddress && (
                    <p className="font-mono text-xs text-gv-muted/60 mt-1">
                      {req.researcher.walletAddress.slice(0,10)}…{req.researcher.walletAddress.slice(-6)}
                    </p>
                  )}
                </div>
                {req.researcher?.reputationScore !== undefined && (
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-xs text-gv-muted">Reputation</p>
                    <p className="font-heading text-2xl font-bold"
                      style={{ color: req.researcher.reputationScore > 70 ? "#00ff88" : req.researcher.reputationScore > 40 ? "#ffaa00" : "#ff4444" }}>
                      {req.researcher.reputationScore}
                    </p>
                  </div>
                )}
              </div>

              {/* Dataset info */}
              <div className="bg-gv-black/50 border border-gv-border p-3 mb-4 text-xs font-mono">
                <p className="text-gv-muted mb-1">Dataset: <span className="text-gv-text">{req.dataset?.fileName || req.dataset?._id}</span></p>
                <p className="text-gv-muted mb-1">Price: <span className="text-gv-green">{req.dataset?.price || 0} MATIC</span></p>
                <p className="text-gv-muted">Duration: <span className="text-gv-text">{req.durationDays} days</span></p>
              </div>

              {/* Research objective */}
              <div className="bg-gv-panel border-l-2 border-gv-green/30 pl-3 mb-4">
                <p className="font-mono text-xs text-gv-muted mb-1">Research objective:</p>
                <p className="font-mono text-xs text-gv-text leading-relaxed">{req.researchObjective}</p>
                {req.fundingSource && (
                  <p className="font-mono text-xs text-gv-muted mt-1">Funding: {req.fundingSource}</p>
                )}
              </div>

              {/* Signature hash */}
              {req.signatureHash && (
                <p className="font-mono text-xs text-gv-muted/50 mb-4 break-all">
                  Sig: {req.signatureHash.slice(0, 40)}…
                </p>
              )}

              {/* Timestamp */}
              <p className="font-mono text-xs text-gv-muted mb-4">
                Submitted: {new Date(req.createdAt).toLocaleString()}
                {req.approvedAt && ` · Approved: ${new Date(req.approvedAt).toLocaleString()}`}
              </p>

              {/* Action buttons */}
              {req.status === "pending" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => initiateApprove(req)}
                    disabled={processing[req._id]}
                    className="flex-1 py-2.5 bg-gv-green/10 border border-gv-green text-gv-green font-mono text-xs uppercase tracking-wider
                               hover:bg-gv-green hover:text-gv-black transition-all disabled:opacity-50">
                    {processing[req._id] ? "Processing…" : "✓ Approve"}
                  </button>
                  <button
                    onClick={() => handleReject(req._id)}
                    disabled={processing[req._id]}
                    className="flex-1 py-2.5 bg-red-900/20 border border-gv-danger text-gv-danger font-mono text-xs uppercase tracking-wider
                               hover:bg-gv-danger hover:text-white transition-all disabled:opacity-50">
                    ✕ Reject
                  </button>
                </div>
              )}
              {req.status === "approved" && (
                <button
                  onClick={() => initiateRevoke(req)}
                  disabled={processing[req._id]}
                  className="w-full py-2.5 border border-gv-amber text-gv-amber font-mono text-xs uppercase tracking-wider
                             hover:bg-gv-amber hover:text-gv-black transition-all disabled:opacity-50">
                  ⊘ Revoke Access
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Signature modal */}
      <SignatureModal
        isOpen={showSig}
        onClose={() => setShowSig(false)}
        onSigned={handleSigned}
        title={sigAction?.type === "approve" ? "Sign Access Approval" : "Sign Access Revocation"}
        message={sigAction?.msg || ""}
        actionLabel={sigAction?.type === "approve" ? "Approve access" : "Revoke access"}
      />
    </div>
  );
}
