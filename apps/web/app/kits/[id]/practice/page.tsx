"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function PracticeMode() {
  const { id } = useParams();
  const router = useRouter();
  
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  // Confidence tracking
  const [confidenceScores, setConfidenceScores] = useState<{ id: string, score: number, front: string }[]>([]);

  const defaultFCs = [
    { id: "fc1", front: "What is the primary difference between SQL and NoSQL databases?", back: "SQL databases use strict relational tables and schemas. NoSQL databases store data in flexible, JSON-like documents." },
    { id: "fc2", front: "Explain Server-Side Rendering (SSR) in Next.js.", back: "SSR generates the HTML for a page on the server for each request. This improves SEO and initial load times." },
    { id: "fc3", front: "What is the purpose of an Index in MongoDB?", back: "An index is a specific data structure that improves the speed of read queries at the cost of slightly slower write speeds and increased storage space." }
  ];

  useEffect(() => {
    async function fetchKit() {
      try {
        const res = await fetch(`http://localhost:4000/api/kits/${id}`, {
          credentials: "include", // REQUIRED: Passes session cookie
          cache: "no-store"       // REQUIRED: Busts Next.js aggressive caching
        });
        
        if (res.status === 401) {
          router.push("/login");
          return;
        }

        const data = await res.json();
        
        let cards = data.flashcards || [];
        if (cards.data) cards = cards.data;
        
        // If empty, force the default flashcards
        if (!Array.isArray(cards) || cards.length === 0) {
           cards = defaultFCs;
        }
        
        // Ensure all cards have an ID for tracking
        cards = cards.map((c: any, i: number) => ({ ...c, id: c.id || `card-${i}` }));
        
        setFlashcards(cards);
      } catch (err) {
        console.error("Failed to load flashcards");
        setFlashcards(defaultFCs);
      } finally {
        setLoading(false);
      }
    }
    fetchKit();
  }, [id, router]);

  const handleScore = (score: number) => {
    const currentCard = flashcards[currentIndex];
    
    setConfidenceScores(prev => {
      const existing = prev.filter(p => p.id !== currentCard.id);
      return [...existing, { id: currentCard.id, score, front: currentCard.front }];
    });
    
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      setIsFinished(true);
    }
  };

  const startNextSession = () => {
    const sortedCards = [...flashcards].sort((a, b) => {
      const scoreA = confidenceScores.find(c => c.id === a.id)?.score || 3;
      const scoreB = confidenceScores.find(c => c.id === b.id)?.score || 3;
      return scoreA - scoreB; // Lower score (Hard = 1) comes first
    });
    
    setFlashcards(sortedCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">Loading practice session...</div>;

  if (isFinished) {
    const hardCards = confidenceScores.filter(c => c.score === 1);
    
    return (
      <main className="max-w-4xl mx-auto p-10 text-center space-y-8">
        <h1 className="text-4xl font-extrabold text-slate-900">Session Complete! 🎉</h1>
        
        {/* CREATIVITY FEATURE: Weak Spots Analyzer */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-left">
          <h2 className="text-xl font-bold text-slate-900 mb-4 border-b pb-2">🧠 Weak Spots Analysis</h2>
          {hardCards.length > 0 ? (
            <div className="space-y-4">
              <p className="text-slate-600">Based on your session, we recommend prioritizing these concepts before your interview:</p>
              <ul className="list-disc pl-5 space-y-2 text-rose-700 font-medium">
                {hardCards.map((card, idx) => (
                  <li key={idx}>{card.front}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-emerald-700 font-medium">Excellent work! You didn't mark any cards as 'Hard'. You are well-prepared across all concepts.</p>
          )}
        </div>

        <div className="flex justify-center gap-4 pt-6">
          <button onClick={startNextSession} className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">
            Start Round 2 (Focus on Weak Spots)
          </button>
          <Link href={`/kits/${id}`} className="px-6 py-3 bg-blue-100 text-blue-800 font-bold rounded-xl hover:bg-blue-200 transition-colors">
            Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <main className="max-w-3xl mx-auto p-6 md:p-10 space-y-8 flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-4">
        <Link href={`/kits/${id}`} className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">← Exit Practice</Link>
        <div className="text-sm font-bold text-slate-400">Card {currentIndex + 1} of {flashcards.length}</div>
      </div>

      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-8">
        <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${((currentIndex) / flashcards.length) * 100}%` }}></div>
      </div>

      <div onClick={() => setIsFlipped(!isFlipped)} className="w-full min-h-[300px] cursor-pointer perspective-1000">
        <div className={`relative w-full h-full min-h-[300px] bg-white rounded-2xl border-2 shadow-sm p-10 flex flex-col items-center justify-center text-center transition-all duration-300 ${isFlipped ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:shadow-md'}`}>
          <span className="absolute top-6 right-6 text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">Click to flip ↺</span>
          <h2 className={`text-2xl font-bold leading-relaxed ${isFlipped ? 'text-blue-900' : 'text-slate-800'}`}>
            {isFlipped ? currentCard.back : currentCard.front}
          </h2>
        </div>
      </div>

      <div className={`w-full flex justify-center gap-4 transition-opacity duration-300 ${isFlipped ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <button onClick={() => handleScore(1)} className="px-6 py-3 bg-rose-100 text-rose-700 hover:bg-rose-200 font-bold rounded-xl transition-colors">Hard</button>
        <button onClick={() => handleScore(2)} className="px-6 py-3 bg-amber-100 text-amber-700 hover:bg-amber-200 font-bold rounded-xl transition-colors">Good</button>
        <button onClick={() => handleScore(3)} className="px-6 py-3 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold rounded-xl transition-colors">Easy</button>
      </div>
    </main>
  );
}