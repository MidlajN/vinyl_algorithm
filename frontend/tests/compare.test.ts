import { describe, it, expect } from 'vitest';
import { buildCompareReport } from '../src/compare/compare';
import type { BackendResult, AnalysisResult } from '../src/types';

const backendResult: BackendResult = {
  success: true,
  tracks: [
    {
      track_number: 1,
      start_radius_px: 535,
      end_radius_px: 380,
      start_radius_mm: 141.3,
      end_radius_mm: 100.3,
      width_px: 155,
      width_mm: 40.9,
      servo_angle_deg: 45.2,
    },
    {
      track_number: 2,
      start_radius_px: 375,
      end_radius_px: 223,
      start_radius_mm: 99.0,
      end_radius_mm: 58.9,
      width_px: 152,
      width_mm: 40.1,
      servo_angle_deg: 62.1,
    },
  ],
};

const perfectWasmResult: AnalysisResult = {
  success: true,
  tracks: [
    {
      trackNumber: 1,
      startRadiusPx: 535,
      endRadiusPx: 380,
      startRadiusMm: 141.3,
      endRadiusMm: 100.3,
      widthPx: 155,
      widthMm: 40.9,
      servoAngleDeg: 45.2,
    },
    {
      trackNumber: 2,
      startRadiusPx: 375,
      endRadiusPx: 223,
      startRadiusMm: 99.0,
      endRadiusMm: 58.9,
      widthPx: 152,
      widthMm: 40.1,
      servoAngleDeg: 62.1,
    },
  ],
  separators: [],
  ppm: 3.787,
  timings: {},
};

describe('buildCompareReport', () => {
  it('passes when WASM matches backend within tolerance', () => {
    const report = buildCompareReport(backendResult, perfectWasmResult);
    expect(report.overallPass).toBe(true);
    expect(report.trackCountMatch).toBe(true);
  });

  it('fails when track count differs', () => {
    const wasm = { ...perfectWasmResult, tracks: [perfectWasmResult.tracks[0]] };
    const report = buildCompareReport(backendResult, wasm);
    expect(report.overallPass).toBe(false);
    expect(report.trackCountMatch).toBe(false);
  });

  it('fails when start_mm exceeds tolerance', () => {
    const wasm = {
      ...perfectWasmResult,
      tracks: [
        { ...perfectWasmResult.tracks[0], startRadiusMm: 144.0 }, // off by 2.7mm > 1.0 tolerance
        perfectWasmResult.tracks[1],
      ],
    };
    const report = buildCompareReport(backendResult, wasm);
    expect(report.overallPass).toBe(false);
    const field = report.fields.find((f) => f.name === 'track[1].start_mm');
    expect(field?.pass).toBe(false);
  });

  it('passes within tolerance boundary', () => {
    const wasm = {
      ...perfectWasmResult,
      tracks: [
        { ...perfectWasmResult.tracks[0], startRadiusMm: 142.2 }, // off by 0.9mm < 1.0
        perfectWasmResult.tracks[1],
      ],
    };
    const report = buildCompareReport(backendResult, wasm);
    const field = report.fields.find((f) => f.name === 'track[1].start_mm');
    expect(field?.pass).toBe(true);
  });
});
