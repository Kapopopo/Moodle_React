import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, Prisma, Role, Tag, IdeaCategory, IdeaStatus } from '@prisma/client';
import { z } from 'zod';
import { aggregate, parisDay, shiftDay } from './aggregate.js';
import { loginEmail } from './login-email.js';
import { vssRouter } from './vss-routes.js';

export const prisma = new PrismaClient();
export const app = express();
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
const minimum = z.coerce.number().int().min(3).default(3).parse(process.env.MIN_RESPONSES);
app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGINS || 'http://localhost:5173,capacitor://localhost,http://localhost,https://localhost').split(',') }));
app.use(express.json({ limit: '2mb' }));
const error = (res: Response, status: number, code: string, message: string) => res.status(status).json({ error: { code, message } });
const asyncRoute = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { Promise.resolve(fn(req, res)).catch(next); };
const selectUser = { id: true, firstName: true, role: true, team: { select: { id: true, name: true } } } satisfies Prisma.UserSelect;
type CurrentUser = Prisma.UserGetPayload<{ select: typeof selectUser }>;
declare global { namespace Express { interface Request { user?: CurrentUser } } }
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) { error(res, 401, 'UNAUTHORIZED', 'Connecte-toi pour continuer.'); return; }
  let id: string;
  try { const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }); if (typeof decoded === 'string' || !decoded.sub) throw new Error(); id = decoded.sub; }
  catch { error(res, 401, 'UNAUTHORIZED', 'Ta session a expiré.'); return; }
  prisma.user.findUnique({ where: { id }, select: selectUser }).then(user => { if (!user) { error(res, 401, 'UNAUTHORIZED', 'Compte introuvable.'); return; } if (user.role === Role.VSS_REFERENT) { error(res, 403, 'FORBIDDEN', 'Ce compte référent d’entreprise n’est plus habilité. Contacte l’administration Moodly.'); return; } req.user = user; next(); }).catch(next);
};
export const requireRole = (role: Role) => (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== role) { error(res, 403, 'FORBIDDEN', 'Cette page ne correspond pas à ton rôle.'); return; } next();
};
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, handler: (_req, res) => error(res, 429, 'RATE_LIMITED', 'Trop de tentatives. Réessaie dans quelques minutes.') }), asyncRoute(async (req, res) => {
  const { email, password } = z.object({ email: loginEmail, password: z.string().min(1).max(128) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email }, include: { team: true } });
  // Always hash-compare to avoid exposing whether an address exists through timing.
  const valid = await bcrypt.compare(password, user?.passwordHash || '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW');
  if (!user || !valid) return error(res, 401, 'INVALID_CREDENTIALS', 'E-mail ou mot de passe incorrect.');
  if (user.role === Role.VSS_REFERENT) return error(res, 403, 'FORBIDDEN', 'Ce compte référent d’entreprise n’est plus habilité. Contacte l’administration Moodly.');
  return res.json({ token: jwt.sign({}, secret, { subject: user.id, expiresIn: '8h', algorithm: 'HS256' }), user: { id: user.id, firstName: user.firstName, role: user.role, team: { id: user.team.id, name: user.team.name } } });
}));
app.use('/api', requireAuth);
app.get('/api/auth/me', (req, res) => res.json(req.user));
const journalDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(day => {
  const date = new Date(day);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === day;
});
const journalSchema = z.object({
  enabled: z.boolean(),
  entries: z.array(z.object({ day: journalDay, score: z.number().int().min(1).max(5), tags: z.array(z.nativeEnum(Tag)).max(5) }).strict()).max(10000),
  notes: z.array(z.object({ day: journalDay, text: z.string().max(10000), intention: z.string().max(200).optional(), done: z.boolean().optional() }).strict()).max(10000)
}).strict().refine(j => new Set(j.entries.map(e => e.day)).size === j.entries.length && new Set(j.notes.map(n => n.day)).size === j.notes.length);
const ownJournal = (req: Request, res: Response, next: NextFunction) => {
  if (req.params.userId !== req.user!.id) { error(res, 403, 'FORBIDDEN', 'Ce carnet appartient à un autre compte.'); return; }
  res.set('Cache-Control', 'no-store');
  next();
};
app.get('/api/journal/:userId', requireRole(Role.EMPLOYEE), ownJournal, asyncRoute(async (req, res) => {
  const row = await prisma.personalJournal.findUnique({ where: { userId: req.user!.id } });
  res.json({ journal: row?.data || { enabled: false, entries: [], notes: [] }, revision: row?.revision || 0 });
}));
app.put('/api/journal/:userId', requireRole(Role.EMPLOYEE), ownJournal, asyncRoute(async (req, res) => {
  const { journal, revision } = z.object({ journal: journalSchema, revision: z.number().int().min(0).max(2147483646) }).strict().parse(req.body);
  const userId = req.user!.id;
  if (revision === 0) {
    try { await prisma.personalJournal.create({ data: { userId, data: journal } }); }
    catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return error(res, 409, 'JOURNAL_CONFLICT', 'Le carnet a changé. Recharge-le.');
      throw e;
    }
  } else {
    const updated = await prisma.personalJournal.updateMany({ where: { userId, revision }, data: { data: journal, revision: { increment: 1 } } });
    if (!updated.count) return error(res, 409, 'JOURNAL_CONFLICT', 'Le carnet a changé. Recharge-le.');
  }
  res.json({ journal, revision: revision + 1 });
}));
app.get('/api/moods/today', requireRole(Role.EMPLOYEE), asyncRoute(async (req, res) => {
  const row = await prisma.participation.findUnique({ where: { userId_day: { userId: req.user!.id, day: new Date(parisDay()) } } });
  res.json({ hasSubmitted: Boolean(row) });
}));
app.post('/api/moods', requireRole(Role.EMPLOYEE), asyncRoute(async (req, res) => {
  const data = z.object({ score: z.number().int().min(1).max(5), tags: z.array(z.nativeEnum(Tag)).max(5).refine(tags => new Set(tags).size === tags.length) }).strict().parse(req.body);
  const day = new Date(parisDay());
  try {
    await prisma.$transaction([prisma.participation.create({ data: { userId: req.user!.id, day } }), prisma.moodEntry.create({ data: { teamId: req.user!.team.id, day, ...data } })]);
  } catch (e) { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return error(res, 409, 'ALREADY_SUBMITTED', 'Ton humeur est déjà enregistrée pour aujourd’hui.'); throw e; }
  res.status(201).json({ submitted: true });
}));
app.get('/api/teams/me/summary', requireRole(Role.MANAGER), asyncRoute(async (req, res) => {
  const query = z.object({ days: z.coerce.number().int().refine(n => [1, 7, 30].includes(n)).default(30), to: journalDay.optional() }).strict().parse(req.query);
  const to = query.to || parisDay(), from = shiftDay(to, 1 - query.days), teamId = req.user!.team.id;
  const [entries, employeeCount] = await Promise.all([prisma.moodEntry.findMany({ where: { teamId, day: { gte: new Date(from), lte: new Date(to) } }, select: { day: true, score: true, tags: true } }), prisma.user.count({ where: { teamId, role: Role.EMPLOYEE } })]);
  res.json({ ...aggregate(entries, employeeCount, to, query.days, minimum), minimumResponses: minimum });
}));
// External services are opened by the employee; no mood, note or token is forwarded.
app.get('/api/support', requireRole(Role.EMPLOYEE), (_req, res) => {
  res.json({ therapyUrl: 'https://www.betterhelp.com/comment-fonctionne-betterhelp/', reportUrl: null, officialReportUrl: 'https://www.service-public.gouv.fr/particuliers/vosdroits/R50241', rightsUrl: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F1043', moralHarassmentUrl: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F2354' });
});
app.use('/api/vss', vssRouter(prisma, requireRole));
const requireTeamMember = (req: Request, res: Response, next: NextFunction) => { if ((req.user?.role === Role.VSS_REFERENT || req.user?.role === Role.ADMIN)) { error(res, 403, 'FORBIDDEN', 'Cet espace est réservé aux collaborateurs et managers.'); return; } next(); };
const ideaSelect = { id: true, category: true, title: true, description: true, status: true, managerNote: true } satisfies Prisma.IdeaSelect;
app.get('/api/ideas', requireTeamMember, asyncRoute(async (req, res) => {
  const { cursor } = z.object({ cursor: z.string().uuid().optional() }).strict().parse(req.query);
  const rows = await prisma.idea.findMany({ where: { teamId: req.user!.team.id, ...(cursor ? { id: { gt: cursor } } : {}) }, select: ideaSelect, orderBy: { id: 'asc' }, take: 51 });
  res.json({ ideas: rows.slice(0, 50), nextCursor: rows.length > 50 ? rows[49].id : null });
}));
app.post('/api/ideas', requireRole(Role.EMPLOYEE), rateLimit({ windowMs: 60 * 60_000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, handler: (_req, res) => error(res, 429, 'RATE_LIMITED', 'Trop de propositions. Réessaie plus tard.') }), asyncRoute(async (req, res) => {
  const data = z.object({ title: z.string().trim().min(3).max(100), description: z.string().trim().min(10).max(1500), category: z.nativeEnum(IdeaCategory) }).strict().parse(req.body);
  const idea = await prisma.idea.create({ data: { ...data, teamId: req.user!.team.id }, select: ideaSelect });
  res.status(201).json(idea);
}));
app.patch('/api/ideas/:id', requireRole(Role.MANAGER), asyncRoute(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const data = z.object({ status: z.nativeEnum(IdeaStatus), managerNote: z.string().trim().max(800) }).strict().parse(req.body);
  const result = await prisma.idea.updateMany({ where: { id, teamId: req.user!.team.id }, data });
  if (!result.count) return error(res, 404, 'NOT_FOUND', 'Proposition introuvable.');
  res.json({ updated: true });
}));
app.use((_req, res) => { error(res, 404, 'NOT_FOUND', 'Route introuvable.'); });
app.use((e: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (e instanceof z.ZodError || e instanceof SyntaxError) { error(res, 400, 'INVALID_INPUT', 'Vérifie les informations envoyées.'); return; }
  // Do not log request bodies, tokens, mood rows, or participation records.
  console.error('API error:', e instanceof Error ? e.name : 'UnknownError');
  error(res, 500, 'INTERNAL_ERROR', 'Un problème est survenu. Réessaie dans un instant.');
});
