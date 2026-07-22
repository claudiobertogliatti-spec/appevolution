import React, { useState, useEffect } from 'react';
import { User, Sparkles, MessageSquare, CheckCircle, Play, ArrowRight, ShieldCheck, Users } from 'lucide-react';

export function MarioRossiSimulation() {
  const [activeStep, setActiveStep] = useState(1);
  const [typedName, setTypedName] = useState('');
  const [typedMethod, setTypedMethod] = useState('');
  const [chipSelected, setChipSelected] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showChat, setShowChat] = useState(false);

  // Step 1 Typing Animation
  useEffect(() => {
    if (activeStep === 1) {
      setTypedName('');
      setTypedMethod('');
      setChipSelected(false);

      const nameText = "Mario Rossi";
      let i = 0;
      const nameInterval = setInterval(() => {
        if (i < nameText.length) {
          setTypedName(nameText.slice(0, i + 1));
          i++;
        } else {
          clearInterval(nameInterval);
          setTimeout(() => {
            setChipSelected(true);
            
            // Start typing method
            const methodText = "Metodo Posturale Integrato & Lifestyle";
            let j = 0;
            const methodInterval = setInterval(() => {
              if (j < methodText.length) {
                setTypedMethod(methodText.slice(0, j + 1));
                j++;
              } else {
                clearInterval(methodInterval);
              }
            }, 40);
          }, 300);
        }
      }, 90);

      return () => {
        clearInterval(nameInterval);
      };
    }
  }, [activeStep]);

  // Step 2 Progress Animation
  useEffect(() => {
    if (activeStep === 2) {
      setProgress(0);
      setShowChat(false);

      const timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer);
            return 100;
          }
          if (prev + 4 >= 75) {
            setShowChat(true);
          }
          return prev + 4;
        });
      }, 50);

      return () => clearInterval(timer);
    }
  }, [activeStep]);

  const handleAutoPlay = () => {
    setActiveStep(1);
    setTimeout(() => {
      setActiveStep(2);
      setTimeout(() => {
        setActiveStep(3);
      }, 3500);
    }, 3500);
  };

  return (
    <div className="mx-auto max-w-4xl w-full">
      {/* Header pill - CIAK Brand Colors */}
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-1.5 text-xs font-bold text-amber-900">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
          Simulazione Reale: Nessuna competenza tecnica richiesta
        </span>
        <h3 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
          Ecco come nasce l'Accademia di Mario Rossi
        </h3>
        <p className="mt-2 text-slate-600 text-sm md:text-base">
          Mario inserisce solo la sua idea. L'AI ed il Team Umano creano l'accademia pronta all'uso.
        </p>
      </div>

      {/* Stepper buttons - Aligned with CIAK Yellow & Slate */}
      <div className="flex justify-center gap-2 md:gap-4 mb-6">
        <button
          onClick={() => setActiveStep(1)}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 ${
            activeStep === 1
              ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className={`h-5 w-5 rounded-full flex items-center justify-center text-xs ${activeStep === 1 ? 'bg-slate-950/10 text-slate-950' : 'bg-slate-100 text-slate-600'}`}>1</span>
          Input Guidato
        </button>

        <button
          onClick={() => setActiveStep(2)}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 ${
            activeStep === 2
              ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className={`h-5 w-5 rounded-full flex items-center justify-center text-xs ${activeStep === 2 ? 'bg-slate-950/10 text-slate-950' : 'bg-slate-100 text-slate-600'}`}>2</span>
          AI + Team Umano
        </button>

        <button
          onClick={() => setActiveStep(3)}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 ${
            activeStep === 3
              ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className={`h-5 w-5 rounded-full flex items-center justify-center text-xs ${activeStep === 3 ? 'bg-slate-950/10 text-slate-950' : 'bg-slate-100 text-slate-600'}`}>3</span>
          Accademia Pronta
        </button>
      </div>

      {/* Interactive Mac-like window */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden min-h-[420px] flex flex-col">
        {/* Top bar */}
        <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400"></div>
            <div className="h-3 w-3 rounded-full bg-amber-400"></div>
            <div className="h-3 w-3 rounded-full bg-emerald-400"></div>
          </div>
          <div className="text-xs font-mono text-slate-500">
            {activeStep === 1 && "ciak.io/onboarding — step 1: chi sei?"}
            {activeStep === 2 && "ciak.io/onboarding — step 2: elaborazione AI + team"}
            {activeStep === 3 && "ciak.io/dashboard — accademia mario rossi (attiva)"}
          </div>
        </div>

        {/* Window Body */}
        <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">

          {/* STEP 1: FORM */}
          {activeStep === 1 && (
            <div className="space-y-5 max-w-lg mx-auto w-full animate-fadeIn">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  1. Il tuo Nome e Cognome
                </label>
                <div className="p-3.5 rounded-xl border-2 border-amber-400 bg-white text-slate-900 font-medium flex items-center shadow-sm">
                  <span>{typedName}</span>
                  <span className="w-0.5 h-5 bg-amber-500 ml-1 animate-pulse"></span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  2. Di cosa ti occupi?
                </label>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50">
                    Consulente / Coach
                  </span>
                  <span className={`px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all ${
                    chipSelected
                      ? 'border-amber-400 bg-yellow-50 text-amber-900 shadow-sm font-bold scale-105'
                      : 'border-slate-200 text-slate-500 bg-slate-50'
                  }`}>
                    Professionista del Benessere
                  </span>
                  <span className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50">
                    Formatore / Docente
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  3. Quale metodo o approccio utilizzi?
                </label>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium min-h-[48px] flex items-center">
                  <span>{typedMethod}</span>
                </div>
              </div>

              <div className="pt-2 text-center">
                <span className="text-xs text-slate-500 flex items-center justify-center gap-1 font-medium">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Nessun codice da scrivere. Tutto automatizzato.
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING */}
          {activeStep === 2 && (
            <div className="flex flex-col items-center justify-center text-center space-y-6 animate-fadeIn">
              {/* Radial Progress in CIAK Amber/Yellow */}
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="56" cy="56" r="48" stroke="#E2E8F0" strokeWidth="8" fill="none" />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    stroke="#F59E0B"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={301.59}
                    strokeDashoffset={301.59 - (progress / 100) * 301.59}
                    strokeLinecap="round"
                    className="transition-all duration-100 ease-linear"
                  />
                </svg>
                <span className="absolute font-mono text-xl font-extrabold text-amber-600">{progress}%</span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-800 animate-bounce">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span>L'AI ed il tuo Tutor Umano Dedicato (Marco) stanno lavorando per te</span>
              </div>

              {/* Chat Toast Notification */}
              <div className={`p-4 rounded-xl border border-slate-200 bg-white shadow-lg flex items-center gap-3 text-left max-w-md transition-all duration-500 ${
                showChat ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
                <div className="h-10 w-10 rounded-full bg-slate-900 text-yellow-400 font-bold flex items-center justify-center shrink-0">
                  M
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Marco (Tutor CIAK)</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">Online</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    "Ciao Mario! Ho ottimizzato la struttura del tuo Metodo Posturale. L'Accademia è pronta all'uso!"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DASHBOARD */}
          {activeStep === 3 && (
            <div className="space-y-5 animate-fadeIn">
              {/* Dashboard Topbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-amber-100 text-amber-900 font-extrabold flex items-center justify-center text-lg border border-amber-300">
                    MR
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Accademia Benessere — Dott. Mario Rossi</h4>
                    <p className="text-xs text-slate-500">Professionista del Benessere & Posturologia</p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Accademia Attiva Online
                </div>
              </div>

              {/* Grid cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Corso Prontissimo all'Uso</span>
                  <h5 className="text-sm font-bold text-slate-900 mt-1">Corso Master: Metodo Posturale Integrato</h5>
                  <p className="text-xs text-slate-600 mt-1">Struttura AI + Pagine e Video approvati dal Team Umano</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Studenti Iscritti</span>
                  <div className="text-2xl font-extrabold font-mono text-amber-600 mt-1">24</div>
                  <span className="text-xs font-semibold text-emerald-600">+8 questa settimana</span>
                </div>
              </div>

              <div className="pt-2">
                <button className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-yellow-500/20 transition-all flex items-center justify-center gap-2">
                  Accedi Subito all'Accademia di Mario Rossi <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Auto play button */}
      <div className="mt-4 text-center">
        <button
          onClick={handleAutoPlay}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-full px-4 py-2 shadow-sm hover:bg-slate-50 transition"
        >
          <Play className="h-3.5 w-3.5 fill-slate-700" /> Riproduci Animazione Automatica
        </button>
      </div>
    </div>
  );
}
