import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { IconArrowRight, IconCheck, IconLock, IconPencil, IconHeart, IconArrowUpRight, IconArrowDownRight, IconMinus, IconCalendar } from '@tabler/icons-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Mascot, moods } from './mascots';
import { readJournal, saveDayNote, compareDay, previousDay, type Journal } from './personal';
export const localToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const dayTitle = (day: string) => format(new Date(`${day}T12:00:00`), 'EEEE d MMMM', { locale: fr });
export function Comparison({ journal, day }: { journal: Journal; day: string }) {
  const comparison = compareDay(journal, day);
  return <section className="comparison-card"><div className="widget-kicker"><IconCalendar size={17}/>Comparaison avec la veille</div><h3>{!comparison ? 'Chaque journée a son rythme.' : comparison.delta > 0 ? 'Une nuance plus légère.' : comparison.delta < 0 ? 'Une journée différente.' : 'Dans la même nuance.'}</h3>{comparison ? <><div className="mood-comparison"><div><Mascot score={comparison.previous.score} size={65}/><span>La veille</span><strong>{moods[comparison.previous.score - 1].label}</strong></div><span className="comparison-arrow">{comparison.delta > 0 ? <IconArrowUpRight size={24}/> : comparison.delta < 0 ? <IconArrowDownRight size={24}/> : <IconMinus size={24}/>}</span><div><Mascot score={comparison.current.score} size={65}/><span>Ce jour-là</span><strong>{moods[comparison.current.score - 1].label}</strong></div></div><p>{comparison.delta > 0 ? 'Ton humeur est plus haute que la veille. Si quelque chose t’a aidé, tu peux le garder dans ta note.' : comparison.delta < 0 ? 'Ton humeur est plus basse que la veille. Tu peux accueillir ce ressenti sans te demander de faire mieux.' : 'Ton humeur a le même niveau que la veille. Ta note peut raconter les nuances derrière la mascotte.'}</p></> : <p>Il faut une humeur conservée ce jour-là et la veille pour les comparer. Pas de données inventées, et aucune obligation d’aller mieux chaque jour.</p>}</section>;
}
export function NoteEditor({ userId, day, journal, onSaved }: { userId: string; day: string; journal: Journal; onSaved: (journal: Journal) => void }) {
  const existing = journal.notes.find(n => n.day === day)?.text || '';
  const [text, setText] = useState(existing), [status, setStatus] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const editorDay = useRef(day);
  // Loading or refreshing the same day must never replace a note being typed.
  useEffect(() => { if (editorDay.current !== day) { editorDay.current = day; setText(existing); setError(''); } }, [day, existing]);
  useEffect(() => { setStatus(''); }, [day, journal.enabled]);
  const dirty = text !== existing;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    const guard = (event: MouseEvent) => {
      const target = (event.target as Element).closest('a[href], .calendar-day, .timeline-days>button, .history-list>button, .calendar-card>.text-button');
      if (!target || target.getAttribute('aria-pressed') === 'true') return;
      if (!window.confirm('Ta note contient des modifications non enregistrées. Quitter sans les enregistrer ?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', warn); document.addEventListener('click', guard, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', guard, true); };
  }, [dirty]);
  async function save() { setBusy(true); setError(''); try { onSaved(await saveDayNote(userId, day, { text })); setStatus(text.trim() ? 'Note enregistrée sur ton compte.' : 'Note effacée de ton compte.'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  const available = journal.enabled && day <= localToday();
  return <section className="note-editor"><div className="note-heading"><div><span className="widget-kicker"><IconPencil size={17}/>Ta page du jour</span><h3>Les mots qui restent.</h3></div><span className="private-label"><IconLock size={13}/>Privé</span></div><p className="note-help">Un détail, un moment agréable, quelque chose de difficile… Tu choisis ce que tu veux garder.</p><label htmlFor={`note-${day}`}>Ma note du {format(new Date(`${day}T12:00:00`), 'd MMMM', { locale: fr })}</label><textarea id={`note-${day}`} ref={textarea} value={text} maxLength={5000} disabled={!available || busy} onChange={e => { setText(e.target.value); setStatus(''); }} placeholder={available ? 'Aujourd’hui, j’ai envie de me souvenir de…' : day > localToday() ? 'Cette journée n’a pas encore commencé.' : 'Active ton carnet pour écrire une note privée.'}/><div className="note-prompts">{['Ce qui m’a fait du bien', 'Ce qui a été difficile', 'Une petite chose pour demain'].map(prompt => <button key={prompt} disabled={!available || busy} onClick={() => { setText(t => `${t}${t ? '\n\n' : ''}${prompt} : `.slice(0, 5000)); setStatus(''); textarea.current?.focus(); }}>{prompt}<span>+</span></button>)}</div><div className="note-save-row"><span>{text.length}/5 000 · {dirty ? 'Modifications non enregistrées' : 'Synchronisé avec ton compte'}</span><button className="pill" disabled={!available || busy || !dirty} onClick={() => void save()}>{busy ? 'Enregistrement…' : 'Enregistrer ma note'}<IconCheck size={16}/></button></div><p className="save-feedback" role="status">{status}</p>{error && <p role="alert" className="error">{error}</p>}<p className="note-warning">Pense à enregistrer avant de changer de jour ou d’onglet.</p></section>;
}
const intentions = ['Prendre une vraie pause', 'Clarifier une priorité', 'Échanger avec quelqu’un', 'Garder un moment pour moi'];
export function Intention({ userId, journal, onSaved }: { userId: string; journal: Journal; onSaved: (j: Journal) => void }) {
  const day = localToday(), note = journal.notes.find(n => n.day === day);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function update(patch: { intention?: string; done?: boolean }) { setBusy(true); setError(''); try { onSaved(await saveDayNote(userId, day, patch)); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  return <section className="intention-card"><span className="widget-kicker"><IconHeart size={17}/>Ton intention du jour</span><h3>Qu’est-ce qui te ferait du bien ?</h3><p>Choisis une intention, si tu en as envie. Tu peux changer d’avis et il n’y a rien à rattraper.</p><div className="intention-options">{intentions.map(item => <button key={item} disabled={busy || !journal.enabled} aria-label={item} aria-pressed={note?.intention === item} className={note?.intention === item ? 'active' : ''} onClick={() => void update({ intention: note?.intention === item ? undefined : item, done: false })}>{item}<span>{note?.intention === item ? <IconCheck size={15}/> : '+'}</span></button>)}</div>{note?.intention && <button className={`intention-done ${note.done ? 'done' : ''}`} disabled={busy || !journal.enabled} aria-pressed={Boolean(note.done)} onClick={() => void update({ done: !note.done })}><span>{note.done && <IconCheck size={15}/>}</span>{note.done ? 'Ce moment, je l’ai pris.' : 'J’ai pris ce moment pour moi'}</button>}{!journal.enabled && <Link className="text-button" to="/carnet">Activer mon carnet pour garder une intention <IconArrowRight size={15}/></Link>}{error && <p className="error" role="alert">{error}</p>}</section>;
}
export function DayCompanion({ userId, refreshKey = '' }: { userId: string; refreshKey?: string }) {
  const [journal, setJournal] = useState<Journal | null>(null), [error, setError] = useState('');
  useEffect(() => { let mounted = true; readJournal(userId).then(j => { if (mounted) setJournal(j); }).catch(e => { if (mounted) setError(e.message); }); return () => { mounted = false; }; }, [userId, refreshKey]);
  const today = localToday();
  return <div className="day-companion">{error && <p className="error" role="alert">{error}</p>}{journal && <><Comparison journal={journal} day={today}/><Intention userId={userId} journal={journal} onSaved={setJournal}/>{journal.enabled ? <NoteEditor userId={userId} day={today} journal={journal} onSaved={setJournal}/> : <Link className="journal-invite" to="/carnet"><IconPencil size={24}/><div><h3>Ta journée mérite quelques mots.</h3><p>Active ton carnet privé pour écrire des notes et retrouver tes journées.</p><span>Ouvrir mon carnet <IconArrowRight size={16}/></span></div></Link>}<section className="recent-strip"><div className="section-row"><h3>Tes derniers jours</h3><Link to="/carnet">Tout retrouver <IconArrowRight size={15}/></Link></div><div className="week-moods">{Array.from({ length: 7 }, (_, i) => { let day = today; for (let n = 0; n < 6 - i; n++) day = previousDay(day); const mood = journal.entries.find(e => e.day === day), note = journal.notes.find(n => n.day === day); return <Link key={day} to={`/carnet?jour=${day}`} aria-label={`${dayTitle(day)} : ${mood ? moods[mood.score - 1].label : 'humeur non conservée'}${note?.text ? ', note disponible' : ''}`}><span>{format(new Date(`${day}T12:00:00`), 'EEE', { locale: fr })}</span><div>{mood ? <Mascot score={mood.score} size={36}/> : <span className="empty-day">·</span>}</div><small>{note?.text ? <IconPencil size={12}/> : format(new Date(`${day}T12:00:00`), 'd')}</small></Link>; })}</div><p>Seulement les humeurs et notes que tu as choisi de conserver.</p></section></>}</div>;
}
