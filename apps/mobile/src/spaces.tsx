import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { IconArrowRight, IconHome, IconMoodSmile, IconChartBar, IconShieldLock } from '@tabler/icons-react';
import { request, type User } from './api';

export function Navigation({ user }: { user: User; mobile?: boolean }) {
  const links = [
    { to: '/accueil', label: 'Accueil', icon: IconHome },
    user.role === 'EMPLOYEE' ? { to: '/humeur', label: 'Mon humeur', icon: IconMoodSmile } : { to: '/equipe', label: 'Mon équipe', icon: IconChartBar },
    { to: '/confiance', label: 'Confiance', icon: IconShieldLock },
  ];
  return <nav className="space-nav" aria-label="Navigation principale">{links.map(item => <NavLink key={item.to} to={item.to} end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}><item.icon size={20}/><span>{item.label}</span></NavLink>)}</nav>;
}

export function Home({ user }: { user: User }) {
  const [submitted, setSubmitted] = useState<boolean | null>(null), [error, setError] = useState('');
  useEffect(() => {
    if (user.role !== 'EMPLOYEE') return;
    let active = true;
    request<{ hasSubmitted: boolean }>('/moods/today').then(data => { if (active) setSubmitted(data.hasSubmitted); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [user.id, user.role]);
  const manager = user.role === 'MANAGER';
  return <main className="screen space-screen"><div className="space-heading"><span className="section-label">Moodly · V1</span><h2>Bonjour {user.firstName}.</h2><p>{manager ? 'Consulte les tendances collectives de ton équipe.' : 'Un instant pour partager ton humeur du jour.'}</p></div>{error ? <p className="error" role="alert">{error}</p> : !manager && submitted === null ? <p role="status">Vérification de ta saisie…</p> : <section className="welcome-card"><div><h3>{manager ? 'Comment va ton équipe ?' : submitted ? 'Ton humeur est enregistrée.' : 'Comment te sens-tu aujourd’hui ?'}</h3><p>{manager ? 'Les petits groupes de réponses restent masqués.' : submitted ? 'Tu pourras répondre à nouveau demain.' : 'Choisis une humeur et, si tu le souhaites, quelques tags.'}</p><Link className="pill link-pill" to={manager ? '/equipe' : '/humeur'}>{manager ? 'Voir les tendances' : submitted ? 'Voir ma confirmation' : 'Partager mon humeur'}<IconArrowRight size={18}/></Link></div></section>}</main>;
}

export function Confiance({ user }: { user: User }) {
  return <main className="screen space-screen"><div className="space-heading"><h2>Des tendances collectives.</h2><p>Tu es connecté à l’équipe {user.team.name}.</p></div><section className="trust-card"><IconShieldLock size={28}/><h3>Comment les données sont utilisées</h3><p>Une seule humeur est acceptée par jour, selon l’heure de Paris. Elle ne peut pas être modifiée après l’envoi.</p><p>Les humeurs et les participations sont stockées séparément. Le manager consulte uniquement les tendances de son équipe sur 30 jours.</p><p>Les jours sous le seuil minimum de trois réponses sont masqués et exclus des totaux. Ce seuil limite les déductions sans garantir un anonymat absolu.</p><p>Le jeton de connexion reste sur l’appareil. Aucune copie personnelle des humeurs n’est conservée par cette V1.</p></section></main>;
}
