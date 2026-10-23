import { Preferences } from '@capacitor/preferences';
import { request, ApiError } from './api';
export type PersonalMood = { day: string; score: number; tags: string[] };
export type DayNote = { day: string; text: string; intention?: string; done?: boolean };
export type Journal = { enabled: boolean; entries: PersonalMood[]; notes: DayNote[] };
const key = (userId: string) => `moodly.journal.${userId}`;
type StoredJournal = { journal: Journal; revision: number };
const endpoint = (userId: string) => `/journal/${encodeURIComponent(userId)}`;
const pending = new Map<string, Promise<unknown>>();
async function serialize<T>(userId: string, work: () => Promise<T>): Promise<T> {
  const task = (pending.get(userId) || Promise.resolve()).catch(() => {}).then(work);
  pending.set(userId, task);
  try { return await task; } finally { if (pending.get(userId) === task) pending.delete(userId); }
}
async function loadJournal(userId: string): Promise<StoredJournal> {
  // Keep legacy data until the server acknowledges the import. Never uninstall
  // the old app to migrate: Preferences contains the only copy of that history.
  const { value } = await Preferences.get({ key: key(userId) });
  for (let attempt = 0; attempt < 4; attempt++) {
    const remote = await request<StoredJournal>(endpoint(userId));
    if (!value) return remote;
    const local = JSON.parse(value) as Journal;
    if (typeof local.enabled !== 'boolean' || !Array.isArray(local.entries) || (local.notes !== undefined && !Array.isArray(local.notes))) throw new Error('Le carnet local est illisible.');
    // Preserve existing server days when importing another device's older copy.
    const merge = <T extends { day: string }>(old: T[], current: T[]) => [...new Map([...old, ...current].map(row => [row.day, row])).values()].sort((a, b) => a.day.localeCompare(b.day));
    const journal = { enabled: remote.journal.enabled || local.enabled, entries: merge(local.entries, remote.journal.entries), notes: merge(local.notes || [], remote.journal.notes) };
    try {
      const saved = await request<StoredJournal>(endpoint(userId), { method: 'PUT', body: JSON.stringify({ journal, revision: remote.revision }) });
      await Preferences.remove({ key: key(userId) });
      return saved;
    } catch (e) { if (!(e instanceof ApiError && e.status === 409) || attempt === 3) throw e; }
  }
  throw new Error('Le carnet a changé. Réessaie.');
}
export async function readJournal(userId: string): Promise<Journal> {
  return serialize(userId, async () => (await loadJournal(userId)).journal);
}
export async function changeJournal(userId: string, change: (journal: Journal) => Journal): Promise<Journal> {
  return serialize(userId, async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const { journal, revision } = await loadJournal(userId);
      try {
        const saved = await request<StoredJournal>(endpoint(userId), { method: 'PUT', body: JSON.stringify({ journal: change(journal), revision }) });
        return saved.journal;
      } catch (e) { if (!(e instanceof ApiError && e.status === 409) || attempt === 3) throw e; }
    }
    throw new Error('Le carnet a changé. Réessaie.');
  });
}
export async function writeJournal(userId: string, journal: Journal) { await changeJournal(userId, () => journal); }
export async function savePersonalMood(userId: string, entry: PersonalMood, enable = false) {
  await changeJournal(userId, journal => journal.enabled || enable ? { ...journal, enabled: true, entries: [...journal.entries.filter(row => row.day !== entry.day), entry].sort((a, b) => a.day.localeCompare(b.day)) } : journal);
}
export async function saveDayNote(userId: string, day: string, patch: Partial<Omit<DayNote, 'day'>>) {
  return changeJournal(userId, journal => {
    if (!journal.enabled) throw new Error('Active ton carnet pour enregistrer une note sur ton compte.');
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
