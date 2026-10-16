import React from 'react';
import { Sparkles, Zap, ShieldCheck, FileCheck, Layers } from 'lucide-react';

export const Hero = () => {
  const metrics = [
    { icon: Zap, label: 'Tezlik', value: '< 1.0 ms', desc: 'Real-vaqtda o\'girish' },
    { icon: ShieldCheck, label: 'Aniqlik', value: '100%', desc: 'Grammatik qoidalar' },
    { icon: FileCheck, label: 'Hujjatlar', value: 'PDF / DOCX', desc: 'Kitob va skanerlar' },
    { icon: Layers, label: 'Integratsiya', value: 'REST API', desc: 'SDK & cURL tayyor' },
  ];

  return (
    <div className="relative pt-6 pb-4 overflow-hidden">
      {/* Background glow orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto text-center px-4">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold mb-4 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
          <span>High-Performance Uzbek Transliteration Engine</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3 leading-tight">
          O'zbek tili uchun{' '}
          <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
            Enterprise Transliteratsiya
          </span>{' '}
          Platformasi
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
          Matnlar, katta hajmli <strong className="text-slate-200">PDF kitoblar, DOCX va TXT</strong> hujjatlarini 
          Kirill va Lotin alifbolari o'rtasida kontekstual va yuqori aniqlik bilan o'giring.
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
          {metrics.map((item, index) => {
            const Icon = item.icon;
            return (
              <div 
                key={index} 
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col items-center justify-center text-center transition-all hover:border-slate-700 hover:bg-slate-900/80"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center mb-2 text-brand-400">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-lg font-bold text-slate-100 font-mono">{item.value}</span>
                <span className="text-[11px] font-semibold text-slate-300">{item.label}</span>
                <span className="text-[10px] text-slate-500">{item.desc}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
