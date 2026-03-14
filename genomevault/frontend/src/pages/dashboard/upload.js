import { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Navbar from "../../components/layout/Navbar";
import GenomeUploader from "../../components/ui/GenomeUploader";
import useAuthStore from "../../context/authStore";
import toast from "react-hot-toast";

export default function UploadPage() {
  const router = useRouter();
  const { token, role } = useAuthStore();

  useEffect(() => {
    if (!token) router.push("/");
    else if (role !== "dataOwner") router.push("/researcher/dashboard");
  }, [token, role]);

  return (
    <>
      <Head><title>Upload Genome | GenomeVault</title></Head>
      <div className="min-h-screen bg-gv-black grid-bg">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="mb-8">
            <h1 className="font-heading text-3xl text-gv-green tracking-widest mb-2">UPLOAD GENOME DATA</h1>
            <p className="font-mono text-gv-muted text-sm">
              Your file is AES-encrypted client-side before IPFS upload. Only you hold the decryption key.
            </p>
          </div>

          {/* Process steps */}
          <div className="glass-card border-glow p-5 mb-8">
            <p className="font-mono text-xs text-gv-muted uppercase tracking-widest mb-4">Upload Process</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { n: "01", label: "Hash file", desc: "SHA-256 computed locally" },
                { n: "02", label: "Sign",       desc: "MetaMask signature" },
                { n: "03", label: "Encrypt",    desc: "AES-256 encryption" },
                { n: "04", label: "Register",   desc: "IPFS + blockchain" },
              ].map(s => (
                <div key={s.n} className="text-center">
                  <div className="w-8 h-8 border border-gv-green/40 font-mono text-xs text-gv-green flex items-center justify-center mx-auto mb-2">
                    {s.n}
                  </div>
                  <p className="font-heading text-sm text-gv-text">{s.label}</p>
                  <p className="font-mono text-xs text-gv-muted mt-0.5">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card border-glow p-6">
            <GenomeUploader onSuccess={() => {
              toast.success("Navigating to your datasets…");
              setTimeout(() => router.push("/dashboard"), 2000);
            }} />
          </div>
        </div>
      </div>
    </>
  );
}
