export function parisDay(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function shiftDay(day: string, offset: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function isWorkday(day: string) { const n = new Date(`${day}T00:00:00Z`).getUTCDay(); return n !== 0 && n !== 6; }
export type Entry = { day: Date; score: number; tags: string[] };
/** Suppress all counts and tag contributions from days below the privacy threshold. */
export function aggregate(entries: Entry[], employeeCount: number, to: string, count = 30, minimum = 3, currentDay = parisDay()) {
  const from = shiftDay(to, 1 - count);
  const tagCounts: Record<string, number> = {};
  let totalResponses = 0, workdayResponses = 0, workdays = 0;
  const days = Array.from({ length: count }, (_, index) => {
    const date = shiftDay(from, index), workday = isWorkday(date);
    if (date > currentDay) return { date, isWorkday: workday, future: true, masked: false, total: 0, distribution: null };
    if (workday) workdays++;
    const rows = entries.filter(entry => entry.day.toISOString().slice(0, 10) === date);
    if (rows.length < minimum) return { date, isWorkday: workday, masked: rows.length > 0 || workday, total: !workday && !rows.length ? 0 : null, distribution: null };
    const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const row of rows) { distribution[row.score]++; for (const tag of row.tags) tagCounts[tag] = (tagCounts[tag] || 0) + 1; }
    totalResponses += rows.length;
    if (workday) workdayResponses += rows.length;
    return { date, isWorkday: workday, masked: false, total: rows.length, distribution };
  });
  return { period: { from, to }, participationRate: employeeCount && workdays ? workdayResponses / (employeeCount * workdays) : 0, totalResponses, days, topTags: Object.entries(tagCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([tag, n]) => ({ tag, share: n / totalResponses })) };
}
