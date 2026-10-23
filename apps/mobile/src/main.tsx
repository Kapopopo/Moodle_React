import React, { createContext, useContext, useEffect, useLayoutEffect, useState, type FormEvent, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import { IconArrowLeft, IconArrowRight, IconLock, IconLogout, IconArrowUpRight, IconMoodSmile, IconClock, IconHeart, IconCheck, IconRefresh } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, YAxis } from 'recharts';
import { Mascot, moods } from './mascots';
import { request, ApiError, tags, type User, type Summary } from './api';
import { Home, Pauses, Carnet, Confiance, Navigation, More } from './spaces';
import { savePersonalMood, readJournal } from './personal';
import { VssInbox, AdminDashboard } from './vss';
import { Ideas, Support, Reporting } from './community';
import './style.css';

const Auth = createContext<{ user: User | null; setUser: (user: User | null) => void; logout: () => Promise<void> }>({ user: null, setUser: () => {}, logout: async () => {} });
const dateLabel = (day: string, pattern = 'd MMM') => format(parseISO(day), pattern, { locale: fr });
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
function Brand({ small = false }: { small?: boolean }) { return <div className={`brand ${small ? 'small' : ''}`}><span className="brand-icon"><IconMoodSmile size={small ? 19 : 22}/></span><span>moodly<span className="brand-dot">.</span></span></div>; }
function Privacy() { return <p className="privacy"><IconLock size={16}/><span>Anonyme : ton manager ne voit que des tendances d’équipe.</span></p>; }
function Pill({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button className="pill" {...props}>{children}</button>; }
function ErrorMessage({ message }: { message: string }) { return message ? <p className="error" role="alert">{message}</p> : null; }
function SessionNavigation({ user, logout }: { user: User; logout: () => Promise<void> }) {
  const navigate = useNavigate();
  const home = user.role === 'ADMIN' ? '/signalements' : '/accueil';
  const back = () => {
    if (typeof window.history.state?.idx === 'number' && window.history.state.idx > 1) navigate(-1);
    else navigate(home, { replace: true });
  };
  return <nav className="session-navigation" aria-label="Actions de navigation"><button className="chip" onClick={back}><IconArrowLeft size={18}/>Retour</button><button className="chip" onClick={() => void logout()}><IconLogout size={18}/>Se déconnecter</button></nav>;
}
function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const restore = async () => {
    setLoading(true); setError('');
    try { const { value } = await Preferences.get({ key: 'moodly.token' }); if (value) setUser(await request<User>('/auth/me')); }
    catch (e) { if (e instanceof ApiError && e.status === 401) await Preferences.remove({ key: 'moodly.token' }); else setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { void restore(); }, []);
  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => { window.history.scrollRestoration = previous; };
  }, []);
  useLayoutEffect(() => {
    // Reset before paint so the previous page's scroll position never flashes.
    const reset = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.querySelector<HTMLElement>('.route-view')?.focus({ preventScroll: true });
    reset();
    const frame = requestAnimationFrame(reset);
    return () => cancelAnimationFrame(frame);
  }, [location.key, loading]);

  const logout = async () => { await Preferences.remove({ key: 'moodly.token' }); setUser(null); navigate('/login', { replace: true }); };
  return <Auth.Provider value={{ user, setUser, logout }}><div className={`app-layout ${user ? 'is-connected' : ''}`}><aside className="story"><Brand/>{user && <div className="sidebar-content"><span className="section-label">Ton espace Moodly</span><Navigation user={user}/><div className="sidebar-note"><Mascot score={3} size={74}/><strong>Une place pour chaque humeur.</strong><p>Ton humeur au quotidien.<br/>Des tendances pour ton équipe.</p><Link to={user.role === 'ADMIN' ? '/admin/tableau-de-bord' : user.role === 'MANAGER' ? '/equipe' : '/confiance'}>{user.role === 'ADMIN' ? 'Tableau de bord ↗' : user.role === 'MANAGER' ? 'Voir les tendances ↗' : 'Comment ça marche ? ↗'}</Link></div><div className="sidebar-account"><span>{user.firstName.slice(0, 1)}</span><div><strong>{user.firstName}</strong><small>{user.team.name} · {user.role === 'ADMIN' ? 'Administration Moodly' : user.role === 'MANAGER' ? 'Manager' : 'Collaborateur'}</small></div><button className="icon-button" aria-label="Quitter la session" onClick={() => void logout()}><IconLogout size={18}/></button></div></div>}<div className="story-copy"><div className="eyebrow"><span className="status-dot"/>Le moral au travail, au quotidien.</div><h1>Chaque humeur<br/>a sa <span>place.</span></h1><p>Les bons jours, les moins bons.<br/>Prends un instant pour dire comment tu vas.</p></div><div className="mascot-garden" aria-hidden="true"><span className="garden-orbit"/><Mascot score={1} size={160} className="garden-drop"/><Mascot score={2} size={160} className="garden-cloud"/><Mascot score={3} size={225} className="garden-stone"/><Mascot score={4} size={185} className="garden-sun"/><Mascot score={5} size={210} className="garden-flower"/><span className="garden-note">Toutes les humeurs sont les bienvenues <IconHeart size={15}/></span></div><div className="story-footer"><span>Suivi individuel, tendances collectives.</span><span>Moodly</span></div></aside><section className="app-panel"><header className="mobile-brand"><Brand small/></header>{user && <SessionNavigation user={user} logout={logout}/>}{loading ? <div className="loading" role="status"><Mascot score={3}/><p>Un petit instant…</p></div> : error ? <div className="loading"><ErrorMessage message={error}/><Pill onClick={restore}>Réessayer <IconRefresh size={18}/></Pill></div> : <div className="route-view" key={location.pathname} tabIndex={-1}><Routes><Route path="/plus" element={<TeamMember><More user={user!}/></TeamMember>}/><Route path="/admin/tableau-de-bord" element={<Protected role="ADMIN"><AdminDashboard/></Protected>}/><Route path="/signalements" element={<Protected role="ADMIN"><VssInbox/></Protected>}/><Route path="/idees" element={<TeamMember><Ideas user={user!}/></TeamMember>}/><Route path="/aide" element={<Protected role="EMPLOYEE"><Support/></Protected>}/><Route path="/aide/signalement" element={<Protected role="EMPLOYEE"><Reporting/></Protected>}/><Route path="/accueil" element={<SignedIn>{user?.role === 'ADMIN' ? <Navigate to="/signalements" replace/> : <Home user={user!}/>}</SignedIn>}/><Route path="/pauses" element={<SignedIn><Pauses/></SignedIn>}/><Route path="/confiance" element={<SignedIn>{user?.role === 'ADMIN' ? <Navigate to="/admin/tableau-de-bord" replace/> : user?.role === 'MANAGER' ? <Navigate to="/equipe" replace/> : <Confiance user={user!}/>}</SignedIn>}/><Route path="/carnet" element={<Protected role="EMPLOYEE"><Carnet user={user!}/></Protected>}/><Route path="/login" element={user ? <Navigate to="/accueil" replace/> : <Login/>}/><Route path="/humeur" element={<Protected role="EMPLOYEE"><Employee/></Protected>}/><Route path="/equipe" element={<Protected role="MANAGER"><Manager/></Protected>}/><Route path="*" element={<Navigate to={user ? '/accueil' : '/login'} replace/>}/></Routes></div>}{user && <div className="mobile-navigation"><Navigation user={user} mobile/></div>}<footer className="panel-footer"><span>Moodly © 2026</span><span>Ton espace personnel et collectif.</span></footer></section></div></Auth.Provider>;
}
function SignedIn({ children }: { children: ReactNode }) { const { user } = useContext(Auth); return user ? children : <Navigate to="/login" replace/>; }
function TeamMember({ children }: { children: ReactNode }) { const { user } = useContext(Auth); return !user ? <Navigate to="/login" replace/> : user.role === 'ADMIN' ? <Navigate to="/signalements" replace/> : children; }
function Protected({ role, children }: { role: User['role'] | User['role'][]; children: ReactNode }) { const { user } = useContext(Auth); return !user ? <Navigate to="/login" replace/> : (Array.isArray(role) ? !role.includes(user.role) : user.role !== role) ? <Navigate to={user.role === 'ADMIN' ? '/signalements' : user.role === 'MANAGER' ? '/equipe' : '/humeur'} replace/> : children; }
function Login() {
  const { setUser } = useContext(Auth); const navigate = useNavigate();
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); await Preferences.set({ key: 'moodly.token', value: result.token }); setUser(result.user); navigate(result.user.role === 'ADMIN' ? '/signalements' : '/accueil'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <main className="screen login"><div className="login-art"><Mascot score={5} size={132} title="Pétille te souhaite la bienvenue"/></div><div className="section-label">Suivi du moral au travail</div><h2>Bienvenue<br/>sur Moodly<span className="purple-dot">.</span></h2><p className="subtitle">Ton humeur, en 10 secondes.<br/>Un suivi collectif pour ton équipe.</p><form onSubmit={submit}><label htmlFor="email">Adresse e-mail</label><input id="email" type="text" inputMode="email" autoCapitalize="none" spellCheck={false} placeholder="toi@entreprise.fr" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254}/><label htmlFor="password">Mot de passe</label><input id="password" type="password" placeholder="Ton mot de passe" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required maxLength={128}/><ErrorMessage message={error}/><Pill type="submit" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}<IconArrowRight size={20}/></Pill></form><Privacy/><div className="login-features"><span><IconClock size={16}/>Saisie en 10 secondes</span><span><IconLock size={16}/>Des tendances anonymisées</span><span><IconHeart size={16}/>Un espace pour souffler</span></div><div className="login-bottom"><p>Choisis ton humeur.<br/>Ajoute un contexte si tu le souhaites.</p></div></main>;
}
function ScreenHeader({ manager = false }: { manager?: boolean }) { const { user } = useContext(Auth); return <header className="screen-header"><div><span className="section-label">{manager ? 'Vue manager' : dateLabel(today(), 'EEEE d MMMM')}</span><p>{manager ? 'Un regard sur le collectif' : `Bonjour ${user?.firstName}`}</p></div></header>; }
function Employee() {
  const { user, logout } = useContext(Auth);
  const [journalError, setJournalError] = useState('');
  const [keepInJournal, setKeepInJournal] = useState(true), [savedScore, setSavedScore] = useState<number | null>(null);
  useEffect(() => { if (user) void readJournal(user.id).then(j => { setSavedScore(j.entries.find(e => e.day === today())?.score ?? null); }).catch(() => {}); }, [user?.id]);
  const [score, setScore] = useState<number | null>(null), [selectedTags, setTags] = useState<string[]>([]), [submitted, setSubmitted] = useState(false), [justSent, setJustSent] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const check = async () => { setLoading(true); setError(''); try { const result = await request<{ hasSubmitted: boolean }>('/moods/today'); setSubmitted(result.hasSubmitted); } catch (e) { if (e instanceof ApiError && e.status === 401) await logout(); else setError((e as Error).message); } finally { setLoading(false); } };
  useEffect(() => { void check(); const refresh = () => { if (document.visibilityState === 'visible') { setJustSent(false); setScore(null); void check(); } }; document.addEventListener('visibilitychange', refresh); return () => document.removeEventListener('visibilitychange', refresh); }, []);
  const mood = moods.find(m => m.score === score);
  async function submit() {
    if (!score) { setError('Choisis d’abord ton humeur'); return; }
    setBusy(true); setError('');
    try { await request('/moods', { method: 'POST', body: JSON.stringify({ score, tags: selectedTags }) }); try { if (keepInJournal) { await savePersonalMood(user!.id, { day: today(), score, tags: selectedTags }, true); setSavedScore(score); } } catch { setJournalError('Ton humeur a été envoyée, mais la sauvegarde dans ton carnet a échoué.'); } setSubmitted(true); setJustSent(true); }
    catch (e) { if (e instanceof ApiError && e.status === 409) setSubmitted(true); else if (e instanceof ApiError && e.status === 401) await logout(); else setError((e as Error).message); } finally { setBusy(false); }
  }
  return <main className={`screen employee ${submitted ? 'employee-complete' : ''}`}><ScreenHeader/>{loading ? <div className="loading" role="status">On prépare ton espace…</div> : submitted ? <div className="mood-receipt"><div className="success" role="status"><div className="success-art"><Mascot score={justSent && score ? score : savedScore || 3} size={170}/><span className="check-badge"><IconCheck size={20}/></span></div><h2>{justSent ? 'Merci, c’est noté.' : 'Tu as pris un moment pour toi.'}</h2><p>{savedScore ? 'Ton humeur est disponible dans ton carnet.' : 'Tu pourras faire une nouvelle saisie demain.'}</p><ErrorMessage message={journalError}/><div className="success-actions"><Link className="pill link-pill" to="/pauses">Prendre une petite pause <IconArrowRight size={18}/></Link><Link className="text-button" to="/carnet">Retrouver mon carnet <IconArrowRight size={16}/></Link></div><Privacy/></div></div> : <><h2>Comment tu te sens<br/>aujourd’hui<span className="purple-dot"> ?</span></h2><div className={`mood-hero ${score ? 'chosen' : ''}`} style={{ background: mood?.background }}>{score ? <Mascot score={score} size={104} title={mood?.name}/> : <div className="empty-mascot"><span>· ·</span><span>⌣</span></div>}</div><p className={`mood-label ${score ? 'selected' : ''}`} aria-live="polite">{mood?.label || 'Choisis la mascotte qui te ressemble'}</p><div className="mood-options">{moods.map(m => <div key={m.score}><button className={score === m.score ? 'active' : ''} aria-label={m.label} aria-pressed={score === m.score} disabled={busy} onClick={() => { setScore(m.score); setError(''); }}><Mascot score={m.score} size={42}/></button><span>{m.label}</span></div>)}</div><div className="tags-header">Qu’est-ce qui joue ? <span>(facultatif)</span></div><div className="chips">{Object.entries(tags).map(([key, label]) => <button key={key} className={`chip ${selectedTags.includes(key) ? 'active' : ''}`} aria-pressed={selectedTags.includes(key)} disabled={busy} onClick={() => setTags(current => current.includes(key) ? current.filter(t => t !== key) : [...current, key])}>{label}</button>)}</div><ErrorMessage message={error}/>{error && !score && !busy && <button className="text-button" onClick={() => void check()}>Vérifier ma saisie</button>}<label className="journal-choice"><input type="checkbox" checked={keepInJournal} disabled={busy} onChange={e => setKeepInJournal(e.target.checked)}/><span><strong>Garder cette humeur dans mon carnet</strong><small>Copie privée liée à ton compte, disponible sur tes appareils. Ce choix active le carnet.</small></span></label><Pill disabled={busy} onClick={submit}>{busy ? 'Envoi…' : 'Valider mon humeur'}<IconArrowRight size={20}/></Pill><Privacy/></>}</main>;
}
function ChartTooltip({ active, payload }: { active?: boolean; payload?: readonly { payload: Summary['days'][number] }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return <div className="chart-tooltip"><strong>{dateLabel(row.date, 'EEEE d MMMM')}</strong>{row.future ? <p>Journée à venir.</p> : row.masked ? <p>Jour masqué pour protéger l’anonymat.</p> : !row.total ? <p>Aucune réponse affichée.</p> : <><p>{row.total} réponses</p>{moods.map(m => <div key={m.score}><span style={{ background: m.color }}/>{m.label}<b>{Math.round((row.distribution?.[m.score] || 0) / row.total! * 100)} %</b></div>)}</>}</div>;
}
function shiftChartDay(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
function Manager() {
  const { user, logout } = useContext(Auth);
  const [duration, setDuration] = useState(30), [center, setCenter] = useState(today), [selected, setSelected] = useState(today);
  const [summary, setSummary] = useState<Summary | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [refresh, setRefresh] = useState(0);
  const currentDay = today();
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    const to = shiftChartDay(center, duration - 1 - Math.floor(duration / 2));
    request<Summary>(`/teams/me/summary?days=${duration}&to=${to}`).then(value => { if (active) setSummary(value); }).catch(e => {
      if (!active) return;
      if (e instanceof ApiError && e.status === 401) void logout(); else setError((e as Error).message);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [duration, center, refresh]);
  const chartRows = summary?.days.map(day => ({ ...day, ...day.distribution, placeholder: day.future || day.masked || !day.total ? 1 : 0 })) || [];
  const selectedRow = summary?.days.find(day => day.date === selected);
  const selectedIndex = summary?.days.findIndex(day => day.date === selected) ?? -1;
  const ticks = summary ? [...new Set([summary.period.from, center, summary.period.to])] : [];
  const move = (direction: number) => { const next = shiftChartDay(center, direction * duration); setCenter(next); setSelected(next); };
  return <main className="screen manager"><ScreenHeader manager/><h2>{user?.team.name}<span className="purple-dot">.</span></h2><p className="subtitle">Prendre le pouls. Mieux se comprendre.</p>
    <section className="trend-controls" aria-label="Période du graphique">
      <div className="trend-tabs" role="group" aria-label="Durée affichée">{[{ days: 1, label: 'Jour' }, { days: 7, label: 'Semaine' }, { days: 30, label: 'Mois' }].map(item => <button key={item.days} aria-pressed={duration === item.days} onClick={() => { setDuration(item.days); setSelected(center); }}>{item.label}</button>)}</div>
      <div className="trend-navigation"><button className="icon-button" aria-label="Période précédente" onClick={() => move(-1)}><IconArrowLeft size={18}/></button><button className="trend-today" onClick={() => { setCenter(currentDay); setSelected(currentDay); }}>Centrer aujourd’hui</button><button className="icon-button" aria-label="Période suivante" disabled={center >= currentDay} onClick={() => { const next = shiftChartDay(center, duration); setCenter(next > currentDay ? currentDay : next); setSelected(next > currentDay ? currentDay : next); }}><IconArrowRight size={18}/></button></div>
    </section>
    {loading ? <div className="loading" role="status">Les tendances arrivent…</div> : error ? <><ErrorMessage message={error}/><Pill onClick={() => setRefresh(n => n + 1)}>Réessayer<IconRefresh size={18}/></Pill></> : summary && <>
      <div className="period"><span className="status-dot"/>{duration === 1 ? dateLabel(center, 'EEEE d MMMM') : `${dateLabel(summary.period.from)} — ${dateLabel(summary.period.to)}`}<span>{duration === 1 ? '1 jour' : `${duration} jours`} · heure de Paris</span></div>
      <div className="metrics"><div className="metric purple"><span>Participation <IconArrowUpRight size={17}/></span><strong>{Math.round(summary.participationRate * 100)}<small> %</small></strong><p>sur les jours écoulés affichables</p></div><div className="metric green"><span>Réponses <IconHeart size={17}/></span><strong>{summary.totalResponses}</strong><p>sur la période sélectionnée</p></div></div>
      <section className="chart-card interactive-trend"><div className="chart-heading"><span className="trend-eyebrow">TENDANCES DE L’ÉQUIPE</span><h3>Chaque jour, un ressenti.</h3><span>Touche les couleurs pour découvrir une journée.</span></div>
      <div className="chart" aria-label="Répartition quotidienne des cinq humeurs. Choisis un jour sur le graphique ou avec les boutons de navigation.">
        <ResponsiveContainer width="100%" height="100%"><BarChart data={chartRows} stackOffset="expand" margin={{ top: 30, right: 8, left: 0, bottom: 8 }} barCategoryGap="30%" maxBarSize={64} onClick={state => { if (state.activeLabel) setSelected(String(state.activeLabel)); }}>
          <defs>{moods.map(m => <linearGradient key={m.score} id={`trend-mood-${m.score}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={m.color}/><stop offset="100%" stopColor={m.color} stopOpacity={0.76}/></linearGradient>)}</defs>
          <CartesianGrid vertical={false} stroke="#e9e3f0" strokeDasharray="3 6"/>
          <YAxis domain={[0, 1]} ticks={[0, 0.5, 1]} tickFormatter={value => `${Math.round(value * 100)} %`} axisLine={false} tickLine={false} width={38} tick={{ fontSize: 9, fill: '#a19aa9' }}/>
          <XAxis dataKey="date" axisLine={false} tickLine={false} ticks={ticks} tickFormatter={value => value === currentDay ? 'Aujourd’hui' : dateLabel(value)} tick={{ fontSize: 10, fill: '#55525F' }} interval={0}/>
          <Tooltip content={<ChartTooltip/>} cursor={{ fill: '#b9a0dc', fillOpacity: 0.12, radius: 6 }} allowEscapeViewBox={{ x: false, y: true }}/>
          {moods.map(m => <Bar key={m.score} dataKey={String(m.score)} stackId="mood" fill={`url(#trend-mood-${m.score})`} radius={[2, 2, 2, 2]} isAnimationActive={false}/>)}
          <Bar dataKey="placeholder" stackId="mood" isAnimationActive={false} shape={(props: unknown) => {
            const p = props as { x: number; y: number; width: number; height: number; payload: Summary['days'][number] };
            if (p.payload.future) return <rect x={p.x} y={p.y} width={p.width} height={p.height} rx={2} fill="#f3f1f7"/>;
            if (!p.payload.masked && p.payload.total) return <g/>;
            return p.payload.masked ? <rect x={p.x} y={p.y} width={p.width} height={p.height} rx={2} fill="none" stroke="#B5B1C4" strokeDasharray="3 3"/> : <circle cx={p.x + p.width / 2} cy={p.y + p.height - 3} r={2} fill="#D9D6E3"/>;
          }}/>
          {duration > 1 && chartRows.some(day => day.date === currentDay) && <ReferenceLine x={currentDay} stroke="#7853b5" strokeWidth={2} label={{ value: 'Aujourd’hui', position: 'top', fill: '#7853b5', fontSize: 10 }}/>}
          {selected !== currentDay && selectedRow && <ReferenceLine x={selected} stroke="#55525f" strokeDasharray="4 3"/>}
        </BarChart></ResponsiveContainer>
      </div>
      <div className="legend">{moods.map(m => <span key={m.score}><i style={{ background: m.color }}/>{m.label}</span>)}</div>
      <div className="trend-explorer"><div className="trend-selection-heading"><button className="icon-button" aria-label="Jour précédent" disabled={selectedIndex <= 0} onClick={() => setSelected(summary.days[selectedIndex - 1].date)}><IconArrowLeft size={16}/></button><div><span>La journée en détail</span><strong>{dateLabel(selectedRow?.date || center, 'd MMMM yyyy')}</strong></div><button className="icon-button" aria-label="Jour suivant" disabled={selectedIndex < 0 || selectedIndex >= summary.days.length - 1} onClick={() => setSelected(summary.days[selectedIndex + 1].date)}><IconArrowRight size={16}/></button></div><div className="trend-day-detail" aria-live="polite">{selectedRow ? <ChartTooltip active payload={[{ payload: selectedRow }]}/> : <p>Touche une journée sur le graphique pour consulter son détail.</p>}</div></div>
      {!summary.totalResponses && <p className="muted">Pas encore assez de réponses pour afficher une tendance sur cette période.</p>}
      <details className="chart-data"><summary>Consulter les données du graphe</summary><table><thead><tr><th>Jour</th><th>Réponses</th><th>Répartition de 1 à 5</th></tr></thead><tbody>{summary.days.map(day => <tr key={day.date}><td>{dateLabel(day.date)}</td><td>{day.future ? 'À venir' : day.masked ? 'Masqué' : day.total}</td><td>{day.distribution ? moods.map(m => `${Math.round(day.distribution![m.score] / day.total! * 100)} %`).join(' · ') : '—'}</td></tr>)}</tbody></table></details>
      <div className="chart-rule"/><h3>Ce qui revient le plus</h3>{summary.topTags.length ? <div className="chips top-tags">{summary.topTags.map((tag, i) => <span key={tag.tag} className={`chip ${i === 0 ? 'active' : ''}`}>{tags[tag.tag]} · {Math.round(tag.share * 100)} %</span>)}</div> : <p className="muted">Les tendances apparaîtront avec les réponses.</p>}
      <p className="masked-note"><span/>Jour masqué : moins de {summary.minimumResponses} réponses, pour protéger l’anonymat.</p><p className="trend-future-note">Les journées à venir sont grisées et exclues des indicateurs.</p>
      </section><div className="manager-note"><span className="note-icon"><IconLock size={21}/></span><div><strong>Des tendances, jamais des personnes.</strong><p>Chaque ressenti reste anonyme. Les petits groupes de réponses restent masqués.</p></div></div><button className="text-button refresh" onClick={() => setRefresh(n => n + 1)}><IconRefresh size={15}/>Actualiser les tendances</button>
    </>}
  </main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><App/></BrowserRouter></React.StrictMode>);
