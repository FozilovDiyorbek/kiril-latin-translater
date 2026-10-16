/**
 * UzLang Transliteration Infrastructure - Lightweight Native Application
 * Pure Vanilla JavaScript • Zero Node.js / Vite build dependencies • Blazing Fast
 */

// ============================================================================
// Global State
// ============================================================================
const state = {
  activeTab: 'text',
  direction: 'latin_to_cyrillic', // 'latin_to_cyrillic' | 'cyrillic_to_latin'
  targetApostrophe: "'",
  customDictionary: {},
  docHistory: [],
  selectedFile: null,
  activeJobId: null,
  jobPollInterval: null,
  batchItems: [
    { id: '1', text: "O'zbekiston taraqqiyoti va milliy yuksalish", result: '', time: 0 },
    { id: '2', text: "Yangi avlod texnologiyalari va raqamli iqtisodiyot", result: '', time: 0 },
    { id: '3', text: "Ta'lim, sog'liqni saqlash va ijtimoiy himoya", result: '', time: 0 }
  ],
  activeCodeLang: 'curl',
  isFullscreen: false,
  debounceTimer: null
};

// Preset Sample Texts
const SAMPLES = {
  konstitutsiya: {
    latin: "O'zbekiston Respublikasi o'z taraqqiyotining yangi bosqichida inson huquqlari va erkinliklarini oliy qadriyat deb biladi.",
    cyrillic: "Ўзбекистон Республикаси ўз тараққиётининг янги босқичида инсон ҳуқуқлари ва эркинликларини олий қадрият деб билади."
  },
  digraf: {
    latin: "Toshkent shahri markazidagi choyxona va bodring konservalari zo'r. Mas'uliyatli e'lonlar doskasi.",
    cyrillic: "Тошкент шаҳри марказидаги чойхона ва бодринг консерваллари зўр. Масъулиятли эълонлар доскаси."
  },
  grammatika: {
    latin: "Yevropa va Osiyo qit'alarida yosh va tajribali mutaxassislar hamkorlikda yuksak natijalarga erishmoqda.",
    cyrillic: "Европа ва Осиё қитъаларида ёш ва тажрибали мутахассислар ҳамкорликда юксак натижаларга эришмоқда."
  },
  ilm: {
    latin: "Sun'iy intellekt va neyron tarmoqlar o'zbek tilining milliy korpusini rivojlantirishda muhim ahamiyat kasb etadi.",
    cyrillic: "Сунъий интеллект ва нейрон тармоқlar ўзбек тилининг миллий корпусини ривожлантиришда муҳим аҳамият касб этади."
  }
};

// ============================================================================
// Initialization
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Load saved theme
  const savedTheme = localStorage.getItem('uzlang_theme') || 'dark';
  applyTheme(savedTheme);

  // Load custom dictionary from localStorage
  try {
    const rawDict = localStorage.getItem('uzlang_custom_dict');
    if (rawDict) state.customDictionary = JSON.parse(rawDict);
  } catch (e) {
    state.customDictionary = {};
  }

  // Load document history
  try {
    const rawHist = localStorage.getItem('uzlang_doc_history');
    if (rawHist) state.docHistory = JSON.parse(rawHist);
  } catch (e) {
    state.docHistory = [];
  }

  // Render initial components
  initDropZone();
  renderDictChips();
  renderBatchItems();
  renderDocHistory();
  updateApiCodeSnippet();

  // Initial transliteration of default text
  triggerTransliteration();

  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Global Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.altKey) {
      if (e.key === '1') switchTab('text');
      if (e.key === '2') switchTab('file');
      if (e.key === '3') switchTab('batch');
      if (e.key === '4') switchTab('dict');
      if (e.key === '5') switchTab('api');
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (state.activeTab === 'text') triggerTransliteration();
      if (state.activeTab === 'batch') runBatchProcessing();
    }
  });
});

