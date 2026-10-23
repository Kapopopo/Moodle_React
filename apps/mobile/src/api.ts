import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
export type User = { id: string; firstName: string; role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN'; team: { id: string; name: string } };
export type Summary = { period: { from: string; to: string }; participationRate: number; totalResponses: number; minimumResponses: number; days: { date: string; isWorkday: boolean; future?: boolean; masked: boolean; total: number | null; distribution: Record<string, number> | null }[]; topTags: { tag: string; share: number }[] };
export const tags: Record<string, string> = { CHARGE_DE_TRAVAIL: 'Charge de travail', AMBIANCE_EQUIPE: 'Ambiance d’équipe', MANAGEMENT: 'Management', EQUILIBRE_PERSO: 'Équilibre perso', CONDITIONS_TRAVAIL: 'Conditions de travail' };
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Browser development uses Vite's same-origin proxy, including on LAN and fallback ports.
  // Installed mobile builds still use their explicit network API URL.
  const base = import.meta.env.DEV && !Capacitor.isNativePlatform() ? '/api' : import.meta.env.VITE_API_URL;
  if (!base) throw new Error('Configure VITE_API_URL pour connecter Moodly à ton API.');
  const { value } = await Preferences.get({ key: 'moodly.token' });
  // AbortSignal.timeout is unavailable on older Android WebViews.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response: Response;
  try { response = await fetch(`${base.replace(/\/$/, '')}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(value ? { Authorization: `Bearer ${value}` } : {}), ...options.headers }, signal: controller.signal }); }
  catch { throw new Error(`Impossible de joindre Moodly (${base}). Vérifie que le serveur est démarré et accessible depuis ce téléphone.`); }
  finally { clearTimeout(timeout); }
  const data = await response.json();
  if (!response.ok) throw new ApiError(response.status, data.error?.message || 'Un problème est survenu.');
  return data as T;
}
