import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Play, 
  Download, 
  Copy, 
  Check, 
  Upload, 
  Clock, 
  Cpu,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const BatchProcessor = ({ customDictionary, addToast }) => {
  const [direction, setDirection] = useState("latin_to_cyrillic");
  const [items, setItems] = useState([
    { id: '1', text: "O'zbekiston taraqqiyoti va milliy yuksalish", result: "", time: 0 },
    { id: '2', text: "Yangi avlod texnologiyalari va raqamli iqtisodiyot", result: "", time: 0 },
    { id: '3', text: "Ta'lim, sog'liqni saqlash va ijtimoiy himoya", result: "", time: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [batchStats, setBatchStats] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleAddItem = () => {
    const newItem = {
      id: Math.random().toString(36).substring(2, 9),
      text: "",
      result: "",
      time: 0
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleTextChange = (id, text) => {
    setItems(items.map(item => item.id === id ? { ...item, text } : item));
  };

  const runBatch = async () => {
    const validItems = items.filter(i => i.text.trim());
    if (validItems.length === 0) {
      addToast?.("Kamida bitta matn qatorini kiriting", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        items: validItems.map(i => ({
          id: i.id,
          text: i.text,
          direction: direction
        })),
        user_dictionary: Object.keys(customDictionary).length > 0 ? customDictionary : null
      };

      const res = await fetch('/v1/transliterate/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Batch API xatosi");

      const data = await res.json();
      setBatchStats({
        total: data.total_items,
        time: data.total_time_ms
      });

      const resultMap = new Map(data.results.map(r => [r.id, r]));

      setItems(items.map(item => {
        const found = resultMap.get(item.id);
        return found ? { ...item, result: found.result, time: found.execution_time_ms } : item;
      }));

      addToast?.(`Ommaviy ${data.total_items} ta matn ${data.total_time_ms} ms da o'girildi!`, "success");
    } catch (err) {
      addToast?.(`Batch xatolik: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const exportToJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `uzlang_batch_${Date.now()}.json`;
    a.click();
    addToast?.("JSON fayli yuklandi", "success");
  };

  const exportToCsv = () => {
    let csv = "ID,Manba Matn,Natija Matn,Vaqt (ms)\n";
    items.forEach(i => {
      csv += `"${i.id}","${i.text.replace(/"/g, '""')}","${i.result.replace(/"/g, '""')}",${i.time}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uzlang_batch_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast?.("CSV fayli yuklandi", "success");
  };

  const copyAllResults = () => {
    const allResults = items.filter(i => i.result).map(i => i.result).join('\n');
    if (!allResults) return;
    navigator.clipboard.writeText(allResults);
    setCopiedAll(true);
    addToast?.("Barcha natijalar buferga nusxalandi!", "success");
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header & Controls */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Batch Transliteration Studio</h2>
            <p className="text-xs text-slate-400">Bir vaqtning o'zida yuzlab qator matnlarni ommaviy qayta ishlash</p>
          </div>
        </div>

        {/* Global Direction Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setDirection("latin_to_cyrillic")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                direction === "latin_to_cyrillic" ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Lotin → Kirill
            </button>
            <button
              onClick={() => setDirection("cyrillic_to_latin")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                direction === "cyrillic_to_latin" ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Kirill → Lotin
            </button>
          </div>

          <button
            onClick={runBatch}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 disabled:opacity-50 transition-all"
          >
            {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>Hammasini O'girish</span>
          </button>
        </div>
      </div>

      {/* Batch Stats Banner if run */}
      {batchStats && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>Ommaviy transliteratsiya yakunlandi: <strong>{batchStats.total} ta qator</strong></span>
          </div>
          <span className="font-mono font-bold bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700/50">
            Jami vaqt: {batchStats.time} ms
          </span>
        </div>
      )}

      {/* Items Table / List */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-400">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full pr-12">
            <span>Manba Matn ({direction === 'latin_to_cyrillic' ? 'Lotin' : 'Kirill'})</span>
            <span>Natija Matn ({direction === 'latin_to_cyrillic' ? 'Kirill' : 'Lotin'})</span>
          </div>
        </div>

        <div className="divide-y divide-slate-800/60 max-h-[450px] overflow-y-auto">
          {items.map((item, index) => (
            <div key={item.id} className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 items-center hover:bg-slate-800/30 transition-colors relative group">
              {/* Source Input */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-500 w-5">{index + 1}.</span>
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => handleTextChange(item.id, e.target.value)}
                  placeholder="Matn qatorini kiriting..."
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Target Result */}
              <div className="flex items-center justify-between gap-2 pl-2">
                <div className="flex-1 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs text-slate-200 min-h-[36px] flex items-center font-sans">
                  {item.result || <span className="text-slate-600 italic">O'girilmagan...</span>}
                </div>
                {item.time > 0 && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded shrink-0">
                    {item.time}ms
                  </span>
                )}
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Qatorni o'chirish"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <button
            onClick={handleAddItem}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            <Plus className="w-4 h-4 text-brand-400" />
            <span>Qator qo'shish</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={copyAllResults}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Natijalarni nusxalash</span>
            </button>

            <button
              onClick={exportToCsv}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-brand-400" />
              <span>CSV</span>
            </button>

            <button
              onClick={exportToJson}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-brand-400" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