// ============================================================================
// Tab Navigation
// ============================================================================
function switchTab(tabId) {
  state.activeTab = tabId;

  // Toggle tab contents
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  const activeContent = document.getElementById(`tab-${tabId}`);
  if (activeContent) activeContent.classList.add('active');

  // Desktop Navbar active states
  const tabs = ['text', 'file', 'batch', 'dict', 'api'];
  tabs.forEach(t => {
    const btn = document.getElementById(`nav-btn-${t}`);
    if (btn) {
      if (t === tabId) {
        btn.className = "nav-tab active flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-white bg-brand-600 shadow-sm shadow-brand-600/30";
      } else {
        btn.className = "nav-tab flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800/50";
      }
    }
  });

  // Mobile Navbar active states
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('text-brand-400');
      btn.classList.remove('text-slate-400');
    } else {
      btn.classList.remove('text-brand-400');
      btn.classList.add('text-slate-400');
    }
  });

  if (window.lucide) window.lucide.createIcons();
}

// ============================================================================
// TAB 1: Matn Tarjimoni (Text Translator)
// ============================================================================
function onSourceInput() {
  clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(() => {
    triggerTransliteration();
  }, 160);
}

function onApostropheChange() {
  const sel = document.getElementById('target-apostrophe-select');
  if (sel) state.targetApostrophe = sel.value;
  triggerTransliteration();
}

async function triggerTransliteration() {
  const sourceEl = document.getElementById('source-text');
  const targetEl = document.getElementById('target-text');
  const spinnerEl = document.getElementById('target-text-spinner');
  const latencyBadge = document.getElementById('latency-badge');
  const sourceStats = document.getElementById('source-stats');
  const targetStats = document.getElementById('target-stats');

  if (!sourceEl || !targetEl) return;

  const text = sourceEl.value;

  // Update source statistics
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  if (sourceStats) sourceStats.innerText = `${charCount} belgilar | ${wordCount} so'zlar`;

  if (!text.trim()) {
    targetEl.innerText = "";
    if (targetStats) targetStats.innerText = "0 belgilar";
    if (latencyBadge) latencyBadge.innerText = "0.0 ms";
    return;
  }

  if (spinnerEl) spinnerEl.classList.remove('hidden');

  const startTime = performance.now();

  try {
    const res = await fetch('/v1/transliterate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        direction: state.direction,
        target_apostrophe: state.targetApostrophe,
        user_dictionary: state.customDictionary
      })
    });

    if (!res.ok) throw new Error("Transliteratsiya so'rovida xatolik yuz berdi");

    const data = await res.json();
    targetEl.innerText = data.result || "";
    
    const clientLatency = (performance.now() - startTime).toFixed(1);
    const serverTime = data.stats?.execution_time_ms ? data.stats.execution_time_ms.toFixed(1) : clientLatency;

    if (latencyBadge) {
      latencyBadge.innerText = `⚡ ${serverTime} ms`;
    }

    if (targetStats) {
      targetStats.innerText = `${(data.result || "").length} belgilar`;
    }

    // Also update API Playground snippet text
    updateApiCodeSnippet();

  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (spinnerEl) spinnerEl.classList.add('hidden');
  }
}

function swapDirection() {
  state.direction = state.direction === 'latin_to_cyrillic' ? 'cyrillic_to_latin' : 'latin_to_cyrillic';

  const sourceLabel = document.getElementById('direction-source-label');
  const targetLabel = document.getElementById('direction-target-label');
  const sourcePaneTitle = document.getElementById('source-pane-title');
  const targetPaneTitle = document.getElementById('target-pane-title');
  const sourceEl = document.getElementById('source-text');
  const targetEl = document.getElementById('target-text');

  if (state.direction === 'latin_to_cyrillic') {
    if (sourceLabel) sourceLabel.innerText = "O'zbekcha (Lotin)";
    if (targetLabel) targetLabel.innerText = "Ўзбекча (Кирилл)";
    if (sourcePaneTitle) sourcePaneTitle.innerHTML = `<i data-lucide="edit-3" class="w-3.5 h-3.5 text-brand-400"></i><span>Lotin matni (Kiritish)</span>`;
    if (targetPaneTitle) targetPaneTitle.innerHTML = `<i data-lucide="sparkles" class="w-3.5 h-3.5 text-brand-400"></i><span>Kirill matni (Natija)</span>`;
  } else {
    if (sourceLabel) sourceLabel.innerText = "Ўзбекча (Кирилл)";
    if (targetLabel) targetLabel.innerText = "O'zbekcha (Lotin)";
    if (sourcePaneTitle) sourcePaneTitle.innerHTML = `<i data-lucide="edit-3" class="w-3.5 h-3.5 text-brand-400"></i><span>Kirill matni (Kiritish)</span>`;
    if (targetPaneTitle) targetPaneTitle.innerHTML = `<i data-lucide="sparkles" class="w-3.5 h-3.5 text-brand-400"></i><span>Lotin matni (Natija)</span>`;
  }

  // Swap texts if target text is non-empty
  if (targetEl && targetEl.innerText.trim()) {
    sourceEl.value = targetEl.innerText;
  }

  if (window.lucide) window.lucide.createIcons();
  triggerTransliteration();
}

