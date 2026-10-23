import { useId } from 'react';
export const moods = [
  { score: 1, label: 'Ça ne va pas', name: 'Goutte', color: '#B49CFF', background: '#EFE9FF' },
  { score: 2, label: 'Bof', name: 'Brume', color: '#8EC5FF', background: '#E6F2FF' },
  { score: 3, label: 'Ça va', name: 'Galet', color: '#8EE3C8', background: '#E2F7EF' },
  { score: 4, label: 'Bien', name: 'Rayon', color: '#FFD84D', background: '#FFF6D6' },
  { score: 5, label: 'Au top', name: 'Pétille', color: '#FF9466', background: '#FFEADF' },
];
export function Mascot({ score, size = 100, title, className = '' }: { score: number; size?: number; title?: string; className?: string }) {
  const id = useId();
  return <svg className={className} width={size} height={size} viewBox="0 0 100 100" role={title ? 'img' : undefined} aria-labelledby={title ? id : undefined} aria-hidden={!title} xmlns="http://www.w3.org/2000/svg">
    {title && <title id={id}>{title}</title>}
    {score === 1 && <><path d="M50 8C44 19 19 44 19 64a31 31 0 0 0 62 0C81 44 56 19 50 8Z" fill="#B49CFF"/><g stroke="#111" strokeWidth="3.5" strokeLinecap="round" fill="none"><path d="M33 55l10-4M57 51l10 4"/><path d="M42 81q8-7 16 0"/></g><circle cx="40" cy="63" r="3.5"/><circle cx="60" cy="63" r="3.5"/></>}
    {score === 2 && <><path d="M23 78C8 78 7 56 23 53C21 35 41 26 51 38C59 25 82 29 80 49C95 51 94 78 77 78Z" fill="#8EC5FF"/><g stroke="#111" strokeWidth="3.5" strokeLinecap="round" fill="none"><path d="M35 58q5 4 10 0M55 58q5 4 10 0M42 69Q46 66 50 69Q54 72 58 69"/></g></>}
    {score === 3 && <><ellipse cx="50" cy="56" rx="35" ry="29" fill="#8EE3C8"/><circle cx="40" cy="52" r="3.5"/><circle cx="60" cy="52" r="3.5"/><path d="M42 66h16" stroke="#111" strokeWidth="3.5" strokeLinecap="round"/></>}
    {score === 4 && <><path d="M83 54h8M73.3 77.3l5.7 5.7M50 87v8M26.7 77.3L21 83M17 54H9M26.7 30.7L21 25M50 21v-8M73.3 30.7L79 25" stroke="#FFD84D" strokeWidth="6" strokeLinecap="round"/><circle cx="50" cy="54" r="27" fill="#FFD84D"/><g stroke="#111" strokeWidth="3.5" strokeLinecap="round" fill="none"><path d="M38 52q4-5 8 0M54 52q4-5 8 0M40 60q10 10 20 0"/></g></>}
    {score === 5 && <><g fill="#FF9466"><circle cx="77" cy="54" r="10"/><circle cx="69.1" cy="73.1" r="10"/><circle cx="50" cy="81" r="10"/><circle cx="30.9" cy="73.1" r="10"/><circle cx="23" cy="54" r="10"/><circle cx="30.9" cy="34.9" r="10"/><circle cx="50" cy="27" r="10"/><circle cx="69.1" cy="34.9" r="10"/><circle cx="50" cy="54" r="28"/></g><path d="M36 51q5-6 10 0M54 51q5-6 10 0" fill="none" stroke="#111" strokeWidth="3.5" strokeLinecap="round"/><path d="M40 59q10 14 20 0z" fill="#111" stroke="#111" strokeWidth="2" strokeLinejoin="round"/></>}
  </svg>;
}
