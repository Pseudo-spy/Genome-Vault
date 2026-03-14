import { useState, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Navbar from "../../components/layout/Navbar";
import api from "../../utils/api";
import toast from "react-hot-toast";

const FIELDS = [
  { name:"fullName",     label:"Full Name",            type:"text",     placeholder:"Dr. Priya Sharma" },
  { name:"email",        label:"Institutional Email",  type:"email",    placeholder:"p.sharma@iitb.ac.in" },
  { name:"password",     label:"Password",             type:"password", placeholder:"Min 8 characters" },
  { name:"institution",  label:"Research Institution", type:"text",     placeholder:"IIT Bombay" },
  { name:"department",   label:"Department",           type:"text",     placeholder:"Department of Biosciences" },
  { name:"researchField",label:"Research Field",       type:"text",     placeholder:"Genomics, Cancer Biology..." },
  { name:"linkedIn",     label:"LinkedIn / Profile",   type:"url",      placeholder:"https://linkedin.com/in/..." },
  { name:"walletAddress",label:"Wallet Address (optional)", type:"text", placeholder:"0x..." },
];

export default function ResearcherSignup() {
  const router = useRouter();
  const [form, setForm]             = useState({});
  const [idFile, setIdFile]         = useState(null);
  const [ethicsFile, setEthicsFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const idInputRef     = useRef(null);
  const ethicsInputRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!idFile) return toast.error("Please upload your institutional ID");
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("institutionalId", idFile);
      if (ethicsFile) fd.append("ethicsApproval", ethicsFile);
      await api.post("/researchers/signup", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Application submitted! Awaiting admin verification.");
      router.push("/researcher/login");
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.errors?.[0]?.msg || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head><title>Researcher Signup — GenomeVault</title></Head>
      <Navbar />
      <div className="min-h-screen grid-bg pt-16">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="mb-8">
            <p className="font-mono text-xs text-gv-green tracking-widest mb-2">RESEARCHER ONBOARDING</p>
            <h1 className="font-heading text-3xl font-bold text-white">Apply for research access</h1>
            <p className="font-mono text-xs text-gv-muted mt-2">
              Applications are reviewed by admins. Only verified researchers can access the genomic marketplace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="glass-card p-6 space-y-4">
              <p className="font-mono text-xs text-gv-green tracking-wider">PERSONAL INFORMATION</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {FIELDS.map(f => (
                  <div key={f.name} className={f.name === "fullName" || f.name === "institution" ? "sm:col-span-2" : ""}>
                    <label className="font-mono text-xs text-gv-muted block mb-1.5">{f.label}</label>
                    <input
                      type={f.type}
                      placeholder={f.placeholder}
                      className="gv-input"
                      value={form[f.name] || ""}
                      onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                      required={!["linkedIn","walletAddress","department"].includes(f.name)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6 space-y-5">
              <p className="font-mono text-xs text-gv-green tracking-wider">VERIFICATION DOCUMENTS</p>

              <div>
                <p className="font-mono text-xs text-gv-muted mb-2">Institutional ID <span className="text-red-400">*</span> — JPG, PNG or PDF</p>
                <input ref={idInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display:"none" }}
                  onChange={e => { if (e.target.files?.[0]) setIdFile(e.target.files[0]); }} />
                <div onClick={() => idInputRef.current.click()}
                  className={`border-2 border-dashed p-6 text-center cursor-pointer transition-all
                    ${idFile ? "border-gv-green bg-gv-green/5" : "border-gv-border hover:border-gv-green/50"}`}>
                  {idFile
                    ? <p className="font-mono text-sm text-gv-green">✓ {idFile.name} ({(idFile.size/1024).toFixed(1)} KB)</p>
                    : <><p className="font-mono text-sm text-gv-muted">Click to select file</p><p className="font-mono text-xs text-gv-muted/60 mt-1">JPG, PNG or PDF</p></>}
                </div>
              </div>

              <div>
                <p className="font-mono text-xs text-gv-muted mb-2">Ethics Approval Document (optional) — PDF, JPG or PNG</p>
                <input ref={ethicsInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display:"none" }}
                  onChange={e => { if (e.target.files?.[0]) setEthicsFile(e.target.files[0]); }} />
                <div onClick={() => ethicsInputRef.current.click()}
                  className={`border-2 border-dashed p-6 text-center cursor-pointer transition-all
                    ${ethicsFile ? "border-gv-green bg-gv-green/5" : "border-gv-border hover:border-gv-green/50"}`}>
                  {ethicsFile
                    ? <p className="font-mono text-sm text-gv-green">✓ {ethicsFile.name} ({(ethicsFile.size/1024).toFixed(1)} KB)</p>
                    : <><p className="font-mono text-sm text-gv-muted">Click to select file</p><p className="font-mono text-xs text-gv-muted/60 mt-1">PDF, JPG or PNG</p></>}
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-gv-green/5 border border-gv-green/20">
              <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
              </svg>
              <div className="space-y-1">
                <p className="font-mono text-xs text-gv-green font-bold">How verification works</p>
                <p className="font-mono text-xs text-gv-muted">
                  Your application is reviewed by our admin team (typically 24–48 hours).
                  You can login but marketplace access requires <span className="text-gv-text">verified</span> status.
                </p>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-50">
              {submitting ? "SUBMITTING..." : "SUBMIT APPLICATION"}
            </button>
          </form>

          <p className="font-mono text-xs text-gv-muted text-center mt-6">
            Already have an account?{" "}
            <Link href="/researcher/login" className="text-gv-green hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </>
  );
}