function loadSample(key) {
  const sample = SAMPLES[key];
  if (!sample) return;

  const sourceEl = document.getElementById('source-text');
  if (state.direction === 'latin_to_cyrillic') {
    sourceEl.value = sample.latin;
  } else {
    sourceEl.value = sample.cyrillic;
  }

  triggerTransliteration();
  showToast(`"${key}" namunasi yuklandi`, 'info', 1800);
}

function clearSourceText() {
  const sourceEl = document.getElementById('source-text');
  if (sourceEl) {
    sourceEl.value = "";
    triggerTransliteration();
    sourceEl.focus();
  }
}

function copySourceText() {
  const sourceEl = document.getElementById('source-text');
  if (!sourceEl || !sourceEl.value) return;
  navigator.clipboard.writeText(sourceEl.value).then(() => {
    showToast("Asl matn buferga nusxalandi!", "success");
  });
}

function copyTargetResult() {
  const targetEl = document.getElementById('target-text');
  if (!targetEl || !targetEl.innerText) return;
  navigator.clipboard.writeText(targetEl.innerText).then(() => {
    const copyText = document.getElementById('copy-btn-text');
    if (copyText) copyText.innerText = "Nusxalandi!";
    setTimeout(() => {
      if (copyText) copyText.innerText = "Nusxalash";
    }, 1500);
    showToast("Natijaviy matn nusxalandi!", "success");
  });
}

