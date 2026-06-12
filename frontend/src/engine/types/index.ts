// ─── Geometry ────────────────────────────────────────────────────────────────

export interface VinylGeometry {
  center: [number, number];
  radiusPx: number;
  majorRadiusPx: number;
  minorRadiusPx: number;
  angle: number;
}

export interface SpindleResult {
  x: number;
  y: number;
  radiusPx: number;
  score: number;
}

export interface LabelResult {
  center: [number, number];
  radiusPx: number;
  score: number;
  leftTransition: number;
  rightTransition: number;
}

export interface PlayableResult {
  outerPlayableRadiusPx: number;
  innerPlayableRadiusPx: number;
}

// ─── Separators & Tracks ─────────────────────────────────────────────────────

export interface Separator {
  radiusPx: number;
  radiusMm: number;
  energy: number;
  prominence: number;
  widthPx: number;
  widthMm: number;
  score: number;
  leftPx: number;
  rightPx: number;
}

export interface Track {
  trackNumber: number;
  startRadiusPx: number;
  endRadiusPx: number;
  startRadiusMm: number;
  endRadiusMm: number;
  widthPx: number;
  widthMm: number;
  servoAngleDeg?: number;
}

// ─── Pipeline Result ──────────────────────────────────────────────────────────

export interface AnalysisResult {
  success: boolean;
  tracks: Track[];
  separators: Separator[];
  ppm: number;
  timings: Record<string, number>;
  debug?: AnalysisDebugReport;
  error?: string;
}

export interface AnalysisConfig {
  debug?: boolean;
  // Override adaptive resize (px on longest side).
  // If omitted, adaptiveTargetSize() decides.
  maxSize?: number;
}

export interface AnalysisDebugImage {
  name: string;
  width: number;
  height: number;
  dataUrl: string;
}

export interface AnalysisDebugStage {
  stage: string;
  data: Record<string, unknown>;
}

export interface AnalysisDebugReport {
  stages: AnalysisDebugStage[];
  images: AnalysisDebugImage[];
}

// ─── Worker Protocol ──────────────────────────────────────────────────────────

export type WorkerInMessage =
  | { type: 'init'; noOpenCV?: boolean }
  | { type: 'analyse'; imageData: ImageData; config?: AnalysisConfig };

export type WorkerOutMessage =
  | { type: 'ready' }
  | { type: 'progress'; stage: string; stageIndex: number; totalStages: number }
  | { type: 'result'; result: AnalysisResult }
  | { type: 'error'; message: string };

// ─── Compare Mode ─────────────────────────────────────────────────────────────

export interface BackendTrack {
  track_number: number;
  start_radius_px: number;
  end_radius_px: number;
  start_radius_mm: number;
  end_radius_mm: number;
  width_px: number;
  width_mm: number;
  servo_angle_deg?: number;
}

export interface BackendResult {
  success: boolean;
  tracks: BackendTrack[];
}

export interface CompareField {
  name: string;
  backend: number | string;
  wasm: number | string;
  tolerance?: number;
  pass: boolean;
}

export interface CompareReport {
  fields: CompareField[];
  trackCountMatch: boolean;
  overallPass: boolean;
}
