import { useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import Navbar from "../components/layout/Navbar";
import DNAHelix from "../components/dna/DNAHelix";
import { useWallet } from "../hooks/useWallet";
import useAuthStore from "../context/authStore";


if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    n: "01", color: "#00ff88",
    title: "Upload & Encrypt",
    desc:  "Upload your genomic data (VCF, FASTQ, BAM). Files are AES-encrypted client-side, hashed with SHA-256, and stored on IPFS — never on any central server.",
    icon:  "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
  },
  {
    n: "02", color: "#00ccff",
    title: "Sign & Register",
    desc:  "Sign an upload authorization with MetaMask. Your wallet signature is cryptographically verified and the dataset hash is registered immutably on-chain.",
    icon:  "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
  },
  {
    n: "03", color: "#ff88aa",
    title: "Control Access",
    desc:  "Researchers submit ZK-signed access requests with their research objective. You review, approve, or reject — full granular control over who sees your data.",
    icon:  "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
  },
  {
    n: "04", color: "#ffcc00",
    title: "Earn Rewards",
    desc:  "Smart contracts execute automatic payments when researchers access your approved datasets. Platform takes 5% — 95% goes directly to your wallet.",
    icon:  "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
  },
];

const STATS = [
  { value: "100%", label: "Data ownership",  color: "#00ff88" },
  { value: "0",    label: "Central servers",  color: "#00ccff" },
  { value: "95%",  label: "Revenue to owners",color: "#ffcc00" },
  { value: "ZK",   label: "Verified proofs",  color: "#ff88aa" },
];