function downloadTargetText() {
  const targetEl = document.getElementById('target-text');
  if (!targetEl || !targetEl.innerText.trim()) {
    showToast("Yuklab olish uchun matn mavjud emas", "error");
    return;
  }

  const blob = new Blob([targetEl.innerText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `uzlang_transliterated_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Matn fayl sifatida yuklab olindi", "success");
}

function toggleFullscreen() {
  state.isFullscreen = !state.isFullscreen;
  const container = document.getElementById('dual-editor-container');
  const icon = document.getElementById('fullscreen-icon');

  if (state.isFullscreen) {
    container.classList.add('fixed', 'inset-4', 'z-50', 'bg-slate-950', 'p-4', 'rounded-2xl', 'shadow-2xl');
    if (icon) icon.setAttribute('data-lucide', 'minimize-2');
  } else {
    container.classList.remove('fixed', 'inset-4', 'z-50', 'bg-slate-950', 'p-4', 'rounded-2xl', 'shadow-2xl');
    if (icon) icon.setAttribute('data-lucide', 'maximize-2');
  }

  if (window.lucide) window.lucide.createIcons();
}

// ============================================================================
// TAB 2: Hujjat Protsessori (Document Processor)
// ============================================================================
function initDropZone() {
  const dropZone = document.getElementById('drop-zone');
  if (!dropZone) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) onFileSelected(files[0]);
  }, false);
}

function onFileSelected(file) {
  if (!file) return;

  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf', 'docx', 'txt'].includes(ext)) {
    showToast("Faqat .pdf, .docx yoki .txt formatidagi fayllar qabul qilinadi", "error");
    return;
  }

  state.selectedFile = file;

  // Update UI
  const card = document.getElementById('file-selected-card');
  const nameEl = document.getElementById('file-name');
  const sizeEl = document.getElementById('file-size');

  if (nameEl) nameEl.innerText = file.name;
  if (sizeEl) sizeEl.innerText = formatFileSize(file.size);
  if (card) card.classList.remove('hidden');

  // Reset progress and banner
  document.getElementById('file-progress-container')?.classList.add('hidden');
  document.getElementById('file-result-banner')?.classList.add('hidden');

  showToast(`"${file.name}" tanlandi`, "info", 2000);
}

function removeSelectedFile() {
  state.selectedFile = null;
  const input = document.getElementById('file-input');
  if (input) input.value = '';

  document.getElementById('file-selected-card')?.classList.add('hidden');
  document.getElementById('file-progress-container')?.classList.add('hidden');
  document.getElementById('file-result-banner')?.classList.add('hidden');
}

async function startFileProcessing() {
  if (!state.selectedFile) {
    showToast("Iltimos, avval fayl tanlang", "error");
    return;
  }

  const direction = document.getElementById('doc-direction-select')?.value || 'latin_to_cyrillic';
  const progressBox = document.getElementById('file-progress-container');
  const resultBanner = document.getElementById('file-result-banner');
  const processBtn = document.getElementById('btn-process-file');
  const logStream = document.getElementById('log-stream-body');

  progressBox?.classList.remove('hidden');
  resultBanner?.classList.add('hidden');
  if (processBtn) {
    processBtn.disabled = true;
    processBtn.classList.add('opacity-50');
  }

  // Append initial log
  if (logStream) {
    logStream.innerHTML = `<div class="text-cyan-400">[${new Date().toLocaleTimeString()}] Vazifa yaratilmoqda. Fayl: ${state.selectedFile.name}</div>`;
  }

  try {
    const formData = new FormData();
    formData.append('file', state.selectedFile);
    formData.append('direction', direction);

    // Call async job submit endpoint
    const res = await fetch('/v1/jobs/submit', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Faylni serverga yuklashda xatolik yuz berdi");
    }

    const data = await res.json();
    state.activeJobId = data.job_id;

    const logJobId = document.getElementById('log-job-id');
    if (logJobId) logJobId.innerText = `JOB: ${data.job_id}`;

    showToast("Hujjat fon rejimiga qo'yildi. Jarayon kuzatilmoqda...", "info", 2500);

    // Start polling job status
    clearInterval(state.jobPollInterval);
    state.jobPollInterval = setInterval(() => pollJobStatus(data.job_id), 700);

  } catch (err) {
    if (processBtn) {
      processBtn.disabled = false;
      processBtn.classList.remove('opacity-50');
    }
    showToast(err.message, "error");
    if (logStream) {
      logStream.innerHTML += `<div class="text-rose-400">[${new Date().toLocaleTimeString()}] XATOLIK: ${err.message}</div>`;
    }
  }
}

async function pollJobStatus(jobId) {
  try {
    const res = await fetch(`/v1/jobs/${jobId}`);
    if (!res.ok) return;

    const data = await res.json();

    const percentEl = document.getElementById('progress-percent');
    const barEl = document.getElementById('progress-bar-fill');
    const pageEl = document.getElementById('progress-page-info');
    const timeEl = document.getElementById('progress-time-info');
    const statusText = document.getElementById('progress-status-text');
    const logStream = document.getElementById('log-stream-body');

    if (percentEl) percentEl.innerText = `${data.progress_percent}%`;
    if (barEl) barEl.style.width = `${data.progress_percent}%`;
    if (pageEl) pageEl.innerText = `Sahifa ${data.current_page} / ${data.total_pages}`;
    if (timeEl) timeEl.innerText = `Vaqt: ${data.elapsed_seconds}s`;
    if (statusText) statusText.innerText = data.status === 'completed' ? 'Transliteratsiya yakunlandi!' : 'Hujjat qayta ishlanmoqda...';

    // Render live logs
    if (logStream && data.logs && data.logs.length) {
      logStream.innerHTML = data.logs.map(log => {
        let colorClass = 'text-cyan-400';
        if (log.includes('Completed') || log.includes('muvaffaqiyatli')) colorClass = 'text-emerald-400 font-semibold';
        if (log.includes('ERROR') || log.includes('xatolik')) colorClass = 'text-rose-400 font-semibold';
        return `<div class="${colorClass}">${escapeHtml(log)}</div>`;
      }).join('');
      logStream.scrollTop = logStream.scrollHeight;
    }

    if (data.status === 'completed') {
      clearInterval(state.jobPollInterval);
      onJobCompleted(data);
    } else if (data.status === 'failed') {
      clearInterval(state.jobPollInterval);
      onJobFailed(data.error);
    }

  } catch (err) {
    console.error("Job poll error:", err);
  }
}

function onJobCompleted(jobData) {
  const processBtn = document.getElementById('btn-process-file');
  if (processBtn) {
    processBtn.disabled = false;
    processBtn.classList.remove('opacity-50');
  }

  const spinner = document.getElementById('progress-spinner');
  if (spinner) spinner.classList.add('hidden');

  const resultBanner = document.getElementById('file-result-banner');
  const filenameEl = document.getElementById('file-result-filename');
  if (resultBanner) resultBanner.classList.remove('hidden');
  if (filenameEl) filenameEl.innerText = jobData.output_filename || 'transliterated_document';

  showToast("Hujjat muvaffaqiyatli transliteratsiya qilindi!", "success");

  // Save to history
  const historyItem = {
    id: jobData.job_id,
    filename: jobData.filename,
    outputFilename: jobData.output_filename,
    direction: jobData.direction,
    date: new Date().toLocaleString(),
    elapsed: jobData.elapsed_seconds
  };

  state.docHistory.unshift(historyItem);
  if (state.docHistory.length > 20) state.docHistory.pop();
  localStorage.setItem('uzlang_doc_history', JSON.stringify(state.docHistory));
  renderDocHistory();
}

function onJobFailed(errorMsg) {
  const processBtn = document.getElementById('btn-process-file');
  if (processBtn) {
    processBtn.disabled = false;
    processBtn.classList.remove('opacity-50');
  }
  const spinner = document.getElementById('progress-spinner');
  if (spinner) spinner.classList.add('hidden');
  const statusText = document.getElementById('progress-status-text');
  if (statusText) {
    statusText.innerText = `Xatolik: ${errorMsg}`;
    statusText.className = "text-rose-400 font-semibold";
  }
  document.getElementById('file-result-banner')?.classList.add('hidden');
  showToast(`Xatolik: ${errorMsg}`, "error", 6000);
}

function downloadCompletedJob() {
  if (!state.activeJobId) return;
  window.location.href = `/v1/jobs/${state.activeJobId}/download`;
}

function renderDocHistory() {
  const container = document.getElementById('doc-history-container');
  if (!container) return;

  if (!state.docHistory || state.docHistory.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-500 text-center py-4">Hozircha qayta ishlangan hujjatlar mavjud emas</div>`;
    return;
  }

  container.innerHTML = state.docHistory.map(item => `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs gap-2">
      <div class="flex items-center gap-2.5">
        <i data-lucide="file-check" class="w-4 h-4 text-emerald-400 shrink-0"></i>
        <div>
          <div class="font-semibold text-slate-200">${escapeHtml(item.filename)} → <span class="text-brand-400">${escapeHtml(item.outputFilename || '')}</span></div>
          <div class="text-[10px] text-slate-500">${item.date} • ${item.direction === 'latin_to_cyrillic' ? 'Lotin → Kirill' : 'Kirill → Lotin'} • ${item.elapsed}s</div>
        </div>
      </div>
      <a href="/v1/jobs/${item.id}/download" class="self-start sm:self-auto px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center gap-1 transition-colors">
        <i data-lucide="download" class="w-3.5 h-3.5"></i>
        <span>Yuklab olish</span>
      </a>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

function clearDocHistory() {
  state.docHistory = [];
  localStorage.removeItem('uzlang_doc_history');
  renderDocHistory();
  showToast("Hujjatlar tarixi tozalandi", "info");
}

// ============================================================================
// TAB 3: Paketli Qayta Ishlash (Batch Processor)
// ============================================================================
function renderBatchItems() {
  const container = document.getElementById('batch-items-list');
  if (!container) return;

  container.innerHTML = state.batchItems.map((item, idx) => `
    <div class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
      <span class="w-6 text-center font-mono text-slate-500 shrink-0">${idx + 1}</span>
      <input type="text" value="${escapeHtml(item.text)}" oninput="onBatchTextChange('${item.id}', this.value)" placeholder="Matnni kiriting..." class="flex-1 bg-transparent border-none text-slate-100 placeholder:text-slate-600 outline-none">
      <i data-lucide="arrow-right" class="w-4 h-4 text-slate-600 shrink-0"></i>
      <div class="flex-1 font-mono text-emerald-400 truncate select-all px-2 py-1 rounded bg-slate-900/60 border border-slate-800 min-h-[26px]">
        ${escapeHtml(item.result || '')}
      </div>
      ${item.time ? `<span class="text-[10px] font-mono text-slate-500 shrink-0">${item.time}ms</span>` : ''}
      <button onclick="removeBatchItem('${item.id}')" class="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition-colors" title="O'chirish">
        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
      </button>
    </div>
  `).join('');

  const summary = document.getElementById('batch-stats-summary');
  if (summary) summary.innerText = `${state.batchItems.length} ta qator`;

  if (window.lucide) window.lucide.createIcons();
}

function addBatchItem() {
  const newItem = {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
    text: '',
    result: '',
    time: 0
  };
  state.batchItems.push(newItem);
  renderBatchItems();
}

function removeBatchItem(id) {
  if (state.batchItems.length <= 1) {
    showToast("Kamida bitta qator qolishi kerak", "info");
    return;
  }
  state.batchItems = state.batchItems.filter(i => i.id !== id);
  renderBatchItems();
}

function onBatchTextChange(id, text) {
  const item = state.batchItems.find(i => i.id === id);
  if (item) item.text = text;
}

async function runBatchProcessing() {
  const direction = document.getElementById('batch-direction')?.value || 'latin_to_cyrillic';
  const validItems = state.batchItems.filter(i => i.text.trim());

  if (!validItems.length) {
    showToast("Iltimos, kamida bitta matn qatorini kiriting", "error");
    return;
  }

  showToast("Paketli o'girish boshlandi...", "info", 1500);

  try {
    const payload = {
      items: validItems.map(i => ({ id: i.id, text: i.text, direction })),
      user_dictionary: state.customDictionary
    };

    const res = await fetch('/v1/transliterate/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Batch so'rovida xatolik yuz berdi");

    const data = await res.json();
    
    // Map results back to state
    data.results.forEach(r => {
      const match = state.batchItems.find(item => item.id === r.id);
      if (match) {
        match.result = r.result;
        match.time = r.execution_time_ms;
      }
    });

    renderBatchItems();
    showToast(`${data.total_items} ta qator ${data.total_time_ms} ms da o'girildi!`, "success");

  } catch (err) {
    showToast(err.message, "error");
  }
}

function copyAllBatchResults() {
  const results = state.batchItems.map(i => i.result).filter(Boolean);
  if (!results.length) {
    showToast("Nusxalash uchun natija mavjud emas", "error");
    return;
  }
  navigator.clipboard.writeText(results.join('\n')).then(() => {
    showToast("Barcha natijalar buferga nusxalandi!", "success");
  });
}

function downloadBatchJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.batchItems, null, 2));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", `uzlang_batch_${Date.now()}.json`);
  dlAnchorElem.click();
  showToast("JSON fayl yuklab olindi", "success");
}

