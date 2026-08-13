// State variables
let currentDirection = "latin_to_cyrillic";
let currentMode = "text"; // "text" or "file"
let selectedFile = null;
let customDictionary = {};
let activeCodeTab = "curl";
let debounceTimer = null;
let activeJobId = null;
let jobPollInterval = null;

const samples = {
    1: {
        latin: "O'zbekiston Respublikasi kelajagi buyuk davlatdir. Ma'no va e'tibor bilan shahar va qishloqlarni obod qilamiz.",
        cyrillic: "Ўзбекистон Республикаси келажаги буюк давлатдир. Маъно ва эътибор билан шаҳар ва қишлоқларни обод қиламиз."
    },
    2: {
        latin: "Toshkent shahri markazidagi choyxona va bodring konservalari zo'r.",
        cyrillic: "Тошкент шаҳри марказидаги чойхона ва бодринг консерваллари зўр."
    },
    3: {
        latin: "Yevropa va Osiyo qit'alarida yosh va tajribali mutaxassislar bor.",
        cyrillic: "Европа ва Осиё қитъаларида ёш ва тажрибали мутахассислар бор."
    }
};

document.addEventListener("DOMContentLoaded", () => {
    updateLabels();
    updateCodeSnippet();
    triggerTransliteration();
    initDragAndDrop();
});

function switchMode(mode) {
    currentMode = mode;
    document.getElementById("mode-text-btn").classList.toggle("active", mode === "text");
    document.getElementById("mode-file-btn").classList.toggle("active", mode === "file");

    document.getElementById("text-mode-view").classList.toggle("hidden", mode !== "text");
    document.getElementById("file-mode-view").classList.toggle("hidden", mode !== "file");
    document.getElementById("text-samples").classList.toggle("hidden", mode !== "text");

    updateCodeSnippet();
}

function setDirection(dir) {
    currentDirection = dir;
    document.getElementById("btn-latin-to-cyrillic").classList.toggle("active", dir === "latin_to_cyrillic");
    document.getElementById("btn-cyrillic-to-latin").classList.toggle("active", dir === "cyrillic_to_latin");
    updateLabels();

    if (currentMode === "text") {
        triggerTransliteration();
    }
}

function swapDirection() {
    if (currentMode === "text") {
        const tgtText = document.getElementById("target-text").innerText;
        currentDirection = (currentDirection === "latin_to_cyrillic") ? "cyrillic_to_latin" : "latin_to_cyrillic";
        document.getElementById("source-text").value = tgtText;
    } else {
        currentDirection = (currentDirection === "latin_to_cyrillic") ? "cyrillic_to_latin" : "latin_to_cyrillic";
    }
    
    document.getElementById("btn-latin-to-cyrillic").classList.toggle("active", currentDirection === "latin_to_cyrillic");
    document.getElementById("btn-cyrillic-to-latin").classList.toggle("active", currentDirection === "cyrillic_to_latin");

    updateLabels();
    if (currentMode === "text") {
        triggerTransliteration();
    }
}

function updateLabels() {
    const isLatin = currentDirection === "latin_to_cyrillic";
    document.getElementById("source-label").innerHTML = isLatin 
        ? `<i class="fa-solid fa-pen"></i> Lotin matni (Manba)` 
        : `<i class="fa-solid fa-pen"></i> Kirill matni (Manba)`;
    
    document.getElementById("target-label").innerHTML = isLatin 
        ? `<i class="fa-solid fa-wand-magic-sparkles"></i> Kirill matni (Natija)` 
        : `<i class="fa-solid fa-wand-magic-sparkles"></i> Lotin matni (Natija)`;
}

function onSourceInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        triggerTransliteration();
    }, 150);
}

async function triggerTransliteration() {
    const text = document.getElementById("source-text").value;
    const statsElem = document.getElementById("source-stats");
    const targetStatsElem = document.getElementById("target-stats");
    const latencyBadge = document.getElementById("latency-badge");

    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    statsElem.innerText = `${text.length} belgilar | ${words} so'zlar`;

    if (!text.trim()) {
        document.getElementById("target-text").innerText = "";
        targetStatsElem.innerText = "0 belgilar";
        latencyBadge.innerHTML = `<i class="fa-solid fa-stopwatch"></i> 0.0 ms`;
        return;
    }

    try {
        const payload = {
            text: text,
            direction: currentDirection,
            user_dictionary: Object.keys(customDictionary).length > 0 ? customDictionary : null
        };

        const response = await fetch("/v1/transliterate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("API xatosi");

        const data = await response.json();
        document.getElementById("target-text").innerText = data.result;
        targetStatsElem.innerText = `${data.result.length} belgilar`;
        latencyBadge.innerHTML = `<i class="fa-solid fa-stopwatch"></i> ${data.stats.execution_time_ms} ms`;
        
        updateCodeSnippet();
    } catch (err) {
        console.error("Transliteration Error:", err);
    }
}

/* File Upload Logic & Drag & Drop */
function initDragAndDrop() {
    const dropZone = document.getElementById("drop-zone");

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            onFileSelected(files[0]);
        }
    });
}

