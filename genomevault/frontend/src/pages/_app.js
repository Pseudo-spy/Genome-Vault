import "../styles/globals.css";
import { Toaster } from "react-hot-toast";
import { useEffect, useState } from "react";

export default function App({ Component, pageProps }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("accountsChanged", () => {
        localStorage.removeItem("gv-auth");
        window.location.href = "/";
      });
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
  }, []);

  if (!mounted) return null;

  return (
    <>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#0f1f0f",
            color: "#c8e6c9",
            border: "1px solid rgba(0,255,136,0.2)",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "13px",
          },
          success: { iconTheme: { primary: "#00ff88", secondary: "#050a05" } },
          error:   { iconTheme: { primary: "#ff4444", secondary: "#050a05" } },
        }}
      />
    </>
  );
}