// ============================================================================
// TAB 4: Lug'at Boshqaruvi (Dictionary Manager)
// ============================================================================
async function onAddDictionaryRule(e) {
  e.preventDefault();
  const latinInput = document.getElementById('dict-latin-input');
  const cyrillicInput = document.getElementById('dict-cyrillic-input');

  const latin = latinInput?.value.trim();
  const cyrillic = cyrillicInput?.value.trim();

  if (!latin || !cyrillic) {
    showToast("Iltimos, ikkala so'zni ham kiriting", "error");
    return;
  }

  try {
    // Notify server API
    await fetch('/v1/dictionary/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latin_word: latin,
        cyrillic_word: cyrillic
      })
    });

    state.customDictionary[latin.toLowerCase()] = cyrillic.toLowerCase();
    localStorage.setItem('uzlang_custom_dict', JSON.stringify(state.customDictionary));

    latinInput.value = "";
    cyrillicInput.value = "";

    renderDictChips();
    triggerTransliteration();
    showToast(`"${latin} ↔ ${cyrillic}" qoidasi saqlandi!`, "success");

  } catch (err) {
    showToast(`Xatolik: ${err.message}`, "error");
  }
}

function deleteDictRule(latinKey) {
  delete state.customDictionary[latinKey.toLowerCase()];
  localStorage.setItem('uzlang_custom_dict', JSON.stringify(state.customDictionary));
  renderDictChips();
  triggerTransliteration();
  showToast(`Qoida o'chirildi`, "info");
}