function onFileSelected(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['docx', 'pdf', 'txt'].includes(ext)) {
        alert("Faqat .docx, .pdf va .txt formatdagi fayllar qo'llab-quvvatlanadi!");
        return;
    }

    selectedFile = file;
    document.getElementById("file-name").innerText = file.name;
    document.getElementById("file-size").innerText = formatBytes(file.size);

    const icon = document.getElementById("file-type-icon");
    if (ext === 'docx') icon.className = "fa-solid fa-file-word file-icon";
    else if (ext === 'pdf') icon.className = "fa-solid fa-file-pdf file-icon";
    else icon.className = "fa-solid fa-file-lines file-icon";

    document.getElementById("file-selected-card").classList.remove("hidden");
    document.getElementById("file-status").classList.add("hidden");
    document.getElementById("file-progress-container").classList.add("hidden");
}

function removeSelectedFile() {
    selectedFile = null;
    clearInterval(jobPollInterval);
    document.getElementById("file-input").value = "";
    document.getElementById("file-selected-card").classList.add("hidden");
    document.getElementById("file-status").classList.add("hidden");
    document.getElementById("file-progress-container").classList.add("hidden");
}

/* Async Document Transliteration & Live Progress Tracker */
async function uploadAndTransliterateFile() {
    if (!selectedFile) return;

    const statusElem = document.getElementById("file-status");
    const progressContainer = document.getElementById("file-progress-container");
    const btn = document.getElementById("btn-process-file");
    const spinner = document.getElementById("progress-spinner");
    const statusText = document.getElementById("progress-status-text");

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Yuborilmoqda...`;

    statusElem.className = "file-status hidden";
    progressContainer.classList.remove("hidden");

    // Activate spinner and title ONLY when process actually starts
    spinner.classList.remove("hidden");
    statusText.innerText = "Kitob transliteratsiya qilinmoqda...";

    try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("direction", currentDirection);

        // Submit Async Job
        const response = await fetch("/v1/jobs/submit", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Fayl yuborishda xatolik");
        }

        const data = await response.json();
        activeJobId = data.job_id;

        document.getElementById("log-job-id").innerText = `JOB ID: ${activeJobId}`;
        document.getElementById("log-stream-body").innerHTML = `<div class="log-line info">[${new Date().toLocaleTimeString()}] Task navbatga qo'yildi. ${selectedFile.name}</div>`;

        // Start polling progress every 800ms
        clearInterval(jobPollInterval);
        jobPollInterval = setInterval(() => pollJobStatus(activeJobId), 800);
    } catch (err) {
        spinner.classList.add("hidden");
        statusText.innerText = "Fayl yuborishda xatolik";
        statusElem.className = "file-status error";
        statusElem.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Xatolik: ${err.message}`;
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-file-export"></i> Transliteratsiya va Yuklab olish`;
    }
}

async function pollJobStatus(jobId) {
    try {
        const res = await fetch(`/v1/jobs/${jobId}`);
        if (!res.ok) return;

        const data = await res.json();

        // Update progress bar & counts
        document.getElementById("progress-percent").innerText = `${data.progress_percent}%`;
        document.getElementById("progress-bar-fill").style.width = `${data.progress_percent}%`;
        document.getElementById("progress-page-info").innerText = `Sahifa ${data.current_page} / ${data.total_pages}`;
        document.getElementById("progress-time-info").innerText = `O'tgan vaqt: ${data.elapsed_seconds}s`;

        // Render live logs
        const logBody = document.getElementById("log-stream-body");
        if (data.logs && data.logs.length > 0) {
            logBody.innerHTML = data.logs.map(l => `<div class="log-line ${l.includes('ERROR') ? 'error' : l.includes('Completed') ? 'success' : 'info'}">${escapeHtml(l)}</div>`).join('');
            logBody.scrollTop = logBody.scrollHeight;
        }

        if (data.status === "completed") {
            clearInterval(jobPollInterval);
            onJobCompleted(jobId, data.output_filename);
        } else if (data.status === "failed") {
            clearInterval(jobPollInterval);
            onJobFailed(data.error);
        }
    } catch (err) {
        console.error("Poll Error:", err);
    }
}

