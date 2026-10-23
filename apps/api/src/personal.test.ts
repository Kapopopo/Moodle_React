import { beforeEach, describe, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => new Map<string, string>());
vi.mock('@capacitor/preferences', () => ({ Preferences: {
  get: async ({ key }: { key: string }) => ({ value: storage.get(key) ?? null }),
  set: async ({ key, value }: { key: string; value: string }) => { storage.set(key, value); },
  remove: async ({ key }: { key: string }) => { storage.delete(key); },
} }));
import { readJournal, changeJournal, saveDayNote, savePersonalMood, compareDay, previousDay, clearJournal } from '../../mobile/src/personal';
beforeEach(() => storage.clear());
describe('Private local journal', () => {
  it('migrates an existing mood-only journal without losing history', async () => {
    storage.set('moodly.journal.a', JSON.stringify({ enabled: true, entries: [{ day: '2026-10-14', score: 3, tags: [] }] }));
    const journal = await readJournal('a'); expect(journal.notes).toEqual([]); expect(journal.entries).toHaveLength(1);
  });
  it('requires consent and separates accounts', async () => {
    await expect(saveDayNote('a', '2026-10-15', { text: 'Private' })).rejects.toThrow('Active ton carnet');
    await changeJournal('a', j => ({ ...j, enabled: true }));
    await saveDayNote('a', '2026-10-15', { text: 'Private' });
    expect((await readJournal('b')).notes).toEqual([]);
  });
  it('preserves notes and moods through concurrent saves', async () => {
    await changeJournal('a', j => ({ ...j, enabled: true }));
    await Promise.all([saveDayNote('a', '2026-10-15', { text: 'Today' }), savePersonalMood('a', { day: '2026-10-15', score: 4, tags: [] }), saveDayNote('a', '2026-10-15', { intention: 'Pause', done: true })]);
    const journal = await readJournal('a'); expect(journal.entries).toHaveLength(1); expect(journal.notes[0]).toMatchObject({ text: 'Today', intention: 'Pause', done: true });
  });
  it('only compares with the exact previous calendar day', () => {
    const journal = { enabled: true, notes: [], entries: [{ day: '2026-10-13', score: 1, tags: [] }, { day: '2026-10-15', score: 4, tags: [] }] };
    expect(compareDay(journal, '2026-10-15')).toBeNull();
    journal.entries.push({ day: '2026-10-14', score: 3, tags: [] });
    expect(compareDay(journal, '2026-10-15')?.delta).toBe(1);
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
  });
  it('clears all personal data and disables conservation', async () => {
    await changeJournal('a', j => ({ ...j, enabled: true }));
    await saveDayNote('a', '2026-10-15', { text: 'Private' }); await clearJournal('a');
    expect(await readJournal('a')).toEqual({ enabled: false, entries: [], notes: [] });
  });
});
