// ─── Compare Mode ─────────────────────────────────────────────────────────────
//
// Sends the same image to both the Python backend and the WASM pipeline,
// then computes a field-by-field diff with tolerance thresholds.
// Used during migration to validate parity before proceeding to next phase.

import type {
  AnalysisResult,
  BackendResult,
  BackendTrack,
  CompareField,
  CompareReport,
  Track,
} from '../types';

// ─── Backend API ──────────────────────────────────────────────────────────────

export async function analyseWithBackend(file: File): Promise<BackendResult> {
  const form = new FormData();
  form.append('image', file);

  const res = await fetch('/api/analyse', { method: 'POST', body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Backend error ${res.status}: ${text}`);
  }
  return res.json() as Promise<BackendResult>;
}

// ─── Field-level comparison ───────────────────────────────────────────────────

function numericField(
  name: string,
  backend: number,
  wasm: number,
  tolerance: number,
): CompareField {
  return {
    name,
    backend,
    wasm,
    tolerance,
    pass: Math.abs(backend - wasm) <= tolerance,
  };
}

export function buildCompareReport(
  backend: BackendResult,
  wasm: AnalysisResult,
): CompareReport {
  const fields: CompareField[] = [];

  // Track count
  const backendCount = backend.tracks?.length ?? 0;
  const wasmCount = wasm.tracks?.length ?? 0;
  const trackCountMatch = backendCount === wasmCount;

  fields.push({
    name: 'track_count',
    backend: backendCount,
    wasm: wasmCount,
    tolerance: 0,
    pass: trackCountMatch,
  });

  // Per-track comparison (up to the shorter list)
  const limit = Math.min(backendCount, wasmCount);
  for (let i = 0; i < limit; i++) {
    const bt: BackendTrack = backend.tracks[i];
    const wt: Track = wasm.tracks[i];

    fields.push(
      numericField(`track[${i + 1}].start_mm`, bt.start_radius_mm, wt.startRadiusMm, 1.0),
      numericField(`track[${i + 1}].end_mm`, bt.end_radius_mm, wt.endRadiusMm, 1.0),
      numericField(`track[${i + 1}].width_mm`, bt.width_mm, wt.widthMm, 0.5),
    );

    if (bt.servo_angle_deg !== undefined && wt.servoAngleDeg !== undefined) {
      fields.push(
        numericField(`track[${i + 1}].servo_deg`, bt.servo_angle_deg, wt.servoAngleDeg, 1.0),
      );
    }
  }

  const overallPass = fields.every((f) => f.pass) && trackCountMatch;
  return { fields, trackCountMatch, overallPass };
}

// ─── Console reporter ─────────────────────────────────────────────────────────

export function logCompareReport(report: CompareReport): void {
  const status = report.overallPass ? '✓ PASS' : '✗ FAIL';
  console.group(`[compare] ${status}`);
  for (const f of report.fields) {
    const icon = f.pass ? '✓' : '✗';
    const tol = f.tolerance !== undefined ? ` (±${f.tolerance})` : '';
    console.log(
      `${icon} ${f.name.padEnd(30)} backend=${f.backend}  wasm=${f.wasm}${tol}`,
    );
  }
  console.groupEnd();
}
