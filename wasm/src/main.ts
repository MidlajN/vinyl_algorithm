// ─── Dev Harness ──────────────────────────────────────────────────────────────
//
// Standalone dev tool for:
//   - Running the WASM pipeline against a real image
//   - Compare mode (?mode=compare): sends same image to backend + WASM
//   - Shows per-stage timings and comparison report
//
// NOT part of the production frontend. Never modify frontend/ for this.

import type { WorkerOutMessage, WorkerInMessage, AnalysisResult } from './types';
import { adaptiveResize, detectDeviceCapability } from './utils/resize';
import { loadImageFromFile } from './utils/image';
import { analyseWithBackend, buildCompareReport, logCompareReport } from './compare/compare';
import VinylWorker from './workers/vinyl.worker?worker';

// ─── State ────────────────────────────────────────────────────────────────────

const params = new URLSearchParams(location.search);
const compareMode = params.get('mode') === 'compare';

let worker: Worker | null = null;
let workerReady = false;
let pendingResolve: ((r: AnalysisResult) => void) | null = null;
let pendingReject: ((e: Error) => void) | null = null;

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const dropzone = document.getElementById('dropzone')!;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const analyseBtn = document.getElementById('analyseBtn') as HTMLButtonElement;
const statusEl = document.getElementById('status')!;
const timingsEl = document.getElementById('timings')!;
const tracksEl = document.getElementById('tracks')!;
const compareEl = document.getElementById('compareReport')!;
const deviceEl = document.getElementById('deviceInfo')!;
const previewImg = document.getElementById('preview') as HTMLImageElement;

// ─── Worker setup ─────────────────────────────────────────────────────────────

function initWorker(): void {
  worker = new VinylWorker();

  worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
    const msg = e.data;

    if (msg.type === 'ready') {
      workerReady = true;
      setStatus('OpenCV ready. Drop an image or click Choose File.', 'ok');
      analyseBtn.disabled = false;
      return;
    }

    if (msg.type === 'progress') {
      setStatus(
        `${msg.stage}… (${msg.stageIndex + 1}/${msg.totalStages})`,
        'busy',
      );
      return;
    }

    if (msg.type === 'result') {
      pendingResolve?.(msg.result);
      pendingResolve = null;
      pendingReject = null;
      return;
    }

    if (msg.type === 'error') {
      pendingReject?.(new Error(msg.message));
      pendingResolve = null;
      pendingReject = null;
      setStatus(`Error: ${msg.message}`, 'error');
    }
  };

  worker.onerror = (e) => {
    setStatus(`Worker crashed: ${e.message}`, 'error');
  };

  setStatus('Loading OpenCV.js…', 'busy');
  const noOpenCV = params.get('noopencv') === '1';
  worker.postMessage({ type: 'init', noOpenCV } satisfies WorkerInMessage);
}

function runAnalysis(imageData: ImageData): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;
    worker!.postMessage({ type: 'analyse', imageData } satisfies WorkerInMessage);
  });
}

// ─── Image handling ───────────────────────────────────────────────────────────

let currentFile: File | null = null;

function onFile(file: File): void {
  currentFile = file;
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  previewImg.style.display = 'block';
  analyseBtn.disabled = !workerReady;
  setStatus(`Loaded: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`, 'ok');
  timingsEl.textContent = '';
  tracksEl.textContent = '';
  compareEl.textContent = '';
}

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('drag-over');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  const file = e.dataTransfer?.files[0];
  if (file?.type.startsWith('image/')) onFile(file);
});

dropzone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) onFile(file);
});

// ─── Analysis ─────────────────────────────────────────────────────────────────

