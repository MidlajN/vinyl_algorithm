import type { WorkerInMessage, WorkerOutMessage } from '../types';
import { runPipeline } from '../pipeline/analyse';

// ─── OpenCV Loading ───────────────────────────────────────────────────────────
//
// Dev mode: Vite serves ?worker files as module workers regardless of format
// config — importScripts() is unavailable. We load opencv.js via fetch and
// evaluate it with Function(code).call(self). This sets `this = self` in the
// UMD wrapper, so `(function(root, factory){...}(this, fn))` correctly assigns
// root.cv = initialized module instead of crashing on undefined.root.
//
// This opencv.js build is a UMD bundle that publishes `root.cv = factory()`.
// The returned Emscripten module is thenable; that is the reliable readiness
// signal. Vite serves workers as module workers, where importScripts is absent,
// so loadOpenCV() also provides a small importScripts shim while evaluating the
// bundle so Emscripten takes its worker path.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cv: any = null;

function postProgress(stage: string, stageIndex: number, totalStages: number): void {
  self.postMessage({ type: 'progress', stage, stageIndex, totalStages } satisfies WorkerOutMessage);
}

async function loadOpenCV(): Promise<unknown> {
  postProgress('fetching opencv.js', 0, 3);

  const res = await fetch(new URL('/opencv.js', self.location.origin));
  if (!res.ok) throw new Error(`fetch /opencv.js failed: ${res.status}`);
  const code = await res.text();

  postProgress('compiling WASM', 1, 3);

  // Function(code).call(self) sets this=self. The prefix makes this module
  // worker look like a classic worker to Emscripten.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).cv = undefined;
  // eslint-disable-next-line no-new-func
  Function(
    `var self = this;\n` +
    `var importScripts = this.importScripts || function() {};\n` +
    `${code}\n`,
  ).call(self);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const module = (self as any).cv;
  if (!module) throw new Error('opencv.js did not publish self.cv');

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('OpenCV module.then timeout (90s)')),
      90_000,
    );

    const finish = () => {
      clearTimeout(timeout);
      resolve();
    };

    if (module.calledRun || typeof module.Mat === 'function') {
      finish();
      return;
    }

    if (typeof module.then === 'function') {
      module.then(finish);
      return;
    }

    clearTimeout(timeout);
    reject(new Error('OpenCV module has no readiness signal'));
  });

  postProgress('opencv ready', 2, 3);

  // Emscripten modules are thenable. Returning a thenable from an async
  // function causes Promise resolution to assimilate it again, which can keep
  // the worker from ever posting its final ready message.
  module.then = undefined;

  return module;
}

// ─── Stub cv for noopencv mode ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeStubCv(): any {
  const stubMat = () => ({ empty: () => false, rows: 600, cols: 800, delete: () => {} });
  // Regular functions required — arrow functions cannot be used with `new`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function StubMat(this: any) { return stubMat(); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function StubSize(this: any, w: number, h: number) { return { width: w, height: h }; }
  return {
    _stub: true,
    matFromImageData: stubMat,
    Mat: StubMat,
    Size: StubSize,
    COLOR_RGBA2GRAY: 0,
    cvtColor: () => {},
    GaussianBlur: () => {},
  };
}

// ─── Message Handler ──────────────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;

  if (msg.type === 'init') {
    try {
      // noOpenCV=true — skip WASM load, use stub (infra / preview testing only)
      if (msg.noOpenCV) {
        cv = makeStubCv();
      } else {
        cv = await loadOpenCV();
      }
      self.postMessage({ type: 'ready' } satisfies WorkerOutMessage);
    } catch (err) {
      self.postMessage({
        type: 'error',
        message: `OpenCV init failed: ${String(err)}`,
      } satisfies WorkerOutMessage);
    }
    return;
  }

  if (msg.type === 'analyse') {
    if (!cv) {
      self.postMessage({
        type: 'error',
        message: 'Worker not initialized — send { type: "init" } first',
      } satisfies WorkerOutMessage);
      return;
    }

    const onProgress = (stage: string, stageIndex: number, totalStages: number) => {
      self.postMessage({ type: 'progress', stage, stageIndex, totalStages } satisfies WorkerOutMessage);
    };

    try {
      const result = await runPipeline(cv, msg.imageData, msg.config ?? {}, onProgress);
      self.postMessage({ type: 'result', result } satisfies WorkerOutMessage);
    } catch (err) {
      self.postMessage({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      } satisfies WorkerOutMessage);
    }
  }
};
