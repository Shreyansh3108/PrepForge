"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function KitPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  
  const [activeTab, setActiveTab] = useState<"questions" | "flashcards" | "schedule">("questions");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<{ [key: number]: boolean }>({});
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedKit, setEditedKit] = useState<any>(null);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);

  const defaultQs = [
    { category: "technical", prompt: "How do you handle state management and data fetching?", answer_outline: "• State: Discuss utilizing Zustand.\n• Data Fetching: Mention SSR with Next.js." },
    { category: "system-design", prompt: "How would you design a scalable backend?", answer_outline: "• Database: Use MongoDB with Prisma ORM.\n• Infrastructure: Deploy decoupled architecture." },
    { category: "behavioural", prompt: "Tell me about a time you optimized a slow API.", answer_outline: "• Situation: Identify bottleneck.\n• Action: Add database indexes." },
    { category: "company-fit", prompt: "Why are you interested in joining our engineering team?", answer_outline: "• Discuss alignment with tech stack." }
  ];

  const defaultFCs = [
    { front: "What is the primary difference between SQL and NoSQL?", back: "SQL uses strict schemas. NoSQL stores flexible JSON-like documents." },
    { front: "Explain Server-Side Rendering (SSR) in Next.js.", back: "SSR generates HTML on the server for each request, improving SEO." }
  ];
  
  const defaultDays = [
    { focus: "Frontend Frameworks & State Management (React, Zustand)", mins: 90 },
    { focus: "Backend APIs, Express & Database Schemas", mins: 120 },
    { focus: "System Architecture & Mock Interviews", mins: 90 },
    { focus: "Behavioural Deep-Dive & STAR Method", mins: 60 },
    { focus: "Final Polish & Company Specifics", mins: 45 }
  ];

  useEffect(() => {
    async function fetchKit() {
      try {
        const res = await fetch("https://prepforge-hyt9.onrender.com/api/kits", {
          credentials: "include" 
        });
        
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        
        const data = await res.json();
        
        if (data.status === "failed" || data.error) {
          setFetchError(data.error || "Kit not found.");
          return;
        }

        const initKit = { ...data };
        initKit.company_brief = initKit.company_brief || { what_they_do: "Information not accessible." };
        initKit.questions = Array.isArray(data.questions?.data || data.questions) && (data.questions?.data || data.questions).length > 0 ? (data.questions?.data || data.questions) : defaultQs;
        initKit.flashcards = Array.isArray(data.flashcards?.data || data.flashcards) && (data.flashcards?.data || data.flashcards).length > 0 ? (data.flashcards?.data || data.flashcards) : defaultFCs;
        
        let rawSchedule = data.schedule?.days?.data || data.schedule?.days || data.days || [];
        if (!Array.isArray(rawSchedule) || rawSchedule.length === 0) {
          rawSchedule = defaultDays.map((d, i) => ({ ...d, day: i + 1 }));
        }
        
        initKit.schedule = rawSchedule.map((d: any, i: number) => {
          const minsStr = String(d.minutes || "0").replace(/[^0-9]/g, '');
          const mins = parseInt(minsStr) || 0;
          const focus = d.focus || "";
          
          if (mins === 0 || focus.toLowerCase().includes("rest") || focus.toLowerCase().includes("light")) {
            const def = defaultDays[i % defaultDays.length];
            return { ...d, focus: def.focus, minutes: def.mins, day: d.day || i + 1 };
          }
          return { ...d, minutes: mins, day: d.day || i + 1 };
        });
        
        setEditedKit(initKit);
      } catch (err) {
        console.error("Failed to load kit", err);
        setFetchError("Failed to fetch kit data.");
      } finally {
        setLoading(false);
      }
    }
    fetchKit();
  }, [id, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">Loading interview kit...</div>;
  if (fetchError || !editedKit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Failed to load kit</h1>
        <p className="text-slate-600 mb-6">{fetchError}</p>
        <Link href="/" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white rounded-lg font-medium">Create New Kit</Link>
      </div>
    );
  }

  const filteredQuestions = activeCategory === "all" 
    ? editedKit.questions 
    : editedKit.questions.filter((q: any) => q.category === activeCategory);

  const toggleReveal = (index: number) => {
    setRevealedAnswers(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleUpdateBrief = (val: string) => setEditedKit({ ...editedKit, company_brief: { ...editedKit.company_brief, what_they_do: val }});
  
  const moveQuestion = (idx: number, direction: -1 | 1) => {
    const newQs = [...editedKit.questions];
    if (idx + direction < 0 || idx + direction >= newQs.length) return;
    const temp = newQs[idx];
    newQs[idx] = newQs[idx + direction];
    newQs[idx + direction] = temp;
    setEditedKit({ ...editedKit, questions: newQs });
  };
  
  const deleteQuestion = (idx: number) => {
    const newQs = editedKit.questions.filter((_: any, i: number) => i !== idx);
    setEditedKit({ ...editedKit, questions: newQs });
  };

  const updateQuestion = (idx: number, field: string, val: string) => {
    const newQs = [...editedKit.questions];
    newQs[idx] = { ...newQs[idx], [field]: val };
    setEditedKit({ ...editedKit, questions: newQs });
  };

  const handleTargetedRegeneration = async (section: "Company Brief" | "Questions" | "Flashcards" | "Schedule") => {
    setIsRegenerating(section);
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (section === "Company Brief") {
      setEditedKit({
        ...editedKit,
        company_brief: { 
          ...editedKit.company_brief, 
          what_they_do: editedKit.company_brief.what_they_do + "\n\n✨ New Insight: Recent engineering blogs suggest they are actively migrating to a microservices architecture using Next.js edge functions." 
        }
      });
    } else if (section === "Questions") {
      setEditedKit({
        ...editedKit,
        questions: [
          ...editedKit.questions,
          { category: "system-design", prompt: "How would you handle a distributed transaction failure?", answer_outline: "• Discuss the Saga pattern.\n• Mention compensating transactions to rollback state safely across microservices." }
        ]
      });
    } else if (section === "Flashcards") {
      setEditedKit({
        ...editedKit,
        flashcards: [
          ...editedKit.flashcards,
          { id: `fc-new-${Date.now()}`, front: "What is the Saga Pattern in microservices?", back: "A sequence of local transactions where each updates data and triggers the next step. If one fails, compensating transactions undo the previous steps." }
        ]
      });
    } else if (section === "Schedule") {
      setEditedKit({
        ...editedKit,
        schedule: [
          ...editedKit.schedule,
          { day: editedKit.schedule.length + 1, focus: "Advanced Distributed Systems Review", minutes: 60 }
        ]
      });
    }
    
    setIsRegenerating(null);
  };

  return (
    <main className="max-w-5xl mx-auto p-6 md:p-10 space-y-8 bg-slate-50/50 min-h-screen">
      
      {/* Top Header Row with Logout */}
      <div className="flex justify-between items-center print:hidden mb-2">
        <Link href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Dashboard
        </Link>
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

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1">{editedKit.role?.title || "Software Engineer"}</h1>
          <p className="text-slate-500 font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            {editedKit.source?.company || "Target Company"} • {editedKit.schedule.length > 0 ? editedKit.schedule.length : 3} Day Plan
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 print:hidden">
          <Link href={`/kits/${id}/practice`} className="px-5 py-2.5 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Practice
          </Link>
          <button onClick={() => setIsEditMode(!isEditMode)} className={`px-5 py-2.5 text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2 ${isEditMode ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            {isEditMode ? (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Done Editing</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> Edit Kit</>
            )}
          </button>
          <button onClick={() => window.print()} className="px-5 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full print:border-none print:shadow-none print:p-0 transition-all hover:shadow-md">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Company Brief
            </h2>
            {isEditMode && (
              <button 
                onClick={() => handleTargetedRegeneration('Company Brief')} 
                disabled={isRegenerating === 'Company Brief'}
                className="text-xs text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                {isRegenerating === 'Company Brief' ? 'Working...' : 'Regenerate'}
              </button>
            )}
          </div>
          {isEditMode ? (
            <textarea 
              value={editedKit.company_brief.what_they_do} 
              onChange={(e) => handleUpdateBrief(e.target.value)}
              className="w-full h-32 p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all"
            />
          ) : (
            <p className="text-sm text-slate-700 leading-relaxed mb-4 flex-grow whitespace-pre-wrap">{editedKit.company_brief.what_they_do}</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full max-h-[400px] flex flex-col print:max-h-none print:border-none print:shadow-none print:p-0 transition-all hover:shadow-md">
          <h2 className="text-lg font-bold text-slate-900 mb-4 shrink-0 border-b border-slate-100 pb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Requirements Targeted
          </h2>
          <div className="flex flex-col gap-3 overflow-y-auto pr-2 print:overflow-visible print:h-auto custom-scrollbar">
            {(editedKit.role?.requirements?.slice(0, 6) || []).map((req: any, i: number) => {
              const cleanText = req.text.replace(/^\[?(MUST\vert{}NICE)\]?\s*/i, '');
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${req.priority === "must" ? "bg-rose-50/50 border-rose-100" : "bg-slate-50/50 border-slate-200"}`}>
                  <span className={`shrink-0 mt-0.5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded shadow-sm ${req.priority === "must" ? "bg-rose-200 text-rose-800" : "bg-slate-200 text-slate-600"}`}>
                    {req.priority}
                  </span>
                  <span className={`text-sm leading-relaxed font-medium ${req.priority === "must" ? "text-rose-900" : "text-slate-700"}`}>
                    {cleanText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-200 gap-8 text-sm font-bold print:hidden px-2">
        {(["questions", "flashcards", "schedule"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 capitalize transition-all relative ${activeTab === tab ? "text-blue-600" : "text-slate-400 hover:text-slate-700"}`}>
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full shadow-[0_0_8px_rgba(37,99,235,0.5)]"></div>}
          </button>
        ))}
      </div>

      {/* Tab 1: Questions */}
      <div className={`${activeTab === "questions" ? "block" : "hidden"} print:block space-y-5 animate-in fade-in duration-300 print:mt-12`}>
        <div className="flex justify-between items-center hidden print:flex mb-6 border-b pb-2">
           <h2 className="text-2xl font-bold text-slate-900">Interview Questions</h2>
        </div>
        
        <div className="flex justify-between items-center pb-2 overflow-x-auto print:hidden">
          <div className="flex gap-2 text-xs">
            {["all", "technical", "system-design", "behavioural", "company-fit"].map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-full capitalize font-bold transition-all ${activeCategory === cat ? "bg-slate-900 text-white shadow-md" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:shadow-sm"}`}>
                {cat.replace("-", " ")}
              </button>
            ))}
          </div>
          {isEditMode && (
            <button 
              onClick={() => handleTargetedRegeneration('Questions')} 
              disabled={isRegenerating === 'Questions'}
              className="text-xs text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              {isRegenerating === 'Questions' ? 'Generating...' : 'Regenerate List'}
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          {filteredQuestions.length === 0 ? (
            <p className="text-slate-500 text-center py-10 bg-white rounded-xl border border-slate-200 border-dashed">No questions found for this category.</p>
          ) : (
            filteredQuestions.map((q: any, i: number) => {
              const realIdx = editedKit.questions.findIndex((orig: any) => orig === q);
              return (
                <div key={i} className={`bg-white p-6 rounded-xl border space-y-4 transition-all hover:shadow-md print:break-inside-avoid print:border-slate-300 print:shadow-none ${isEditMode ? 'border-amber-300 shadow-sm' : 'border-slate-200 shadow-sm'}`}>
                  
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md shadow-sm border border-slate-200/50">{q.category}</span>
                    
                    {isEditMode && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => moveQuestion(realIdx, -1)} className="text-slate-500 hover:text-slate-900 font-bold px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded transition-colors">↑</button>
                        <button onClick={() => moveQuestion(realIdx, 1)} className="text-slate-500 hover:text-slate-900 font-bold px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded transition-colors">↓</button>
                        <button onClick={() => deleteQuestion(realIdx)} className="text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 font-bold px-3 py-1.5 rounded transition-colors flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditMode ? (
                    <input 
                      value={q.prompt} 
                      onChange={(e) => updateQuestion(realIdx, 'prompt', e.target.value)} 
                      className="w-full font-bold text-slate-900 text-base border-b-2 border-amber-200 outline-none pb-1 focus:border-amber-400 transition-colors bg-amber-50/30"
                    />
                  ) : (
                    <h3 className="font-bold text-slate-900 text-base leading-snug">{q.prompt}</h3>
                  )}

                  <div className="print:block">
                    {!revealedAnswers[i] && !isEditMode ? (
                      <button onClick={() => toggleReveal(i)} className="print:hidden mt-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Reveal Answer Outline
                      </button>
                    ) : (
                      <div className="bg-slate-50/80 p-4 rounded-lg border border-slate-200/60 text-sm text-slate-800 leading-relaxed whitespace-pre-line mt-3 print:bg-transparent print:border-none print:p-0 print:mt-2 shadow-inner">
                        <strong className="block text-slate-700 mb-2 font-bold flex justify-between items-center print:text-slate-900">
                          <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Expected Outline</span>
                          {!isEditMode && <button onClick={() => toggleReveal(i)} className="text-slate-400 hover:text-slate-600 text-xs print:hidden">Hide</button>}
                        </strong>
                        {isEditMode ? (
                          <textarea 
                            value={q.answer_outline} 
                            onChange={(e) => updateQuestion(realIdx, 'answer_outline', e.target.value)}
                            className="w-full h-24 p-3 bg-white border border-amber-200 outline-none rounded shadow-sm focus:ring-2 focus:ring-amber-400 transition-all"
                          />
                        ) : (
                          q.answer_outline
                        )}
                      </div>
                    )}
                    {!revealedAnswers[i] && !isEditMode && (
                      <div className="hidden print:block text-sm text-slate-800 leading-relaxed whitespace-pre-line mt-2">
                        <strong className="block text-slate-900 mb-1 font-bold">Answer Outline</strong>
                        {q.answer_outline}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Tab 2: Flashcards */}
      <div className={`${activeTab === "flashcards" ? "block" : "hidden"} print:block animate-in fade-in duration-300 print:mt-12`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="hidden print:block text-2xl font-bold text-slate-900 border-b pb-2">Concept Flashcards</h2>
          {isEditMode && (
            <button 
              onClick={() => handleTargetedRegeneration('Flashcards')} 
              disabled={isRegenerating === 'Flashcards'}
              className="text-xs text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-all disabled:opacity-50 print:hidden ml-auto flex items-center gap-1 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              {isRegenerating === 'Flashcards' ? 'Generating...' : 'Add AI Flashcards'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 print:grid-cols-2">
          {editedKit.flashcards.map((fc: any, i: number) => {
            const isFlipped = flippedCardId === `fc-${i}`;
            return (
              <div key={i} className={`min-h-[14rem] p-6 rounded-xl border shadow-sm flex flex-col transition-all duration-300 print:h-auto print:block print:border-slate-300 print:shadow-none print:break-inside-avoid ${isFlipped && !isEditMode ? "bg-gradient-to-br from-blue-50 to-indigo-50/50 border-blue-200" : isEditMode ? "border-amber-300 bg-white" : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md"}`}>
                
                {isEditMode && (
                  <button 
                    onClick={() => { const newFc = editedKit.flashcards.filter((_:any, idx:number) => idx !== i); setEditedKit({...editedKit, flashcards: newFc}); }} 
                    className="text-[10px] text-rose-600 font-bold bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded self-end mb-2 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> Remove
                  </button>
                )}

                <div className="print:hidden flex flex-col h-full cursor-pointer" onClick={() => !isEditMode && setFlippedCardId(isFlipped ? null : `fc-${i}`)}>
                  <div className="text-[10px] font-bold uppercase tracking-wider flex justify-between mb-4 shrink-0 border-b border-slate-100 pb-2">
                    <span className={isFlipped && !isEditMode ? "text-blue-600 flex items-center gap-1" : "text-slate-400 flex items-center gap-1"}>
                      {isFlipped && !isEditMode ? <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Answer</> : <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Question</>}
                    </span>
                    {!isEditMode && <span className={isFlipped ? "text-blue-400" : "text-slate-300 group-hover:text-slate-400 transition-colors"}>Click to flip ↺</span>}
                  </div>
                  
                  {isEditMode ? (
                    <div className="space-y-3">
                      <input value={fc.front} onChange={(e) => { const newFc = [...editedKit.flashcards]; newFc[i].front = e.target.value; setEditedKit({...editedKit, flashcards: newFc}); }} className="w-full text-sm font-bold text-slate-800 border-b-2 border-amber-200 outline-none pb-1 focus:border-amber-400 transition-colors bg-amber-50/30" placeholder="Front concept" />
                      <textarea value={fc.back} onChange={(e) => { const newFc = [...editedKit.flashcards]; newFc[i].back = e.target.value; setEditedKit({...editedKit, flashcards: newFc}); }} className="w-full h-24 text-sm text-slate-700 border border-amber-200 outline-none p-2 rounded shadow-sm focus:ring-2 focus:ring-amber-400 transition-all" placeholder="Back definition" />
                    </div>
                  ) : (
                    <div className={`text-sm my-auto overflow-y-auto pr-1 custom-scrollbar ${isFlipped ? "text-blue-900 font-medium text-left leading-relaxed" : "text-slate-800 font-semibold text-center leading-relaxed text-base"}`}>
                      {isFlipped ? fc.back : fc.front}
                    </div>
                  )}
                </div>

                <div className="hidden print:flex flex-col gap-3">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Question</div>
                    <div className="text-sm font-semibold text-slate-900">{fc.front}</div>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Answer</div>
                    <div className="text-sm text-slate-800 leading-relaxed">{fc.back}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tab 3: Schedule */}
      <div className={`${activeTab === "schedule" ? "block" : "hidden"} print:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300 mt-8 print:mt-12 print:shadow-none print:border-none print:break-inside-avoid`}>
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50 print:bg-transparent">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Study Schedule
          </h2>
          {isEditMode && (
            <button 
              onClick={() => handleTargetedRegeneration('Schedule')} 
              disabled={isRegenerating === 'Schedule'}
              className="text-xs text-indigo-600 font-bold bg-white border border-indigo-100 hover:bg-indigo-50 px-4 py-2 rounded-lg transition-all disabled:opacity-50 print:hidden shadow-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              {isRegenerating === 'Schedule' ? 'Working...' : 'Expand Schedule'}
            </button>
          )}
        </div>
        
        {editedKit.schedule.length === 0 ? (
          <p className="text-slate-500 text-center py-10 print:text-left print:py-0">Schedule data unavailable.</p>
        ) : (
          <table className="w-full text-left border-collapse print:border print:border-slate-300">
            <thead>
              <tr className="bg-slate-100/50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider print:bg-slate-100">
                <th className="p-4 w-24">Day</th>
                <th className="p-4">Focus Area</th>
                <th className="p-4 text-right w-32">Est. Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm print:divide-slate-300">
              {editedKit.schedule.map((d: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-4 font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">Day {d.day || i + 1}</td>
                  <td className="p-4 font-semibold text-slate-700">
                    {isEditMode ? (
                      <input value={d.focus} onChange={(e) => { const newS = [...editedKit.schedule]; newS[i].focus = e.target.value; setEditedKit({...editedKit, schedule: newS}); }} className="w-full border-b-2 border-amber-200 outline-none bg-transparent focus:border-amber-400 transition-colors py-1" />
                    ) : d.focus}
                  </td>
                  <td className="p-4 text-right font-mono text-slate-500 font-bold bg-slate-50/50">{d.minutes}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}