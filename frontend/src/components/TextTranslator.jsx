import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowRightLeft, 
  Copy, 
  Trash2, 
  Download, 
  Sparkles, 
  Clock, 
  FileText, 
  Check, 
  Settings2, 
  BookOpen, 
  Maximize2, 
  Minimize2,
  Cpu
} from 'lucide-react';

export const TextTranslator = ({ customDictionary, addToast }) => {
  const [sourceText, setSourceText] = useState("O'zbekiston Respublikasi kelajagi buyuk davlatdir. Ma'no va e'tibor bilan shahar va qishloqlarni obod qilamiz.");
  const [targetText, setTargetText] = useState("");
  const [direction, setDirection] = useState("latin_to_cyrillic"); // "latin_to_cyrillic" | "cyrillic_to_latin"
  const [targetApostrophe, setTargetApostrophe] = useState("'"); // "'", "ʻ", "ʼ", "’"
  const [latencyMs, setLatencyMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const debounceTimer = useRef(null);

  const samples = [
    {
      title: "Konstitutsiya",
      latin: "O'zbekiston Respublikasi o'z taraqqiyotining yangi bosqichida inson huquqlari va erkinliklarini oliy qadriyat deb biladi.",
      cyrillic: "Ўзбекистон Республикаси ўз тараққиётининг янги босқичида инсон ҳуқуқлари ва эркинликларини олий қадрият деб билади."
    },
    {
      title: "Digraf & Tutuq",
      latin: "Toshkent shahri markazidagi choyxona va bodring konservalari zo'r. Ma'suliyatli e'lonlar doskasi.",
      cyrillic: "Тошкент шаҳри марказидаги чойхона ва бодринг консерваллари зўр. Масъулиятли эълонлар доскаси."
    },
    {
      title: "Grammatika",
      latin: "Yevropa va Osiyo qit'alarida yosh va tajribali mutaxassislar hamkorlikda yuksak natijalarga erishmoqda.",
      cyrillic: "Европа ва Осиё қитъаларида ёш ва тажрибали мутахассислар ҳамкорликда юксак натижаларга эришмоқда."
    },
    {
      title: "Ilm-Fan",
      latin: "Sun'iy intellekt va neyron tarmoqlar o'zbek tilining milliy korpusini rivojlantirishda muhim ahamiyat kasb etadi.",
      cyrillic: "Сунъий интеллект ва нейрон тармоқлар ўзбек тилининг миллий корпусини ривожлантиришда муҳим аҳамият касб этади."
    }
  ];

  const performTransliteration = useCallback(async (text, dir, apos) => {
    if (!text.trim()) {
      setTargetText("");
      setLatencyMs(0);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        text: text,
        direction: dir,
        target_apostrophe: apos,
        user_dictionary: Object.keys(customDictionary).length > 0 ? customDictionary : null
      };

      const res = await fetch('/v1/transliterate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Transliteratsiya xatosi");

      const data = await res.json();
      setTargetText(data.result);
      setLatencyMs(data.stats.execution_time_ms);
    } catch (err) {
      console.error(err);
      addToast?.("Transliteratsiya serveriga ulanishda xatolik", "error");
    } finally {
      setLoading(false);
    }
  }, [customDictionary, addToast]);

  // Handle live input change with debounce
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      performTransliteration(sourceText, direction, targetApostrophe);
    }, 120);

    return () => clearTimeout(debounceTimer.current);
  }, [sourceText, direction, targetApostrophe, customDictionary, performTransliteration]);

  const handleSwap = () => {
    const nextDir = direction === "latin_to_cyrillic" ? "cyrillic_to_latin" : "latin_to_cyrillic";
    setDirection(nextDir);
    setSourceText(targetText);
    addToast?.("Yo'nalish almashtirildi", "info");
  };

  const handleCopy = () => {
    if (!targetText) return;
    navigator.clipboard.writeText(targetText);
    setCopied(true);
    addToast?.("Natija buferga nusxalandi!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setSourceText("");
    setTargetText("");
    setLatencyMs(0);
  };

  const handleDownloadTxt = () => {
    if (!targetText) return;
    const blob = new Blob([targetText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uzlang_transliteration_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast?.("Fayl muvaffaqiyatli yuklab olindi", "success");
  };

  const handleLoadSample = (sample) => {
    if (direction === "latin_to_cyrillic") {
      setSourceText(sample.latin);
    } else {
      setSourceText(sample.cyrillic);
    }
    addToast?.(`"${sample.title}" namunasi yuklandi`, "info");
  };

  // Stats
  const charCount = sourceText.length;
  const wordCount = sourceText.trim() ? sourceText.trim().split(/\s+/).length : 0;
  const sentenceCount = sourceText.trim() ? (sourceText.match(/[.!?]+/g) || []).length : 0;
  const readingTimeSec = Math.ceil((wordCount / 200) * 60);

  const isLatin = direction === "latin_to_cyrillic";

  return (
    <div className={`transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-6 overflow-y-auto' : 'w-full'}`}>
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          {/* Direction switcher group */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            <button
              onClick={() => setDirection("latin_to_cyrillic")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                isLatin
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Lotin <span className="text-brand-300 font-mono">→</span> Kirill
            </button>

            <button
              onClick={handleSwap}
              className="p-2 rounded-lg text-slate-400 hover:text-brand-300 hover:bg-brand-500/10 hover:border-brand-500/30 border border-transparent transition-all"
              title="Yo'nalishni almashtirish (Swap)"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setDirection("cyrillic_to_latin")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                !isLatin
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Kirill <span className="text-brand-300 font-mono">→</span> Lotin
            </button>
          </div>

          {/* Apostrophe style picker (when target is Latin) */}
          {!isLatin && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Settings2 className="w-3.5 h-3.5 text-brand-400" />
                Tutuq belgisi:
              </span>
              <div className="flex items-center gap-1">
                {[
                  { symbol: "'", label: "Oddiy (' )" },
                  { symbol: "ʻ", label: "Okina (ʻ )" },
                  { symbol: "ʼ", label: "Modifikator (ʼ )" },
                  { symbol: "’", label: "Kavisli (’ )" },
                ].map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => setTargetApostrophe(item.symbol)}
                    className={`px-2 py-1 rounded text-xs font-mono font-bold transition-all ${
                      targetApostrophe === item.symbol
                        ? 'bg-brand-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800'
                    }`}
                    title={item.label}
                  >
                    {item.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sample Chips */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-brand-400" /> Namunalar:
            </span>
            <div className="flex items-center gap-1.5">
              {samples.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleLoadSample(s)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-[11px] font-medium text-slate-300 border border-slate-700/50 hover:border-brand-500/40 transition-all"
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title={isFullscreen ? "Kichraytirish" : "To'liq ekran"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Dual Editor Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Source Column */}
          <div className="flex flex-col rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden backdrop-blur-md focus-within:border-brand-500/50 transition-all">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/40">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-400"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {isLatin ? "Lotin Alifbosi (Manba)" : "Кирилл Алифбоси (Манба)"}
                </span>
              </div>
              <button
                onClick={handleClear}
                disabled={!sourceText}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title="Tozalash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Input Textarea */}
            <div className="relative flex-1 min-h-[260px] md:min-h-[360px]">
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Matnni shu yerga kiriting yoki namunani tanlang..."
                className="w-full h-full p-4 bg-transparent text-slate-100 placeholder-slate-500 text-base leading-relaxed resize-none outline-none font-sans"
              />
            </div>

            {/* Footer Stats */}
            <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-t border-slate-800/80 bg-slate-950/60 text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-3">
                <span>{charCount} belgi</span>
                <span>•</span>
                <span>{wordCount} so'z</span>
                <span>•</span>
                <span>{sentenceCount} jumla</span>
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>~{readingTimeSec}s o'qish</span>
              </div>
            </div>
          </div>

          {/* Target Column */}
          <div className="flex flex-col rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden backdrop-blur-md relative">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/40">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {!isLatin ? "Lotin Alifbosi (Natija)" : "Кирилл Алифбоси (Натижа)"}
                </span>
                {loading && (
                  <Sparkles className="w-3.5 h-3.5 text-brand-400 animate-spin" />
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {/* Latency Pill */}
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono font-bold">
                  <Cpu className="w-3 h-3" />
                  <span>{latencyMs.toFixed(2)} ms</span>
                </div>

                {/* Download TXT */}
                <button
                  onClick={handleDownloadTxt}
                  disabled={!targetText}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  title="TXT sifatida yuklab olish"
                >
                  <Download className="w-4 h-4" />
                </button>

                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  disabled={!targetText}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-40 disabled:hover:bg-brand-600'
                  }`}
                  title="Natijani nusxalash"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Nusxalandi' : 'Nusxalash'}</span>
                </button>
              </div>
            </div>

            {/* Output View */}
            <div className="relative flex-1 min-h-[260px] md:min-h-[360px] p-4 overflow-y-auto">
              {targetText ? (
                <p className="text-slate-100 text-base leading-relaxed whitespace-pre-wrap font-sans select-all">
                  {targetText}
                </p>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                  <Sparkles className="w-8 h-8 mb-2 opacity-40 text-brand-400" />
                  <p className="text-sm">Natija real-vaqtda shu yerda ko'rinadi</p>
                </div>
              )}
            </div>

            {/* Target Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-800/80 bg-slate-950/60 text-xs text-slate-400 font-mono">
              <span>{targetText.length} belgi natija</span>
              <span className="text-[11px] text-brand-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Context Engine v1.0
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
