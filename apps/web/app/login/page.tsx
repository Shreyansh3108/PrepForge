"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";

    try {
      const res = await fetch(`http://localhost:4000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include", // Required for session cookies
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-6 text-center">
          {isLogin ? "Sign in to PrepForge" : "Create an Account"}
        </h1>
        {error && <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-sm font-semibold rounded-lg border border-rose-200">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg disabled:opacity-50">
            {loading ? "Processing..." : isLogin ? "Sign In" : "Register"}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-500 font-medium">
          <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 hover:text-blue-800 font-bold">
            {isLogin ? "Register here" : "Sign in here"}
          </button>
        </div>
      </div>
    </main>
  );
}