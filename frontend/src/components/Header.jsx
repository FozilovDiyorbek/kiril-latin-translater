import React, { useState, useEffect } from 'react';
import { 
  Languages, 
  Terminal, 
  FileText, 
  Layers, 
  BookMarked, 
  Code2, 
  Sun, 
  Moon, 
  Sparkles,
  ExternalLink,
  Cpu,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const Header = ({ activeTab, setActiveTab, isDark, setIsDark }) => {
  const [ocrStatus, setOcrStatus] = useState(null);
  const [isHealthy, setIsHealthy] = useState(true);

  useEffect(() => {
    fetch('/v1/ocr/status')
      .then(res => res.json())
      .then(data => {
        setOcrStatus(data);
        setIsHealthy(true);
      })
      .catch(() => {
        setIsHealthy(false);
      });
  }, []);

  const navItems = [
    { id: 'text', label: 'Matn', icon: Languages },
    { id: 'file', label: 'Hujjat & Kitob', icon: FileText },
    { id: 'batch', label: 'Ommaviy (Batch)', icon: Layers },
    { id: 'dict', label: 'Lug\'at Qoidalari', icon: BookMarked },
    { id: 'api', label: 'API SDK', icon: Code2 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl transition-colors dark:border-slate-800/80 dark:bg-slate-950/80 light:border-slate-200 light:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('text')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/25 ring-1 ring-white/20">
            <Languages className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-brand-300 bg-clip-text text-transparent dark:from-white dark:via-slate-100 dark:to-brand-300 light:from-slate-900 light:to-brand-600">
                UzLang<span className="text-brand-400 font-black">API</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                v1.0 Pro
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">O'zbek Tili Infratuzilmasi</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-900/60 rounded-xl border border-slate-800/60 light:bg-slate-100 light:border-slate-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-200/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Actions & Status */}
        <div className="flex items-center gap-3">
          {/* Health indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-medium light:bg-slate-100 light:border-slate-200">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isHealthy ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>
            <span className="text-slate-300 light:text-slate-700">
              {isHealthy ? 'Tizim Faol' : 'Oflayn'}
            </span>
            {ocrStatus?.tesseract_installed && (
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded">
                OCR ON
              </span>
            )}
          </div>

          {/* API Docs link */}
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-800 light:border-slate-300"
          >
            <Code2 className="w-3.5 h-3.5 text-brand-400" />
            <span className="hidden sm:inline">OpenAPI Docs</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors light:bg-slate-100 light:border-slate-200 light:text-slate-600 light:hover:text-slate-900"
            title={isDark ? "Yorug' rejim" : "Qorong'i rejim"}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="flex md:hidden overflow-x-auto border-t border-slate-800/80 px-4 py-2 gap-2 bg-slate-950/90 no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 bg-slate-900 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
