import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  ExternalLink, 
  Play, 
  Terminal, 
  Send, 
  Server,
  FileCode,
  Globe
} from 'lucide-react';

export const ApiDocsPlayground = ({ addToast }) => {
  const [activeTab, setActiveTab] = useState('curl');
  const [endpoint, setEndpoint] = useState('/v1/transliterate');
  const [sampleText, setSampleText] = useState("O'zbekiston Respublikasi");
  const [direction, setDirection] = useState("latin_to_cyrillic");
  const [copied, setCopied] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);

  const getCodeSnippet = () => {
    const escapedText = sampleText.replace(/"/g, '\\"');
    const baseUrl = window.location.origin;

    switch (activeTab) {
      case 'curl':
        return `curl -X POST "${baseUrl}/v1/transliterate" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "${sampleText.replace(/'/g, "\\'")}",
    "direction": "${direction}",
    "target_apostrophe": "'"
  }'`;

      case 'python':
        return `import requests

url = "${baseUrl}/v1/transliterate"
payload = {
    "text": "${escapedText}",
    "direction": "${direction}",
    "target_apostrophe": "'"
}

response = requests.post(url, json=payload)
data = response.json()

print("Status:", response.status_code)
print("Result:", data["result"])
print("Execution Time:", data["stats"]["execution_time_ms"], "ms")`;

      case 'python_httpx':
        return `import httpx
import asyncio

async def transliterate():
    url = "${baseUrl}/v1/transliterate"
    payload = {
        "text": "${escapedText}",
        "direction": "${direction}"
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload)
        return response.json()

result = asyncio.run(transliterate())
print("Result:", result["result"])`;

      case 'js_fetch':
        return `const response = await fetch("${baseUrl}/v1/transliterate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    text: "${escapedText}",
    direction: "${direction}",
    target_apostrophe: "'"
  })
});

const data = await response.json();
console.log("Result:", data.result);
console.log("Stats:", data.stats);`;

      case 'js_axios':
        return `import axios from 'axios';

const { data } = await axios.post("${baseUrl}/v1/transliterate", {
  text: "${escapedText}",
  direction: "${direction}"
});

console.log("Transliterated:", data.result);`;

      case 'go':
        return `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

func main() {
	url := "${baseUrl}/v1/transliterate"
	payload, _ := json.Marshal(map[string]string{
		"text":      "${escapedText}",
		"direction": "${direction}",
	})

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(payload))
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	fmt.Println("Response Status:", resp.Status)
}`;

      case 'php':
        return `<?php
$ch = curl_init("${baseUrl}/v1/transliterate");

$payload = json_encode([
    "text" => "${escapedText}",
    "direction" => "${direction}"
]);

curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type:application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$result = curl_exec($ch);
curl_close($ch);

$data = json_decode($result, true);
echo "Result: " . $data["result"];
?>`;

      case 'file_curl':
        return `# 1. Katta hajmli PDF / DOCX kitobni asinxron yuborish
curl -X POST "${baseUrl}/v1/jobs/submit" \\
  -F "file=@/path/to/large_book.pdf" \\
  -F "direction=${direction}"

# 2. Real-vaqtda progress va sahifalarni kuzatish
curl "${baseUrl}/v1/jobs/job_xxxxxx"

# 3. Tayyor faylni yuklab olish
curl -O "${baseUrl}/v1/jobs/job_xxxxxx/download"`;

      default:
        return '';
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getCodeSnippet());
    setCopied(true);
    addToast?.("Kod nusxalandi!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const executeLiveTest = async () => {
    setApiLoading(true);
    setApiResponse(null);
    const start = performance.now();

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          direction: direction,
          target_apostrophe: "'"
        })
      });

      const data = await res.json();
      const roundTripMs = Math.round(performance.now() - start);

      setApiResponse({
        status: res.status,
        statusText: res.statusText,
        roundTripMs,
        data
      });
      addToast?.("API muvaffaqiyatli javob qaytardi", "success");
    } catch (err) {
      setApiResponse({
        error: err.message
      });
      addToast?.(`API xatosi: ${err.message}`, "error");
    } finally {
      setApiLoading(false);
    }
  };

  const tabs = [
    { id: 'curl', label: 'cURL' },
    { id: 'python', label: 'Python (requests)' },
    { id: 'python_httpx', label: 'Python (httpx)' },
    { id: 'js_fetch', label: 'JavaScript (Fetch)' },
    { id: 'js_axios', label: 'Node.js / Axios' },
    { id: 'go', label: 'Go' },
    { id: 'php', label: 'PHP' },
    { id: 'file_curl', label: 'File Upload (cURL)' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Dasturchilar Markazi (API SDK Hub)</h2>
            <p className="text-xs text-slate-400">Har qanday dasturlash tilida tezkor integratsiya va jonli tester</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-brand-400" />
            <span>Interactive OpenAPI (Swagger)</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
          <a
            href="/redoc"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <span>ReDoc Spec</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Code Snippet Card */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        {/* Languages Tabs */}
        <div className="p-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-brand-400" />}
            <span>{copied ? 'Nusxalandi' : 'Kodni nusxalash'}</span>
          </button>
        </div>

        {/* Code Content */}
        <div className="p-4 bg-slate-950 font-mono text-xs text-slate-200 overflow-x-auto select-all">
          <pre className="leading-relaxed">
            <code>{getCodeSnippet()}</code>
          </pre>
        </div>
      </div>

      {/* Interactive REST API Live Tester */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-400" />
            Interaktiv API Tester
          </h3>
          <span className="text-[11px] font-mono text-slate-500">POST /v1/transliterate</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">So'rov matni (Payload text)</label>
            <input
              type="text"
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Yo'nalish</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="latin_to_cyrillic">latin_to_cyrillic</option>
              <option value="cyrillic_to_latin">cyrillic_to_latin</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={executeLiveTest}
            disabled={apiLoading || !sampleText}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 disabled:opacity-40 transition-all"
          >
            {apiLoading ? <Terminal className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>So'rovni Yuborish (Send Request)</span>
          </button>
        </div>

        {/* Live Response Box */}
        {apiResponse && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-800 text-slate-400">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded font-bold ${
                  apiResponse.status === 200 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}>
                  HTTP {apiResponse.status} {apiResponse.statusText}
                </span>
                <span>Round-trip: {apiResponse.roundTripMs} ms</span>
              </div>
              <span className="text-slate-500">application/json</span>
            </div>

            <pre className="text-emerald-400 overflow-x-auto p-2 bg-slate-900/60 rounded-lg">
              {JSON.stringify(apiResponse.data || apiResponse.error, null, 2)}
            </pre>
          </div>
        )}
      </div>

    </div>
  );
};
