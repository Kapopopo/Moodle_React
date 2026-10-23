import { describe, it, expect } from 'vitest';
import { aggregate, parisDay, shiftDay } from './aggregate.js';
const rows = (day: string, scores: number[], tag = 'AMBIANCE_EQUIPE') => scores.map(score => ({ day: new Date(day), score, tags: [tag] }));
describe('Privacy-safe aggregation', () => {
  it('suppresses totals, distributions and tags below threshold including global indicators', () => {
    const result = aggregate([...rows('2026-10-14', [1, 2], 'MANAGEMENT'), ...rows('2026-10-15', [3, 4, 5])], 8, '2026-10-15');
    expect(result.days.find(d => d.date === '2026-10-14')).toMatchObject({ masked: true, total: null, distribution: null });
    expect(result.totalResponses).toBe(3);
    expect(result.topTags).toEqual([{ tag: 'AMBIANCE_EQUIPE', share: 1 }]);
    expect(result.days).toHaveLength(30);
  });
  it('includes exactly three responses and excludes dates outside period', () => {
    const result = aggregate([...rows('2026-10-15', [1, 1, 5]), ...rows('2020-01-01', [5, 5, 5])], 8, '2026-10-15');
    expect(result.days.at(-1)).toMatchObject({ masked: false, total: 3, distribution: { '1': 2, '2': 0, '3': 0, '4': 0, '5': 1 } });
    expect(result.totalResponses).toBe(3);
  });
  it('does not distinguish an empty weekday from a small response day', () => {
    const result = aggregate(rows('2026-10-15', [2]), 8, '2026-10-15');
    const empty = result.days.find(d => d.date === '2026-10-14')!;
    const small = result.days.at(-1)!;
    expect([empty.masked, empty.total, empty.distribution]).toEqual([small.masked, small.total, small.distribution]);
  });
  it('does not divide by zero and displays empty weekends', () => {
    const result = aggregate([], 0, '2026-10-18');
    expect(result.participationRate).toBe(0); expect(result.topTags).toEqual([]);
    expect(result.days.at(-1)).toMatchObject({ isWorkday: false, masked: false, total: 0 });
  });
  it('calculates Paris calendar days across midnight and DST', () => {
    expect(parisDay(new Date('2026-10-14T22:30:00Z'))).toBe('2026-10-15');
    expect(parisDay(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01');
    expect(shiftDay('2026-03-29', 1)).toBe('2026-03-30');
  });
});

describe('Centered manager periods', () => {
  it.each([1, 7, 30])('provides %i daily slots with today in the middle', count => {
    const current = '2026-10-23';
    const to = shiftDay(current, count - 1 - Math.floor(count / 2));
    const result = aggregate(rows(current, [3,4,5]), 8, to, count, 3, current);
    expect(result.days).toHaveLength(count);
    expect(result.days[Math.floor(count / 2)].date).toBe(current);
    expect(result.totalResponses).toBe(3);
    expect(result.days.filter(day => day.date > current).every(day => day.future && !day.masked && day.total === 0)).toBe(true);
  });
  it('excludes future days from participation and never exposes their data', () => {
    const result = aggregate([...rows('2026-10-23',[3,4,5]),...rows('2026-10-26',[1,1,1])],3,'2026-10-26',4,3,'2026-10-23');
    expect(result.participationRate).toBe(1);
    expect(result.totalResponses).toBe(3);
    expect(result.days.at(-1)).toMatchObject({future:true,total:0,distribution:null});
  });
});
