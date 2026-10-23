import { vssRouter } from './vss-routes.js';
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

export const prisma = new PrismaClient();
export const app = express();
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
const minimum = z.coerce.number().int().min(3).default(3).parse(process.env.MIN_RESPONSES);
app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGINS || 'http://localhost:5173,capacitor://localhost,http://localhost,https://localhost').split(',') }));
app.use(express.json({ limit: '32kb' }));
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
  prisma.user.findUnique({ where: { id }, select: selectUser }).then(user => { if (!user) { error(res, 401, 'UNAUTHORIZED', 'Compte introuvable.'); return; } if (user.role === Role.VSS_REFERENT) { error(res, 403, 'FORBIDDEN', 'Ce compte ne dispose pas des accès nécessaires.'); return; } req.user = user; next(); }).catch(next);
};
export const requireRole = (role: Role) => (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== role) { error(res, 403, 'FORBIDDEN', 'Cette page ne correspond pas à ton rôle.'); return; } next();
};
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, handler: (_req, res) => error(res, 429, 'RATE_LIMITED', 'Trop de tentatives. Réessaie dans quelques minutes.') }), asyncRoute(async (req, res) => {
  const { email, password } = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(128) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email }, include: { team: true } });
  // Always hash-compare to avoid exposing whether an address exists through timing.
  const valid = await bcrypt.compare(password, user?.passwordHash || '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW');
  if (!user || !valid) return error(res, 401, 'INVALID_CREDENTIALS', 'E-mail ou mot de passe incorrect.');
  if (user.role === Role.VSS_REFERENT) return error(res, 403, 'FORBIDDEN', 'Ce compte ne dispose pas des accès nécessaires.');
  return res.json({ token: jwt.sign({}, secret, { subject: user.id, expiresIn: '8h', algorithm: 'HS256' }), user: { id: user.id, firstName: user.firstName, role: user.role, team: { id: user.team.id, name: user.team.name } } });
}));
app.use('/api', requireAuth);
app.get('/api/auth/me', (req, res) => res.json(req.user));
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
  z.object({ days: z.coerce.number().int().refine(n => n === 30).default(30) }).parse(req.query);
  const to = parisDay(), from = shiftDay(to, -29), teamId = req.user!.team.id;
  const [entries, employeeCount] = await Promise.all([prisma.moodEntry.findMany({ where: { teamId, day: { gte: new Date(from), lte: new Date(to) } }, select: { day: true, score: true, tags: true } }), prisma.user.count({ where: { teamId, role: Role.EMPLOYEE } })]);
  res.json({ ...aggregate(entries, employeeCount, to, 30, minimum), minimumResponses: minimum });
}));
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