function onJobCompleted(jobId, outFileName) {
    const statusElem = document.getElementById("file-status");
    const btn = document.getElementById("btn-process-file");
    const spinner = document.getElementById("progress-spinner");
    const statusText = document.getElementById("progress-status-text");

    // Hide spinner once completed
    spinner.classList.add("hidden");
    statusText.innerText = "Transliteratsiya muvaffaqiyatli yakunlandi!";
    document.getElementById("progress-percent").innerText = "100%";
    document.getElementById("progress-bar-fill").style.width = "100%";

    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-download"></i> Transliteratsiya qilindi (Qayta yuklash)`;

    // Auto-trigger download from API
    window.location.href = `/v1/jobs/${jobId}/download`;

    statusElem.className = "file-status success";
    statusElem.innerHTML = `<i class="fa-solid fa-circle-check"></i> Kitob muvaffaqiyatli transliteratsiya qilindi va yuklab olindi: <strong>${outFileName || 'hujjat_transliterated.pdf'}</strong>`;
}

function onJobFailed(errorMsg) {
    const statusElem = document.getElementById("file-status");
    const btn = document.getElementById("btn-process-file");
    const spinner = document.getElementById("progress-spinner");
    const statusText = document.getElementById("progress-status-text");

    // Hide spinner on failure
    spinner.classList.add("hidden");
    statusText.innerText = "Jarayon to'xtatildi (Xatolik)";

    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-file-export"></i> Transliteratsiya va Yuklab olish`;

    statusElem.className = "file-status error";
    statusElem.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Xatolik: ${errorMsg}`;
}


function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function loadSample(num) {
    const sample = samples[num];
    if (!sample) return;

    if (currentDirection === "latin_to_cyrillic") {
        document.getElementById("source-text").value = sample.latin;
    } else {
        document.getElementById("source-text").value = sample.cyrillic;
    }
    triggerTransliteration();
}

function clearSource() {
    document.getElementById("source-text").value = "";
    triggerTransliteration();
}

function copyResult() {
    const text = document.getElementById("target-text").innerText;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        alert("Natija buferga nusxalandi!");
    });
}

function toggleDrawer() {
    const body = document.getElementById("drawer-content");
    const icon = document.getElementById("drawer-icon");
    body.classList.toggle("hidden");
    icon.classList.toggle("fa-chevron-down");
    icon.classList.toggle("fa-chevron-up");
}

function addDictRule() {
    const latinInput = document.getElementById("dict-latin");
    const cyrillicInput = document.getElementById("dict-cyrillic");

    const latin = latinInput.value.trim();
    const cyrillic = cyrillicInput.value.trim();

    if (!latin || !cyrillic) return;

    customDictionary[latin.toLowerCase()] = cyrillic.toLowerCase();

    const tagsContainer = document.getElementById("dict-tags");
    const tag = document.createElement("div");
    tag.className = "dict-chip";
    tag.innerHTML = `<span>${latin} ↔ ${cyrillic}</span> <i class="fa-solid fa-xmark" style="cursor:pointer" onclick="removeDictRule('${latin.toLowerCase()}', this)"></i>`;
    tagsContainer.appendChild(tag);

    latinInput.value = "";
    cyrillicInput.value = "";

    triggerTransliteration();
}

function removeDictRule(key, elem) {
    delete customDictionary[key];
    elem.parentElement.remove();
    triggerTransliteration();
}

function switchCodeTab(tab) {
    activeCodeTab = tab;
    document.querySelectorAll(".code-tab").forEach(btn => btn.classList.remove("active"));
    event.target.classList.add("active");
    updateCodeSnippet();
}


function updateCodeSnippet() {
    const text = document.getElementById("source-text").value || "O'zbekiston";
    const codeDisplay = document.getElementById("code-display");

    if (activeCodeTab === "curl") {
        codeDisplay.innerText = `curl -X POST "http://localhost:8000/v1/transliterate" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "${text.replace(/'/g, "\\'")}",
    "direction": "${currentDirection}"
  }'`;
    } else if (activeCodeTab === "python") {
        codeDisplay.innerText = `import requests

url = "http://localhost:8000/v1/transliterate"
payload = {
    "text": "${text.replace(/"/g, '\\"')}",
    "direction": "${currentDirection}"
}

response = requests.post(url, json=payload)
data = response.json()
print("Result:", data["result"])`;
    } else if (activeCodeTab === "js") {
        codeDisplay.innerText = `const response = await fetch("http://localhost:8000/v1/transliterate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: "${text.replace(/"/g, '\\"')}",
    direction: "${currentDirection}"
  })
});

const data = await response.json();
console.log("Result:", data.result);`;
    } else if (activeCodeTab === "file_curl") {
        codeDisplay.innerText = `# 1. Large Book Async Submit
curl -X POST "http://localhost:8000/v1/jobs/submit" \\
  -F "file=@/path/to/large_book.pdf" \\
  -F "direction=${currentDirection}"

# 2. Check Real-Time Progress Log
curl "http://localhost:8000/v1/jobs/job_12345"

# 3. Download Result Document
curl -O "http://localhost:8000/v1/jobs/job_12345/download"`;
    }
}
