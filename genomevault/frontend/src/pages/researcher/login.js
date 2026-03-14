import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Navbar from "../../components/layout/Navbar";
import { useWallet } from "../../hooks/useWallet";
import useAuthStore from "../../context/authStore";
import api from "../../utils/api";
import toast from "react-hot-toast";

export default function ResearcherLogin() {
  const router = useRouter();
  const { connect, connecting } = useWallet();
  const { setAuth } = useAuthStore();
  const [method, setMethod]   = useState("email"); // "email" | "wallet"
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleEmailLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/researcher/login", { email, password });
      setAuth(data.token, data.user, data.role);
      toast.success("Welcome back!");
      router.push("/researcher/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleWalletLogin() {
    const result = await connect();
    if (result?.role === "researcher") {
      router.push("/researcher/dashboard");
    } else if (result) {
      router.push("/dashboard");
    }
  }

  return (
    <>
      <Head><title>Researcher Login — GenomeVault</title></Head>
      <Navbar />
      <div className="min-h-screen grid-bg pt-16 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <p className="font-mono text-xs text-gv-cyan tracking-widest mb-2">RESEARCHER PORTAL</p>
            <h1 className="font-heading text-3xl font-bold text-white">Log in</h1>
          </div>

          <div className="glass-card p-8">
            {/* Method toggle */}
            <div className="flex border border-gv-border mb-8">
              {[["email","Email + Password"],["wallet","MetaMask Wallet"]].map(([m,l]) => (
                <button key={m} onClick={() => setMethod(m)}
                  className={`flex-1 py-2.5 font-mono text-xs tracking-wider transition-all duration-200
                    ${method === m ? "bg-gv-green text-gv-black font-bold" : "text-gv-muted hover:text-gv-text"}`}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {method === "email" ? (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="font-mono text-xs text-gv-muted block mb-1.5">Institutional Email</label>
                  <input type="email" className="gv-input" placeholder="you@institution.edu"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="font-mono text-xs text-gv-muted block mb-1.5">Password</label>
                  <input type="password" className="gv-input" placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full mt-2 disabled:opacity-50">
                  {loading ? "LOGGING IN..." : "LOG IN"}
                </button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <p className="font-mono text-xs text-gv-muted leading-relaxed">
                  Connect your registered wallet to authenticate as a researcher.
                  Your wallet must be linked to a verified researcher account.
                </p>
                <button onClick={handleWalletLogin} disabled={connecting} className="btn-primary w-full disabled:opacity-50">
                  {connecting ? "CONNECTING..." : "CONNECT METAMASK"}
                </button>
              </div>
            )}
          </div>

          <p className="font-mono text-xs text-gv-muted text-center mt-6">
            Don't have an account?{" "}
            <Link href="/researcher/signup" className="text-gv-green hover:underline">Apply here</Link>
          </p>
        </div>
      </div>
    </>
  );
}
