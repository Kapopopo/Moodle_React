import { Preferences } from '@capacitor/preferences';
export type PersonalMood = { day: string; score: number; tags: string[] };
export type DayNote = { day: string; text: string; intention?: string; done?: boolean };
export type Journal = { enabled: boolean; entries: PersonalMood[]; notes: DayNote[] };
const key = (userId: string) => `moodly.journal.${userId}`;
export async function readJournal(userId: string): Promise<Journal> {
  const { value } = await Preferences.get({ key: key(userId) });
  if (!value) return { enabled: false, entries: [], notes: [] };
  const result = JSON.parse(value) as Journal;
  if (typeof result.enabled !== 'boolean' || !Array.isArray(result.entries) || (result.notes !== undefined && !Array.isArray(result.notes))) throw new Error('Le carnet local est illisible.');
  return { ...result, notes: result.notes || [] };
}
export async function writeJournal(userId: string, journal: Journal) { await Preferences.set({ key: key(userId), value: JSON.stringify(journal) }); }
const pending = new Map<string, Promise<unknown>>();
export async function changeJournal(userId: string, change: (journal: Journal) => Journal): Promise<Journal> {
  const task = (pending.get(userId) || Promise.resolve()).catch(() => {}).then(async () => { const next = change(await readJournal(userId)); await writeJournal(userId, next); return next; });
  pending.set(userId, task);
  try { return await task; } finally { if (pending.get(userId) === task) pending.delete(userId); }
}
export async function savePersonalMood(userId: string, entry: PersonalMood, enable = false) {
  await changeJournal(userId, journal => journal.enabled || enable ? { ...journal, enabled: true, entries: [...journal.entries.filter(row => row.day !== entry.day), entry].sort((a, b) => a.day.localeCompare(b.day)) } : journal);
}
export async function saveDayNote(userId: string, day: string, patch: Partial<Omit<DayNote, 'day'>>) {
  return changeJournal(userId, journal => {
    if (!journal.enabled) throw new Error('Active ton carnet pour enregistrer une note sur cet appareil.');
    const note = { day, text: '', ...journal.notes.find(n => n.day === day), ...patch };
    return { ...journal, notes: [...journal.notes.filter(n => n.day !== day), note].filter(n => n.text.trim() || n.intention).sort((a, b) => a.day.localeCompare(b.day)) };
  });
}
export async function clearJournal(userId: string) { await changeJournal(userId, () => ({ enabled: false, entries: [], notes: [] })); }
export function previousDay(day: string) { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }
export function compareDay(journal: Journal, day: string) {
  const current = journal.entries.find(e => e.day === day), previous = journal.entries.find(e => e.day === previousDay(day));
  return current && previous ? { current, previous, delta: current.score - previous.score } : null;
}
