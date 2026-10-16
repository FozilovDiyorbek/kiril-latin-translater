import React, { useState } from 'react';
import { 
  BookMarked, 
  Plus, 
  Trash2, 
  Search, 
  Sparkles, 
  ArrowRightLeft, 
  Check, 
  Download, 
  Upload,
  Info
} from 'lucide-react';

export const DictionaryManager = ({ customDictionary, setCustomDictionary, addToast }) => {
  const [latinWord, setLatinWord] = useState("");
  const [cyrillicWord, setCyrillicWord] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [testInput, setTestInput] = useState("");
  const [testOutput, setTestOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddOverride = async (e) => {
    e.preventDefault();
    const latin = latinWord.trim();
    const cyrillic = cyrillicWord.trim();

    if (!latin || !cyrillic) {
      addToast?.("Lotin va Kirill so'zlarini to'liq kiriting", "error");
      return;
    }

    setLoading(true);
    try {
      // Send to server API
      const res = await fetch('/v1/dictionary/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latin_word: latin,
          cyrillic_word: cyrillic
        })
      });

      if (!res.ok) throw new Error("Server lug'atiga qo'shishda xatolik");

      // Update state
      const updated = { ...customDictionary, [latin.toLowerCase()]: cyrillic.toLowerCase() };
      setCustomDictionary(updated);
      localStorage.setItem('uzlang_custom_dict', JSON.stringify(updated));

      setLatinWord("");
      setCyrillicWord("");
      addToast?.(`"${latin} ↔ ${cyrillic}" qoidasi muvaffaqiyatli qo'shildi!`, "success");
    } catch (err) {
      addToast?.(`Xatolik: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveOverride = (key) => {
    const updated = { ...customDictionary };
    delete updated[key];
    setCustomDictionary(updated);
    localStorage.setItem('uzlang_custom_dict', JSON.stringify(updated));
    addToast?.("Qoida o'chirildi", "info");
  };

  const entries = Object.entries(customDictionary).filter(([latin, cyrillic]) => {
    const q = searchQuery.toLowerCase();
    return latin.toLowerCase().includes(q) || cyrillic.toLowerCase().includes(q);
  });

  const testRule = async () => {
    if (!testInput.trim()) return;
    try {
      const res = await fetch('/v1/transliterate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testInput,
          direction: 'latin_to_cyrillic',
          user_dictionary: customDictionary
        })
      });
      const data = await res.json();
      setTestOutput(data.result);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">
            <BookMarked className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Maxsus Lug'at va Istisnolar Boshqaruvi</h2>
            <p className="text-xs text-slate-400">Brendlar, xorijiy ismlar va qoidadan tashqari so'zlarni o'zgartirish</p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
          {Object.keys(customDictionary).length} ta faol qoida
        </span>
      </div>

      {/* Add New Rule Card */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Plus className="w-4 h-4 text-brand-400" />
          Yangi Lug'at Istisnosi Qo'shish
        </h3>

        <form onSubmit={handleAddOverride} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Lotincha so'z</label>
            <input
              type="text"
              value={latinWord}
              onChange={(e) => setLatinWord(e.target.value)}
              placeholder="masalan: Schubert"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Kirillcha so'z</label>
            <input
              type="text"
              value={cyrillicWord}
              onChange={(e) => setCyrillicWord(e.target.value)}
              placeholder="masalan: Шуберт"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="sm:self-end">
            <button
              type="submit"
              disabled={loading || !latinWord || !cyrillicWord}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 disabled:opacity-40 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Qoidani Qo'shish</span>
            </button>
          </div>
        </form>
      </div>

      {/* Rules List & Filter */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Qoidalardan qidirish..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-3.5 h-3.5 text-brand-400" />
            <span>Qoidalar matn transliteratsiyasida real-vaqtda qo'llaniladi</span>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Hech qanday maxsus qoida topilmadi. Yuqoridan yangi so'z istisnosini qo'shing.
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto">
            {entries.map(([latin, cyrillic]) => (
              <div
                key={latin}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="text-brand-300 font-mono">{latin}</span>
                  <ArrowRightLeft className="w-3 h-3 text-slate-600" />
                  <span className="text-emerald-400 font-mono">{cyrillic}</span>
                </div>
                <button
                  onClick={() => handleRemoveOverride(latin)}
                  className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="O'chirish"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Live Tester for Dictionary */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          Lug'at Qoidalarini Tezkor Sinash
        </h4>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Sinash uchun matn kiriting (masalan: Franz Schubert asarlari)..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
          <button
            onClick={testRule}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Sinash
          </button>
        </div>
        {testOutput && (
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 flex items-center gap-2">
            <span className="text-slate-500">Natija:</span>
            <span>{testOutput}</span>
          </div>
        )}
      </div>

    </div>
  );
};
