"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function KitPage() {
  const { id } = useParams();
  const [kit, setKit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"questions" | "flashcards" | "schedule">("questions");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchKit() {
      try {
        const res = await fetch(`https://prepforge-hyt9.onrender.com/api/kits/${id}`, {
        credentials: "include"
        });
        const data = await res.json();
        setKit(data);
      } catch (err) {
        console.error("Failed to load kit", err);
      } finally {
        setLoading(false);
      }
    }
    fetchKit();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading interview kit...
      </div>
    );
  }

  if (!kit || kit.status === "failed") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Failed to load kit</h1>
        <p className="text-slate-600 mb-6">{kit?.error || "Kit not found."}</p>
        <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Create New Kit</Link>
      </div>
    );
  }

  const filteredQuestions = activeCategory === "all"
    ? kit.questions
    : kit.questions?.filter((q: any) => q.category === activeCategory);

  return (
    <main className="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <Link href="/" className="text-sm font-medium text-blue-600 hover:underline mb-2 inline-block">
            ← Generate another kit
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900">{kit.role?.title || "Role Interview Kit"}</h1>
          <p className="text-slate-600 font-medium">
            {kit.source?.company} • {kit.role?.seniority} Level • {kit.schedule?.days_available} Day Plan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
            {kit.coverage?.passes} Generation {kit.coverage?.passes === 1 ? "Pass" : "Passes"}
          </span>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
            {kit.questions?.length || 0} Questions Ready
          </span>
        </div>
      </div>

      {/* Company Brief & Role Requirements Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Company Brief</h2>
          <p className="text-sm text-slate-700 mb-4">{kit.company_brief?.what_they_do}</p>
          <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-100">
            "{kit.company_brief?.summary}"
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Requirements Targeted</h2>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
            {kit.role?.requirements?.map((req: any) => (
              <span
                key={req.id}
                className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                  req.priority === "must"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                [{req.priority.toUpperCase()}] {req.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        {(["questions", "flashcards", "schedule"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 capitalize transition-colors ${
              activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab 1: Questions */}
      {activeTab === "questions" && (
        <div className="space-y-4">
          <div className="flex gap-2 pb-2 overflow-x-auto text-xs">
            {["all", "technical", "system-design", "behavioural", "company-fit"].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full capitalize font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {cat.replace("-", " ")}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredQuestions?.map((q: any) => (
              <div key={q.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                      {q.category}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Difficulty: {"★".repeat(q.difficulty)}{"☆".repeat(3 - q.difficulty)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{q.requirement_ids?.join(", ")}</span>
                </div>
                <h3 className="font-semibold text-slate-900 text-base">{q.prompt}</h3>
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  <strong className="block text-slate-800 mb-1">Answer Outline / Key Points:</strong>
                  {q.answer_outline}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Flashcards */}
      {activeTab === "flashcards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {kit.flashcards?.map((fc: any) => {
            const isFlipped = flippedCardId === fc.id;
            return (
              <div
                key={fc.id}
                onClick={() => setFlippedCardId(isFlipped ? null : fc.id)}
                className="cursor-pointer h-48 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all"
              >
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                  <span>{isFlipped ? "Answer" : "Question"}</span>
                  <span className="text-blue-500">Click to flip ↺</span>
                </div>
                <div className="text-sm font-medium text-slate-800 my-auto text-center">
                  {isFlipped ? fc.back : fc.front}
                </div>
                <div className="text-[10px] text-slate-400 text-right font-mono">
                  {fc.requirement_ids?.join(", ")}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: Schedule */}
      {activeTab === "schedule" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                <th className="p-4">Day</th>
                <th className="p-4">Focus Area</th>
                <th className="p-4">Questions Count</th>
                <th className="p-4 text-right">Est. Minutes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {kit.schedule?.days?.map((d: any) => (
                <tr key={d.day} className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-900">Day {d.day}</td>
                  <td className="p-4 font-medium text-slate-700">{d.focus}</td>
                  <td className="p-4 text-slate-600">{d.question_ids?.length || 0} questions</td>
                  <td className="p-4 text-right font-mono text-slate-700 font-semibold">{d.minutes}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}