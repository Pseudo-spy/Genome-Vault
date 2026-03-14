import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { gsap } from "gsap";
import Navbar from "../../components/layout/Navbar";
import DatasetCard from "../../components/ui/DatasetCard";
import api from "../../utils/api";
import useAuthStore from "../../context/authStore";
import toast from "react-hot-toast";

const SEQUENCING_TYPES = ["All","WGS","WES","SNP-array","RNA-seq","FASTQ","VCF","BAM"];
const ANCESTRIES = ["All","European","South Asian","East Asian","African","Latin American","Middle Eastern"];
const REGIONS    = ["All","India","Europe","East Asia","Sub-Saharan Africa","Americas","Middle East"];

export default function Marketplace() {
  const router  = useRouter();
  const { role, token } = useAuthStore();
  const gridRef = useRef(null);

  const [datasets, setDatasets]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [filters, setFilters]     = useState({ ancestry: "", sequencingType: "", region: "", search: "" });

  useEffect(() => {
    if (!token) { router.push("/researcher/login"); return; }
    if (role !== "researcher") { router.push("/dashboard"); return; }
  }, [token, role]);

  useEffect(() => { fetchDatasets(); }, [page, filters]);

  useEffect(() => {
    if (gridRef.current && !loading) {
      gsap.fromTo(gridRef.current.children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, stagger: 0.05, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [datasets, loading]);

  const fetchDatasets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (filters.ancestry && filters.ancestry !== "All")       params.set("ancestry", filters.ancestry);
      if (filters.sequencingType && filters.sequencingType !== "All") params.set("sequencingType", filters.sequencingType);
      if (filters.region && filters.region !== "All")           params.set("region", filters.region);
      const { data } = await api.get(`/datasets/marketplace?${params}`);
      setDatasets(data.datasets || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Failed to load marketplace");
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key, val) => {
    setPage(1);
    setFilters(f => ({ ...f, [key]: val }));
  };

  return (
    <>
      <Head><title>Dataset Marketplace | GenomeVault</title></Head>
      <div className="min-h-screen bg-gv-black grid-bg">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-heading text-3xl text-gv-green tracking-widest mb-2">GENOMIC MARKETPLACE</h1>
            <p className="font-mono text-gv-muted text-sm">{total} datasets available · All data owner-verified</p>
          </div>

          {/* Filters */}
          <div className="glass-card border-glow p-5 mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-mono text-xs text-gv-muted uppercase tracking-wider mb-2 block">Sequencing Type</label>
              <div className="flex flex-wrap gap-1.5">
                {SEQUENCING_TYPES.map(t => (
                  <button key={t} onClick={() => updateFilter("sequencingType", t === "All" ? "" : t)}
                    className={`px-2.5 py-1 font-mono text-xs border transition-all
                      ${(filters.sequencingType === t || (!filters.sequencingType && t === "All"))
                        ? "border-gv-green text-gv-green bg-gv-green/10"
                        : "border-gv-border text-gv-muted hover:border-gv-green/40"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-mono text-xs text-gv-muted uppercase tracking-wider mb-2 block">Ancestry</label>
              <select value={filters.ancestry} onChange={e => updateFilter("ancestry", e.target.value)}
                className="gv-input text-sm bg-gv-panel">
                {ANCESTRIES.map(a => <option key={a} value={a === "All" ? "" : a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="font-mono text-xs text-gv-muted uppercase tracking-wider mb-2 block">Region</label>
              <select value={filters.region} onChange={e => updateFilter("region", e.target.value)}
                className="gv-input text-sm bg-gv-panel">
                {REGIONS.map(r => <option key={r} value={r === "All" ? "" : r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card p-5 animate-pulse h-56">
                  <div className="h-3 bg-gv-border rounded mb-3 w-2/3" />
                  <div className="h-3 bg-gv-border rounded mb-2 w-1/2" />
                  <div className="h-20 bg-gv-border rounded mt-4" />
                </div>
              ))}
            </div>
          ) : datasets.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <p className="font-heading text-2xl text-gv-muted mb-3">No datasets found</p>
              <p className="font-mono text-sm text-gv-muted">Try adjusting your filters</p>
            </div>
          ) : (
            <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {datasets.map(d => (
                <DatasetCard key={d._id} dataset={d} onRequested={fetchDatasets} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > 12 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-4 py-2 border border-gv-border font-mono text-sm text-gv-muted hover:border-gv-green hover:text-gv-green disabled:opacity-40 transition-all">
                ← Prev
              </button>
              <span className="font-mono text-sm text-gv-muted">Page {page} of {Math.ceil(total / 12)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 12)}
                className="px-4 py-2 border border-gv-border font-mono text-sm text-gv-muted hover:border-gv-green hover:text-gv-green disabled:opacity-40 transition-all">
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