function renderDictChips(filterText = '') {
  const container = document.getElementById('dict-chips-container');
  if (!container) return;

  const keys = Object.keys(state.customDictionary);
  if (!keys.length) {
    container.innerHTML = `<div class="text-xs text-slate-500 py-3">Hozircha maxsus qoidalar kiritilmagan. Yuqoridagi formadan qo'shishingiz mumkin.</div>`;
    return;
  }

  const filtered = keys.filter(k => 
    k.includes(filterText.toLowerCase()) || 
    state.customDictionary[k].includes(filterText.toLowerCase())
  );

  if (!filtered.length) {
    container.innerHTML = `<div class="text-xs text-slate-500 py-3">Mos keluvchi qoida topilmadi</div>`;
    return;
  }

  container.innerHTML = filtered.map(k => `
    <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-200 hover:border-brand-500/50 transition-colors">
      <span class="font-semibold text-brand-300">${escapeHtml(k)}</span>
      <span class="text-slate-500">↔</span>
      <span class="text-emerald-300">${escapeHtml(state.customDictionary[k])}</span>
      <button onclick="deleteDictRule('${escapeHtml(k)}')" class="ml-1 p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors">
        <i data-lucide="x" class="w-3 h-3"></i>
      </button>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

function filterDictRules() {
  const query = document.getElementById('dict-search-input')?.value || '';
  renderDictChips(query);
}

async function onDictTestInput() {
  const inputEl = document.getElementById('dict-test-input');
  const outputEl = document.getElementById('dict-test-output');
  if (!inputEl || !outputEl) return;

  const text = inputEl.value.trim();
  if (!text) {
    outputEl.innerText = "Natija...";
    return;
  }

  try {
    const res = await fetch('/v1/transliterate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        direction: 'latin_to_cyrillic',
        user_dictionary: state.customDictionary
      })
    });
    const data = await res.json();
    outputEl.innerText = `→ ${data.result}`;
  } catch (e) {
    outputEl.innerText = `Xatolik`;
  }
}

// ============================================================================
// TAB 5: API Docs & Playground
// ============================================================================
function switchCodeSnippetTab(lang) {
  state.activeCodeLang = lang;
  document.querySelectorAll('.code-tab').forEach(btn => {
    if (btn.getAttribute('data-lang') === lang) {
      btn.className = "code-tab active text-xs font-semibold px-3 py-1 rounded-md text-white bg-slate-800";
    } else {
      btn.className = "code-tab text-xs font-semibold px-3 py-1 rounded-md text-slate-400 hover:text-slate-200";
    }
  });
  updateApiCodeSnippet();
}

function updateApiCodeSnippet() {
  const codeEl = document.getElementById('api-code-snippet');
  if (!codeEl) return;

  const origin = window.location.origin;
  const sample = (document.getElementById('source-text')?.value || "O'zbekiston Respublikasi").replace(/"/g, '\\"');

  let snippet = "";
  switch (state.activeCodeLang) {
    case 'curl':
      snippet = `curl -X POST "${origin}/v1/transliterate" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "${sample.replace(/'/g, "\\'")}",
    "direction": "${state.direction}",
    "target_apostrophe": "'"
  }'`;
      break;

    case 'python':
      snippet = `import requests

url = "${origin}/v1/transliterate"
payload = {
    "text": "${sample}",
    "direction": "${state.direction}",
    "target_apostrophe": "'"
}

response = requests.post(url, json=payload)
data = response.json()

print("Status:", response.status_code)
print("Result:", data["result"])
print("Execution Time:", data["stats"]["execution_time_ms"], "ms")`;
      break;

    case 'httpx':
      snippet = `import httpx
import asyncio

async def transliterate():
    url = "${origin}/v1/transliterate"
    payload = {
        "text": "${sample}",
        "direction": "${state.direction}"
    }
    async with httpx.AsyncClient() as client:
        res = await client.post(url, json=payload)
        data = res.json()
        print("Result:", data["result"])

asyncio.run(transliterate())`;
      break;

    case 'js':
      snippet = `const response = await fetch("${origin}/v1/transliterate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: "${sample}",
    direction: "${state.direction}",
    target_apostrophe: "'"
  })
});

const data = await response.json();
console.log("Result:", data.result);
console.log("Latency:", data.stats.execution_time_ms, "ms");`;
      break;
  }

  codeEl.innerText = snippet;
}

