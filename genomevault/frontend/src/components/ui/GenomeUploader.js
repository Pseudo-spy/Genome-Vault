import { useState, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { gsap } from "gsap";
import { ethers } from "ethers";
import api from "../../utils/api";
import useAuthStore from "../../context/authStore";
import toast from "react-hot-toast";
import SignatureModal from "../modals/SignatureModal";

const ACCEPTED = { "application/octet-stream": [".vcf", ".fastq", ".bam", ".fasta", ".gz"] };
const FORMAT_COLORS = { vcf: "#00ff88", fastq: "#00ffcc", bam: "#ffaa00", fasta: "#a78bfa", gz: "#94a3b8" };

export default function GenomeUploader({ onSuccess }) {
  const { address } = useAuthStore();
  const progressRef = useRef(null);
  const particlesRef = useRef(null);

  const [file, setFile]           = useState(null);
  const [stage, setStage]         = useState("idle"); // idle|hashing|signing|uploading|done|error
  const [progress, setProgress]   = useState(0);
  const [fileHash, setFileHash]   = useState("");
  const [showSig, setShowSig]     = useState(false);
  const [sigMsg, setSigMsg]       = useState("");
  const [metadata, setMetadata]   = useState({ price: "0", sequencingType: "other", ancestry: "", populationRegion: "", description: "" });
  const [result, setResult]       = useState(null);

  // ── Dropzone ─────────────────────────────────────────────────────────────
  const onDrop = useCallback(async (accepted) => {
    if (!accepted.length) return;
    const f = accepted[0];
    if (f.size > 500 * 1024 * 1024) return toast.error("Max file size is 500 MB");
    setFile(f);
    setStage("hashing");
    animateProgress(0, 30, 1200);

    // SHA-256 hash in browser
    const buf    = await f.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    const hex    = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,"0")).join("");
    setFileHash(hex);
    animateProgress(30, 50, 600);
    setStage("ready");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: ACCEPTED, maxFiles: 1 });

  // ── Animated progress bar ────────────────────────────────────────────────
  const animateProgress = (from, to, dur) => {
    if (!progressRef.current) return;
    gsap.fromTo(progressRef.current,
      { width: `${from}%` },
      { width: `${to}%`, duration: dur / 1000, ease: "power1.inOut",
        onUpdate: () => setProgress(Math.round(parseFloat(progressRef.current?.style.width || "0"))) }
    );
  };

  // ── Trigger signature flow ─────────────────────────────────────────────
  const handleUploadClick = () => {
    if (!file || !fileHash) return toast.error("Please drop a file first");
    if (!address) return toast.error("Connect your wallet first");
    const ts = Date.now();
    const msg = `Genome Upload Authorization\n\nWallet Address: ${address}\nDataset Hash: ${fileHash}\nTimestamp: ${ts}\n\nI authorize the upload of this genomic dataset to the GenomeVault platform.`;
    setSigMsg(msg);
    setShowSig(true);
  };

  // ── After signature obtained ─────────────────────────────────────────
  const handleSigned = async (signature) => {
    setShowSig(false);
    setStage("uploading");
    animateProgress(50, 80, 2000);

    try {
      const formData = new FormData();
      formData.append("genomeFile",      file);
      formData.append("price",           metadata.price);
      formData.append("signatureHash",   signature);
      formData.append("signedMessage",   sigMsg);
      formData.append("metadata", JSON.stringify({
        sequencingType:   metadata.sequencingType,
        ancestry:         metadata.ancestry,
        populationRegion: metadata.populationRegion,
        description:      metadata.description,
      }));

      const { data } = await api.post("/datasets/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded / e.total) * 100);
          animateProgress(80, 80 + pct * 0.18, 100);
        }
      });

      animateProgress(progress, 100, 400);
      setStage("done");
      setResult(data);
      spawnSuccessParticles();
      toast.success("Genome uploaded and registered on-chain!");
      onSuccess?.(data);
    } catch (err) {
      setStage("error");
      toast.error(err?.response?.data?.error || "Upload failed");
    }
  };

  const spawnSuccessParticles = () => {
    if (!particlesRef.current) return;
    for (let i = 0; i < 20; i++) {
      const dot = document.createElement("div");
      dot.style.cssText = `position:absolute;width:6px;height:6px;border-radius:50%;background:#00ff88;left:50%;top:50%;pointer-events:none`;
      particlesRef.current.appendChild(dot);
      gsap.to(dot, {
        x: (Math.random() - 0.5) * 300, y: (Math.random() - 0.5) * 200,
        opacity: 0, scale: 0, duration: 1.2 + Math.random(),
        ease: "power2.out", onComplete: () => dot.remove()
      });
    }
  };

  const ext = file?.name.split(".").pop().toLowerCase();
  const color = FORMAT_COLORS[ext] || "#00ff88";

  const STAGE_LABELS = {
    idle: "Drop your genome file",
    hashing: "Computing SHA-256 hash…",
    ready: "File ready — configure and upload",
    uploading: "Encrypting & uploading to IPFS…",
    done: "Upload complete ✓",
    error: "Upload failed — try again",
  };

  return (
    <div className="space-y-6">

      {/* Drop zone */}
      <div {...getRootProps()} className={`relative border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300 
        ${isDragActive ? "border-gv-green bg-gv-green/5 shadow-glow-md" : "border-gv-border hover:border-gv-green/50"}
        ${file ? "border-gv-green/50 bg-gv-green/5" : ""}`}>
        <input {...getInputProps()} />
        <div ref={particlesRef} className="absolute inset-0 overflow-hidden pointer-events-none" />

        {file ? (
          <div>
            <div className="inline-flex items-center gap-3 mb-3">
              <span className="font-mono text-xs px-2 py-1 border" style={{ borderColor: color, color }}>.{ext?.toUpperCase()}</span>
              <span className="font-mono text-gv-green text-sm">{file.name}</span>
            </div>
            <p className="font-mono text-xs text-gv-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            {fileHash && (
              <p className="font-mono text-xs text-gv-muted mt-2 break-all">
                SHA-256: <span className="text-gv-green/70">{fileHash.slice(0,32)}…</span>
              </p>
            )}
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-3 text-gv-green/40">⬆</div>
            <p className="font-heading text-lg text-gv-text tracking-wide">
              {isDragActive ? "Release to upload" : "Drag & drop genome file"}
            </p>
            <p className="font-mono text-xs text-gv-muted mt-2">.VCF · .FASTQ · .BAM · .FASTA · .GZ — max 500 MB</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {stage !== "idle" && (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="font-mono text-xs text-gv-muted">{STAGE_LABELS[stage]}</span>
            <span className="font-mono text-xs text-gv-green">{progress}%</span>
          </div>
          <div className="h-1 bg-gv-panel border border-gv-border overflow-hidden">
            <div ref={progressRef} className="h-full bg-gv-green transition-all"
              style={{ width: `${progress}%`, boxShadow: "0 0 8px #00ff88" }} />
          </div>
        </div>
      )}

      {/* Metadata form */}
      {file && stage !== "uploading" && stage !== "done" && (
        <div className="glass-card p-5 space-y-4">
          <p className="font-mono text-xs text-gv-muted uppercase tracking-widest">Dataset Configuration</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gv-muted text-xs font-mono uppercase mb-1 block">Price (MATIC)</label>
              <input type="number" min="0" step="0.01" value={metadata.price}
                onChange={e => setMetadata(m => ({ ...m, price: e.target.value }))}
                className="gv-input text-sm" placeholder="0 = free" />
            </div>
            <div>
              <label className="text-gv-muted text-xs font-mono uppercase mb-1 block">Sequencing type</label>
              <select value={metadata.sequencingType}
                onChange={e => setMetadata(m => ({ ...m, sequencingType: e.target.value }))}
                className="gv-input text-sm bg-gv-panel">
                {["WGS","WES","SNP-array","RNA-seq","FASTQ","VCF","BAM","other"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gv-muted text-xs font-mono uppercase mb-1 block">Ancestry</label>
              <input value={metadata.ancestry}
                onChange={e => setMetadata(m => ({ ...m, ancestry: e.target.value }))}
                className="gv-input text-sm" placeholder="South Asian, European…" />
            </div>
            <div>
              <label className="text-gv-muted text-xs font-mono uppercase mb-1 block">Region</label>
              <input value={metadata.populationRegion}
                onChange={e => setMetadata(m => ({ ...m, populationRegion: e.target.value }))}
                className="gv-input text-sm" placeholder="India, Europe…" />
            </div>
          </div>
          <div>
            <label className="text-gv-muted text-xs font-mono uppercase mb-1 block">Description</label>
            <textarea rows={2} value={metadata.description}
              onChange={e => setMetadata(m => ({ ...m, description: e.target.value }))}
              className="gv-input text-sm resize-none" placeholder="Brief description of the dataset…" />
          </div>
        </div>
      )}

      {/* Done result */}
      {stage === "done" && result && (
        <div className="glass-card border border-gv-green/40 p-5 space-y-2">
          <p className="font-heading text-gv-green text-lg">Dataset registered successfully</p>
          <p className="font-mono text-xs text-gv-muted">IPFS CID: <span className="text-gv-green break-all">{result.ipfsCID}</span></p>
          {result.blockchainTxHash && (
            <p className="font-mono text-xs text-gv-muted">TX: <span className="text-gv-green/70">{result.blockchainTxHash.slice(0,20)}…</span></p>
          )}
          <button onClick={() => { setFile(null); setStage("idle"); setProgress(0); setFileHash(""); setResult(null); }}
            className="btn-ghost text-sm py-2 px-4 mt-2">Upload Another</button>
        </div>
      )}

      {/* Upload button */}
      {file && stage === "ready" && (
        <button onClick={handleUploadClick} className="w-full btn-primary py-4 text-sm tracking-widest">
          ENCRYPT &amp; UPLOAD WITH METAMASK →
        </button>
      )}

      {/* Signature modal */}
      <SignatureModal
        isOpen={showSig}
        onClose={() => setShowSig(false)}
        onSigned={handleSigned}
        title="Sign Upload Authorization"
        message={sigMsg}
        actionLabel="Authorize genome upload"
      />
    </div>
  );
}
