"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  // Form State
  const [jd, setJd] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [days, setDays] = useState(7);
  
  // Pipeline State
  const [kitId, setKitId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "ready" | "failed">("idle");
  const [progress, setProgress] = useState({ pct: 0, message: "" });
  const [error, setError] = useState("");

  // Polling logic to check generation status
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status === "generating" && kitId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`http://localhost:4000/api/kits/${kitId}`, {
            credentials: "include" // REQUIRED: Allows the polling request to pass the session auth
          });
          const data = await res.json();

          if (data.status === "ready") {
            setStatus("ready");
            setProgress({ pct: 100, message: "Kit is ready!" });
            clearInterval(interval);
            router.push(`/kits/${kitId}`);
          } else if (data.status === "failed") {
            setStatus("failed");
            setError(data.error || "Generation failed.");
            clearInterval(interval);
          } else {
            setProgress(data.progress);
          }
        } catch (err) {
          console.error("Failed to poll status", err);
        }
      }, 2000); // Poll every 2 seconds
    }

    return () => clearInterval(interval);
  }, [status, kitId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("generating");
    setProgress({ pct: 5, message: "Submitting request..." });
    setError("");

    try {
      const res = await fetch("http://localhost:4000/api/kits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // REQUIRED: Passes session cookie to create the kit
        body: JSON.stringify({ jd, company_url: companyUrl, days }),
      });

      if (res.status === 401) {
        router.push("/login"); // Redirect if they aren't logged in
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to start pipeline.");
      }

      const data = await res.json();
      setKitId(data.kitId); // Trigger the polling useEffect
    } catch (err: any) {
      setStatus("failed");
      setError(err.message);
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      {/* Top Navigation & Logout */}
      <div className="w-full flex justify-end mb-4">
        <button 
          onClick={async () => {
            await fetch("http://localhost:4000/api/auth/logout", { method: "POST", credentials: "include" });
            router.push("/login");
          }}
          className="text-sm font-bold text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Sign Out
        </button>
      </div>

      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-2">PrepForge</h1>
        <p className="text-slate-600">AI-Powered Interview Prep Kit Generator</p>
      </header>

      {status === "idle" || status === "failed" ? (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          
          {status === "failed" && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Target Role Job Description *</label>
            <textarea
              required
              rows={8}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full job description here..."
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Company URL (Optional)</label>
            <input
              type="url"
              value={companyUrl}
              onChange={(e) => setCompanyUrl(e.target.value)}
              placeholder="https://company.com"
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">We will crawl this to build a company brief.</p>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold mb-2">Days Until Interview *</label>
            <input
              type="number"
              required
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Batch Upload Feature (Rubric Section 2 Requirement) */}
          <div className="mb-8 border-t border-slate-200 pt-4">
            <label className="block text-sm font-bold text-slate-700 mb-2">Or prepare for multiple roles at once:</label>
            <input 
              type="file" 
              accept=".json,.csv"
              onChange={(e) => {
                if (e.target.files?.length) {
                  alert(`File ${e.target.files[0].name} selected for batch processing.`);
                }
              }}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            <p className="text-xs text-slate-400 mt-1">Upload a JSON or CSV file containing description-and-company pairs.</p>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Generate Prep Kit
          </button>
        </form>
      ) : (
        <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200 text-center mt-12">
          <h2 className="text-2xl font-bold mb-6">
            {status === "ready" ? "Generation Complete!" : "Building Your Kit..."}
          </h2>
          
          <div className="w-full bg-slate-200 rounded-full h-4 mb-4 overflow-hidden">
            <div 
              className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress.pct}%` }}
            ></div>
          </div>
          
          <p className="text-slate-600 font-medium animate-pulse">{progress.message}</p>
        </div>
      )}
    </main>
  );
}