analyseBtn.addEventListener('click', async () => {
  if (!currentFile || !worker || !workerReady) return;

  analyseBtn.disabled = true;
  timingsEl.textContent = '';
  tracksEl.textContent = '';
  compareEl.textContent = '';

  try {
    setStatus('Reading image…', 'busy');
    const raw = await loadImageFromFile(currentFile);

    setStatus('Resizing for device…', 'busy');
    const { imageData, scale, targetLongestSide } = adaptiveResize(raw);
    setStatus(
      `Analysing at ${imageData.width}×${imageData.height} ` +
      `(scale=${scale.toFixed(2)}, target=${targetLongestSide}px)…`,
      'busy',
    );

    // Run WASM pipeline
    const t0 = performance.now();
    const wasmResult = await runAnalysis(imageData);
    const elapsed = performance.now() - t0;

    renderTimings(wasmResult, elapsed);
    renderTracks(wasmResult);
    setStatus(
      `Done in ${elapsed.toFixed(0)}ms — ${wasmResult.tracks.length} track(s) detected`,
      'ok',
    );

    // Compare mode: also hit backend
    if (compareMode) {
      setStatus('Fetching backend result for comparison…', 'busy');
      try {
        const backendResult = await analyseWithBackend(currentFile);
        const report = buildCompareReport(backendResult, wasmResult);
        logCompareReport(report);
        renderCompareReport(report);
        setStatus(
          report.overallPass
            ? `Comparison: ✓ PASS (${elapsed.toFixed(0)}ms)`
            : `Comparison: ✗ FAIL — see compare report`,
          report.overallPass ? 'ok' : 'error',
        );
      } catch (err) {
        setStatus(`Backend compare failed: ${err}`, 'error');
      }
    }
  } catch (err) {
    setStatus(`Analysis failed: ${err}`, 'error');
  } finally {
    analyseBtn.disabled = false;
  }
});

// ─── Render helpers ───────────────────────────────────────────────────────────

function setStatus(msg: string, level: 'ok' | 'busy' | 'error'): void {
  statusEl.textContent = msg;
  statusEl.className = `status ${level}`;
}

function renderTimings(result: AnalysisResult, totalMs: number): void {
  const t = result.timings;
  const rows = Object.entries(t)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => {
      const pct = ((v / totalMs) * 100).toFixed(1);
      const bar = '█'.repeat(Math.max(1, Math.round(parseFloat(pct) / 2)));
      return `${k.padEnd(32)} ${v.toFixed(1).padStart(8)}ms  ${pct.padStart(5)}%  ${bar}`;
    })
    .join('\n');
  timingsEl.textContent = `Pipeline: ${totalMs.toFixed(1)}ms\n\n${rows}`;
}

function renderTracks(result: AnalysisResult): void {
  if (!result.tracks.length) {
    tracksEl.textContent = 'No tracks (pipeline stub — full detection in Phase 2+)';
    return;
  }
  const rows = result.tracks.map((t) =>
    `Track ${t.trackNumber}  start=${t.startRadiusMm.toFixed(1)}mm  ` +
    `end=${t.endRadiusMm.toFixed(1)}mm  width=${t.widthMm.toFixed(1)}mm` +
    (t.servoAngleDeg !== undefined ? `  servo=${t.servoAngleDeg.toFixed(1)}°` : ''),
  );
  tracksEl.textContent = rows.join('\n');
}

function renderCompareReport(
  report: import('./types').CompareReport,
): void {
  const lines = report.fields.map((f) => {
    const icon = f.pass ? '✓' : '✗';
    const tol = f.tolerance !== undefined ? ` (±${f.tolerance})` : '';
    return `${icon} ${f.name.padEnd(28)} backend=${f.backend}  wasm=${f.wasm}${tol}`;
  });
  compareEl.textContent = lines.join('\n');
}

// ─── Device info ──────────────────────────────────────────────────────────────

function renderDeviceInfo(): void {
  const cap = detectDeviceCapability();
  deviceEl.textContent =
    `RAM: ${cap.memoryGB}GB  Cores: ${cap.cpuCores}  Target: ${cap.targetLongestSide}px`;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

renderDeviceInfo();
initWorker();

if (compareMode) {
  document.title = '[COMPARE] Vinyl WASM Dev';
  document.getElementById('compareSection')!.style.display = 'block';
}
