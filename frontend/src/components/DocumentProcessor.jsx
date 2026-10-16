import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  FileCheck, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  Trash2, 
  Terminal, 
  ArrowRightLeft, 
  Loader2, 
  RefreshCw,
  Clock,
  History,
  FileCode
} from 'lucide-react';

export const DocumentProcessor = ({ addToast }) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [direction, setDirection] = useState("latin_to_cyrillic");
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobData, setJobData] = useState(null);
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('uzlang_doc_history') || '[]');
    } catch {
      return [];
    }
  });

  const pollIntervalRef = useRef(null);
  const logContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('uzlang_doc_history', JSON.stringify(history));
  }, [history]);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [jobData?.logs]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleFileSelect = (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(ext)) {
      addToast?.("Faqat .pdf, .docx va .txt formatdagi fayllar qo'llab-quvvatlanadi!", "error");
      return;
    }
    setSelectedFile(file);
    setJobData(null);
    addToast?.(`Fayl tanlandi: ${file.name}`, "info");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const startProcessing = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setJobData({
      status: 'queued',
      progress_percent: 0,
      current_page: 0,
      total_pages: 0,
      elapsed_seconds: 0,
      logs: [`[${new Date().toLocaleTimeString()}] Fayl serverga yuborilmoqda: ${selectedFile.name}...`]
    });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('direction', direction);

      const res = await fetch('/v1/jobs/submit', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Faylni yuklashda xatolik yuz berdi");
      }

      const data = await res.json();
      const jobId = data.job_id;

      // Start polling
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => pollJob(jobId), 800);

    } catch (err) {
      setIsProcessing(false);
      addToast?.(`Xatolik: ${err.message}`, "error");
      setJobData(prev => ({
        ...prev,
        status: 'failed',
        error: err.message,
        logs: [...(prev?.logs || []), `[XATOLIK] ${err.message}`]
      }));
    }
  };

  const pollJob = async (jobId) => {
    try {
      const res = await fetch(`/v1/jobs/${jobId}`);
      if (!res.ok) return;

      const data = await res.json();
      setJobData(data);

      if (data.status === 'completed') {
        clearInterval(pollIntervalRef.current);
        setIsProcessing(false);
        addToast?.("Transliteratsiya muvaffaqiyatli yakunlandi! Fayl yuklanmoqda...", "success");

        // Add to history
        const historyItem = {
          id: jobId,
          filename: selectedFile?.name || 'document',
          direction: direction,
          outputFilename: data.output_filename,
          date: new Date().toLocaleString(),
          status: 'completed',
          totalPages: data.total_pages
        };
        setHistory(prev => [historyItem, ...prev.slice(0, 9)]);

        // Trigger automatic download
        window.location.href = `/v1/jobs/${jobId}/download`;

      } else if (data.status === 'failed') {
        clearInterval(pollIntervalRef.current);
        setIsProcessing(false);
        addToast?.(`Jarayonda xatolik: ${data.error}`, "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const isLatin = direction === "latin_to_cyrillic";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Configuration & Direction Card */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Hujjat va Kitob Transliteratsiyasi</h2>
            <p className="text-xs text-slate-400">Ko'p sahifali PDF kitoblar, Word (.docx) va TXT matnlari</p>
          </div>
        </div>

        {/* Direction Switcher */}
        <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => setDirection("latin_to_cyrillic")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isLatin ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Lotin → Kirill
          </button>
          <button
            onClick={() => setDirection("cyrillic_to_latin")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !isLatin ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Kirill → Lotin
          </button>
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-4 ${
          dragOver
            ? 'border-brand-500 bg-brand-500/10 scale-[1.01]'
            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileSelect(e.target.files?.[0])}
          accept=".pdf,.docx,.txt"
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600/20 to-indigo-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-xl shadow-brand-500/10">
          <UploadCloud className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-100 mb-1">
            Hujjat yoki Kitobni shu yerga tashlang
          </h3>
          <p className="text-xs text-slate-400">
            Yoki faylni tanlash uchun bosing. Formatlar: <strong className="text-slate-200">.PDF, .DOCX, .TXT</strong>
          </p>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><FileCheck className="w-3.5 h-3.5 text-emerald-400" /> Vektor & Matnli PDF</span>
          <span>•</span>
          <span className="flex items-center gap-1"><FileCode className="w-3.5 h-3.5 text-brand-400" /> MS Word DOCX</span>
          <span>•</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-400" /> Asinxron fonda ishlash</span>
        </div>
      </div>

      {/* Selected File Card & Actions */}
      {selectedFile && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold">
              {selectedFile.name.split('.').pop().toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">{selectedFile.name}</p>
              <p className="text-xs text-slate-400">{formatFileSize(selectedFile.size)} • {isLatin ? 'Lotin → Kirill' : 'Kirill → Lotin'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setSelectedFile(null); setJobData(null); }}
              disabled={isProcessing}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-40 transition-colors"
              title="Bekor qilish"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={startProcessing}
              disabled={isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 disabled:opacity-50 transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Transliteratsiya qilinmoqda...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Transliteratsiya qilish</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Progress & Live Terminal Stream */}
      {jobData && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
          {/* Progress Header */}
          <div className="p-5 border-b border-slate-800 bg-slate-950/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {jobData.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : jobData.status === 'failed' ? (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                ) : (
                  <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
                )}
                <span className="text-sm font-bold text-slate-100">
                  {jobData.status === 'completed' ? 'Transliteratsiya muvaffaqiyatli yakunlandi!' :
                   jobData.status === 'failed' ? 'Jarayonda xatolik yuz berdi' :
                   'Hujjat transliteratsiya qilinmoqda...'}
                </span>
              </div>
              <span className="text-lg font-mono font-bold text-brand-400">
                {jobData.progress_percent || 0}%
              </span>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  jobData.status === 'completed' ? 'bg-emerald-500' :
                  jobData.status === 'failed' ? 'bg-rose-500' :
                  'bg-gradient-to-r from-brand-600 to-indigo-400'
                }`}
                style={{ width: `${jobData.progress_percent || 0}%` }}
              />
            </div>

            {/* Meta status info */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono">
              <span>Sahifalar: {jobData.current_page || 0} / {jobData.total_pages || 0}</span>
              <span>O'tgan vaqt: {jobData.elapsed_seconds || 0}s</span>
              {jobData.job_id && <span className="text-slate-500">ID: {jobData.job_id}</span>}
            </div>

            {/* Download button if completed */}
            {jobData.status === 'completed' && (
              <div className="pt-2 flex justify-end">
                <a
                  href={`/v1/jobs/${jobData.job_id}/download`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Transliteratsiya qilingan faylni yuklab olish</span>
                </a>
              </div>
            )}
          </div>

          {/* Terminal Logs */}
          <div className="p-4 bg-slate-950 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-slate-500 text-[11px]">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-brand-400" />
                Real-Vaqt Log Monitor
              </span>
              <span>UTF-8 UTF-16 OCR Pipe</span>
            </div>

            <div
              ref={logContainerRef}
              className="max-h-48 overflow-y-auto space-y-1 text-slate-300 pr-2 select-text"
            >
              {jobData.logs?.map((log, index) => {
                const isErr = log.includes('ERROR') || log.includes('XATOLIK');
                const isSuccess = log.includes('Completed') || log.includes('yakunlandi');
                return (
                  <div
                    key={index}
                    className={`leading-relaxed ${
                      isErr ? 'text-rose-400' : isSuccess ? 'text-emerald-400 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    {log}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Document History Table */}
      {history.length > 0 && (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <History className="w-4 h-4 text-brand-400" />
              <span>Oxirgi Qayta Ishlangan Hujjatlar</span>
            </div>
            <button
              onClick={() => setHistory([])}
              className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors"
            >
              Tarixni tozalash
            </button>
          </div>

          <div className="divide-y divide-slate-800/60">
            {history.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-200">{item.filename}</span>
                    <span className="text-slate-500 ml-2">({item.direction === 'latin_to_cyrillic' ? 'Lotin → Kirill' : 'Kirill → Lotin'})</span>
                    <p className="text-[10px] text-slate-500">{item.date} • {item.totalPages} sahifa</p>
                  </div>
                </div>
                <a
                  href={`/v1/jobs/${item.id}/download`}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors"
                >
                  <Download className="w-3 h-3 text-brand-400" />
                  <span>Yuklash</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