function copyCodeSnippet() {
  const codeEl = document.getElementById('api-code-snippet');
  if (!codeEl) return;
  navigator.clipboard.writeText(codeEl.innerText).then(() => {
    const btnText = document.getElementById('copy-code-text');
    if (btnText) btnText.innerText = "Nusxalandi!";
    setTimeout(() => {
      if (btnText) btnText.innerText = "Nusxalash";
    }, 1500);
    showToast("Kod namunasi nusxalandi!", "success");
  });
}

async function executeApiPlayground() {
  const payloadEl = document.getElementById('api-playground-payload');
  const responseDisplay = document.getElementById('api-response-display');
  const statusBadge = document.getElementById('api-response-status');
  const timeBadge = document.getElementById('api-response-time');

  if (!payloadEl || !responseDisplay) return;

  let payload;
  try {
    payload = JSON.parse(payloadEl.value);
  } catch (e) {
    showToast("JSON sintaksisi noto'g'ri: " + e.message, "error");
    return;
  }

  const startTime = performance.now();
  responseDisplay.innerText = "// So'rov jo'natilmoqda...";

  try {
    const res = await fetch('/v1/transliterate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const elapsed = (performance.now() - startTime).toFixed(1);
    const data = await res.json();

    if (statusBadge) {
      statusBadge.classList.remove('hidden');
      statusBadge.innerText = `${res.status} ${res.statusText || 'OK'}`;
      statusBadge.className = res.ok 
        ? "text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        : "text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20";
    }

    if (timeBadge) {
      timeBadge.classList.remove('hidden');
      timeBadge.innerText = `${elapsed} ms`;
    }

    responseDisplay.innerText = JSON.stringify(data, null, 2);
    showToast("API so'rovi muvaffaqiyatli bajarildi", "success");

  } catch (err) {
    responseDisplay.innerText = `// XATOLIK: ${err.message}`;
    showToast(err.message, "error");
  }
}

// ============================================================================
// Toast Notifications
// ============================================================================
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const toastId = 'toast_' + Math.random().toString(36).substring(2, 7);
  toast.id = toastId;

  let bgClass = "bg-slate-900 border-slate-700 text-slate-100";
  let iconName = "info";
  let iconColor = "text-sky-400";

  if (type === 'success') {
    bgClass = "bg-slate-900 border-emerald-500/30 text-emerald-100";
    iconName = "check-circle-2";
    iconColor = "text-emerald-400";
  } else if (type === 'error') {
    bgClass = "bg-slate-900 border-rose-500/30 text-rose-100";
    iconName = "alert-circle";
    iconColor = "text-rose-400";
  }

  toast.className = `pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-2xl glass-panel ${bgClass} animate-fade-in transition-all duration-300`;
  toast.innerHTML = `
    <div class="flex items-center gap-2.5 text-xs font-medium">
      <i data-lucide="${iconName}" class="w-4 h-4 ${iconColor} shrink-0"></i>
      <span>${escapeHtml(message)}</span>
    </div>
    <button onclick="document.getElementById('${toastId}')?.remove()" class="p-1 rounded text-slate-400 hover:text-white">
      <i data-lucide="x" class="w-3.5 h-3.5"></i>
    </button>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================================================
// Theme Management
// ============================================================================
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.contains('dark');
  applyTheme(isDark ? 'light' : 'dark');
}

function applyTheme(theme) {
  const html = document.documentElement;
  const icon = document.getElementById('theme-icon');

  if (theme === 'light') {
    html.classList.remove('dark');
    html.classList.add('light');
    if (icon) icon.setAttribute('data-lucide', 'moon');
    localStorage.setItem('uzlang_theme', 'light');
  } else {
    html.classList.remove('light');
    html.classList.add('dark');
    if (icon) icon.setAttribute('data-lucide', 'sun');
    localStorage.setItem('uzlang_theme', 'dark');
  }

  if (window.lucide) window.lucide.createIcons();
}

// ============================================================================
// Utilities
// ============================================================================
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
