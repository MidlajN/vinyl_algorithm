import { describe, it, expect } from 'vitest';
import { PipelineTimer } from '../src/benchmark/timer';

describe('PipelineTimer', () => {
  it('records elapsed time for a stage', async () => {
    const t = new PipelineTimer();
    t.mark('stage_a');
    await new Promise((r) => setTimeout(r, 10));
    const elapsed = t.end('stage_a');
    expect(elapsed).toBeGreaterThan(5);
  });

  it('wrap() returns the function result', () => {
    const t = new PipelineTimer();
    const result = t.wrap('add', () => 1 + 2);
    expect(result).toBe(3);
    expect(t.getTimings()['add']).toBeGreaterThanOrEqual(0);
  });

  it('total() sums all stages', async () => {
    const t = new PipelineTimer();
    t.mark('a'); await new Promise((r) => setTimeout(r, 5)); t.end('a');
    t.mark('b'); await new Promise((r) => setTimeout(r, 5)); t.end('b');
    const total = t.total();
    expect(total).toBeGreaterThan(8);
  });

  it('getTimings() returns a copy, not internal state', () => {
    const t = new PipelineTimer();
    t.mark('x'); t.end('x');
    const snap1 = t.getTimings();
    t.mark('y'); t.end('y');
    expect(Object.keys(snap1)).toHaveLength(1);
  });

  it('summary() includes all stage names', async () => {
    const t = new PipelineTimer();
    t.mark('alpha'); await new Promise((r) => setTimeout(r, 2)); t.end('alpha');
    t.mark('beta');  await new Promise((r) => setTimeout(r, 2)); t.end('beta');
    const s = t.summary();
    expect(s).toContain('alpha');
    expect(s).toContain('beta');
  });
});
