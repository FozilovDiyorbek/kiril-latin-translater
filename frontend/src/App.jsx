import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { TextTranslator } from './components/TextTranslator';
import { DocumentProcessor } from './components/DocumentProcessor';
import { BatchProcessor } from './components/BatchProcessor';
import { DictionaryManager } from './components/DictionaryManager';
import { ApiDocsPlayground } from './components/ApiDocsPlayground';
import { Toast } from './components/Toast';
import { Heart, Globe2, ShieldCheck, Code, BookOpen } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState('text');
  const [isDark, setIsDark] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [customDictionary, setCustomDictionary] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('uzlang_custom_dict') || '{}');
    } catch {
      return {};
    }
  });

  // Dark/Light theme sync
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Toast manager
  const addToast = (message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey) {
        if (e.key === '1') setActiveTab('text');
        if (e.key === '2') setActiveTab('file');
        if (e.key === '3') setActiveTab('batch');
        if (e.key === '4') setActiveTab('dict');
        if (e.key === '5') setActiveTab('api');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 transition-colors dark:bg-slate-950 dark:text-slate-100 light:bg-slate-50 light:text-slate-900">
      {/* Toast Notification Container */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Top Glass Navbar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
        setIsDark={setIsDark}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        
        {/* Hero Section */}
        <Hero />

        {/* Dynamic Tab Body */}
        <div className="animate-fade-in">
          {activeTab === 'text' && (
            <TextTranslator
              customDictionary={customDictionary}
              addToast={addToast}
            />
          )}

          {activeTab === 'file' && (
            <DocumentProcessor
              addToast={addToast}
            />
          )}

          {activeTab === 'batch' && (
            <BatchProcessor
              customDictionary={customDictionary}
              addToast={addToast}
            />
          )}

          {activeTab === 'dict' && (
            <DictionaryManager
              customDictionary={customDictionary}
              setCustomDictionary={setCustomDictionary}
              addToast={addToast}
            />
          )}

          {activeTab === 'api' && (
            <ApiDocsPlayground
              addToast={addToast}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">UzLang Transliteration Infrastructure</span>
            <span>•</span>
            <span>Enterprise API Platform</span>
          </div>

          <div className="flex items-center gap-4 font-medium">
            <a href="/docs" target="_blank" rel="noopener noreferrer" className="hover:text-brand-400 transition-colors flex items-center gap-1">
              <Code className="w-3.5 h-3.5" /> OpenAPI Docs
            </a>
            <a href="/redoc" target="_blank" rel="noopener noreferrer" className="hover:text-brand-400 transition-colors flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> ReDoc Spec
            </a>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">© 2026 UzLang API. Barcha huquqlar himoyalangan.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
