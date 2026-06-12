import { describe, it, expect } from 'vitest';
import { computeTargetDimensions } from '../src/utils/resize';

describe('computeTargetDimensions', () => {
  it('returns original dims when image is already small enough', () => {
    const r = computeTargetDimensions(800, 600, 1200);
    expect(r.width).toBe(800);
    expect(r.height).toBe(600);
    expect(r.scale).toBe(1.0);
  });

  it('scales down a landscape image correctly', () => {
    const r = computeTargetDimensions(3000, 2000, 1200);
    expect(r.width).toBe(1200);
    expect(r.height).toBe(800);
    expect(r.scale).toBeCloseTo(0.4, 5);
  });

  it('scales down a portrait image correctly', () => {
    const r = computeTargetDimensions(2000, 3000, 1200);
    expect(r.width).toBe(800);
    expect(r.height).toBe(1200);
    expect(r.scale).toBeCloseTo(0.4, 5);
  });

  it('handles square images', () => {
    const r = computeTargetDimensions(2400, 2400, 1200);
    expect(r.width).toBe(1200);
    expect(r.height).toBe(1200);
    expect(r.scale).toBeCloseTo(0.5, 5);
  });

  it('does not upscale small images', () => {
    const r = computeTargetDimensions(400, 300, 1200);
    expect(r.scale).toBe(1.0);
  });

  it('exact target size returns scale 1.0', () => {
    const r = computeTargetDimensions(1200, 800, 1200);
    expect(r.scale).toBe(1.0);
  });
});