export default function Landing() {
  const heroRef   = useRef(null);
  const statsRef  = useRef(null);
  const stepsRef  = useRef(null);
  const ctaRef    = useRef(null);
  const router    = useRouter();
  const { connect, connecting } = useWallet();
  const { isAuthenticated, role } = useAuthStore();

  useEffect(() => {
    // Hero entrance
    const tl = gsap.timeline();
    tl.fromTo(".hero-tag",  { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" })
      .fromTo(".hero-title",{ y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }, "-=0.3")
      .fromTo(".hero-sub",  { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, "-=0.4")
      .fromTo(".hero-ctas", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, "-=0.3")
      .fromTo(".hero-dna",  { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 1, ease: "power2.out" }, "-=0.8");

    // Stats on scroll
    if (statsRef.current) {
      gsap.fromTo(".stat-item",
        { y: 30, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.6, stagger: 0.15,
          scrollTrigger: { trigger: statsRef.current, start: "top 80%" }
        }
      );
    }

    // Steps on scroll
    if (stepsRef.current) {
      gsap.fromTo(".step-card",
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.7, stagger: 0.2,
          scrollTrigger: { trigger: stepsRef.current, start: "top 75%" }
        }
      );
    }

    // CTA
    if (ctaRef.current) {
      gsap.fromTo(ctaRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8,
          scrollTrigger: { trigger: ctaRef.current, start: "top 85%" }
        }
      );
    }

    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  }, []);

  async function handleConnect() {
    const result = await connect();
    if (result) {
      router.push(result.role === "researcher" ? "/researcher/dashboard" : "/dashboard");
    }
  }

  return (
    <>
      <Head>
        <title>GenomeVault — Own Your Genome</title>
        <meta name="description" content="Decentralized genomic data ownership and research marketplace on blockchain." />
      </Head>

      <Navbar />

      <main className="min-h-screen grid-bg">
        {/* ── HERO ── */}
        <section className="relative min-h-screen flex items-center pt-16">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-20">
            {/* Left */}
            <div>
              <div className="hero-tag inline-flex items-center gap-2 border border-gv-green/30 px-3 py-1.5 mb-8">
                <div className="w-1.5 h-1.5 bg-gv-green rounded-full animate-pulse" />
                <span className="font-mono text-xs text-gv-green tracking-widest">DECENTRALIZED · SECURE · YOURS</span>
              </div>

              <h1 className="hero-title font-heading text-5xl lg:text-7xl font-bold leading-none mb-6">
                <span className="text-white block">YOUR GENOME.</span>
                <span className="neon-text block">YOUR DATA.</span>
                <span className="text-gv-muted block text-4xl lg:text-5xl">YOUR EARNINGS.</span>
              </h1>

              <p className="hero-sub font-mono text-sm text-gv-muted leading-relaxed max-w-lg mb-10">
                GenomeVault is a blockchain-powered platform where you own your genomic data,
                control who accesses it, and earn rewards when researchers study it.
                No middlemen. No hidden data brokers. Zero-knowledge verified.
              </p>

              <div className="hero-ctas flex flex-wrap gap-4">
                {isAuthenticated() ? (
                  <Link
                    href={role === "researcher" ? "/researcher/dashboard" : "/dashboard"}
                    className="btn-primary"
                  >
                    GO TO DASHBOARD
                  </Link>
                ) : (
                  <button onClick={handleConnect} disabled={connecting} className="btn-primary">
                    {connecting ? "CONNECTING..." : "CONNECT WALLET & START"}
                  </button>
                )}
                <Link href="/researcher/signup" className="btn-ghost">
                  RESEARCHER SIGNUP
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="mt-8 flex flex-wrap gap-4">
                {["MetaMask Auth", "IPFS Storage", "Polygon Network", "ZK Proofs"].map(t => (
                  <span key={t} className="font-mono text-xs text-gv-muted border border-gv-border px-2 py-1">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right – DNA animation */}
            <div className="hero-dna flex justify-center lg:justify-end">
              <div className="relative">
                <div className="absolute inset-0 bg-gv-green/5 blur-3xl rounded-full" />
                <DNAHelix height={480} />
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
            <span className="font-mono text-xs text-gv-muted tracking-widest">SCROLL</span>
            <div className="w-px h-8 bg-gv-green animate-bounce" />
          </div>
        </section>

        {/* ── STATS ── */}
        <section ref={statsRef} className="py-16 border-y border-gv-border">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(s => (
              <div key={s.label} className="stat-item text-center">
                <div className="font-heading text-5xl font-bold mb-2" style={{ color: s.color }}>
                  {s.value}
                </div>
                <div className="font-mono text-xs text-gv-muted tracking-widest uppercase">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" ref={stepsRef} className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="font-mono text-xs text-gv-green tracking-widest mb-3">THE PROCESS</p>
              <h2 className="font-heading text-4xl font-bold text-white">How GenomeVault works</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {STEPS.map((step) => (
                <div key={step.n}
                  className="step-card glass-card p-6 hover:border-gv-green/40 transition-all duration-300
                             group cursor-default"
                  onMouseEnter={e => gsap.to(e.currentTarget, { y: -6, duration: 0.3 })}
                  onMouseLeave={e => gsap.to(e.currentTarget, { y:  0, duration: 0.3 })}
                >
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-mono text-3xl font-bold" style={{ color: step.color }}>
                      {step.n}
                    </span>
                    <div className="w-9 h-9 border flex items-center justify-center"
                         style={{ borderColor: step.color + "44" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                           stroke={step.color} strokeWidth="1.5" strokeLinecap="round">
                        <path d={step.icon} />
                      </svg>
                    </div>
                  </div>
                  <h3 className="font-heading text-lg font-bold text-white mb-3">{step.title}</h3>
                  <p className="font-mono text-xs text-gv-muted leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA SECTION ── */}
        <section ref={ctaRef} className="py-24">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="glass-card border-glow p-12">
              <h2 className="font-heading text-4xl font-bold text-white mb-4">
                Ready to own your genome?
              </h2>
              <p className="font-mono text-sm text-gv-muted mb-8 leading-relaxed">
                Connect your MetaMask wallet to start uploading genomic data,
                or sign up as a verified researcher to access the marketplace.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button onClick={handleConnect} disabled={connecting} className="btn-primary">
                  {connecting ? "CONNECTING..." : "CONNECT WALLET"}
                </button>
                <Link href="/researcher/signup" className="btn-ghost">
                  I AM A RESEARCHER
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gv-border py-8">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="font-heading text-lg font-bold text-gv-green tracking-widest">GENOMEVAULT</span>
            <span className="font-mono text-xs text-gv-muted">
              Decentralized · Secure · Patient-owned genomic data
            </span>
          </div>
        </footer>
      </main>
    </>
  );
}
