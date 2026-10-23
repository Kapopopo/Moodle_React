import { Router, type RequestHandler, type Request, type Response } from 'express';
import { Role, Prisma, VssStatus, type PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { vssQuestions, VSS_VERSION, vssSubmissionSchema } from './vss-questionnaire.js';
import { encryptVss, decryptVss, vssKeyReady } from './vss-crypto.js';
export function vssRouter(prisma: PrismaClient, requireRole: (role: Role) => RequestHandler) {
  const router = Router();
  const route = (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler => (req, res, next) => { Promise.resolve(fn(req, res)).catch(next); };
  const fail = (res: Response, status: number, code: string, message: string) => res.status(status).json({ error: { code, message } });
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/questionnaire', requireRole(Role.EMPLOYEE), route(async (req, res) => {
    const count = await prisma.user.count({ where: { role: Role.ADMIN } });
    res.json({ version: VSS_VERSION, questions: vssQuestions, ready: vssKeyReady() && count > 0, recipientLabel: count ? 'l’administration Moodly, indépendante de ton entreprise' : null });
  }));
  router.post('/reports', requireRole(Role.EMPLOYEE), rateLimit({ windowMs: 60 * 60_000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, handler: (_req, res) => fail(res, 429, 'RATE_LIMITED', 'Trop de tentatives. Réessaie plus tard.') }), route(async (req, res) => {
    const data = vssSubmissionSchema.parse(req.body), teamId = req.user!.team.id;
    if (!vssKeyReady() || !await prisma.user.count({ where: { role: Role.ADMIN } })) return fail(res, 503, 'VSS_NOT_READY', 'Le dispositif interne n’est pas prêt. Aucune réponse n’a été enregistrée.');
    const acknowledge = (saved: { id: string; encryptedPayload: string }) => {
      const previous = decryptVss(saved.encryptedPayload, saved.id, teamId) as { version: number; answers: unknown; contactMode: string; contact: string };
      if (previous.version !== data.version || JSON.stringify(previous.answers) !== JSON.stringify(data.answers) || previous.contactMode !== data.contactMode || previous.contact !== data.contact) return fail(res, 409, 'VSS_SUBMISSION_CHANGED', 'Un dépôt existe déjà pour cette tentative. Les réponses modifiées n’ont pas été transmises.');
      return res.status(200).json({ reference: saved.id });
    };
    const existing = await prisma.vssReport.findUnique({ where: { teamId_submissionKey: { teamId, submissionKey: data.submissionKey } }, select: { id: true, encryptedPayload: true } });
    if (existing) return acknowledge(existing);
    const id = randomUUID(), encryptedPayload = encryptVss({ version: data.version, questions: vssQuestions, answers: data.answers, contactMode: data.contactMode, contact: data.contact }, id, teamId);
    try {
      await prisma.vssReport.create({ data: { id, teamId, submissionKey: data.submissionKey, encryptedPayload, questionnaireVersion: data.version } });
      return res.status(201).json({ reference: id });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') { const saved = await prisma.vssReport.findUniqueOrThrow({ where: { teamId_submissionKey: { teamId, submissionKey: data.submissionKey } }, select: { id: true, encryptedPayload: true } }); return acknowledge(saved); } throw e;
    }
  }));
  router.get('/dashboard', requireRole(Role.ADMIN), route(async (_req, res) => {
    const [groups, companies, pending] = await prisma.$transaction([
      prisma.vssReport.groupBy({ by: ['status'], orderBy: { status: 'asc' }, _count: { _all: true } }),
      prisma.team.findMany({ where: { vssReports: { some: {} } }, select: { id: true, name: true, _count: { select: { vssReports: true } } }, orderBy: [{ name: 'asc' }, { id: 'asc' }] }),
      prisma.vssReport.findMany({ where: { status: { in: [VssStatus.RECEIVED, VssStatus.REVIEWING] } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 5, select: { id: true, status: true, createdAt: true, questionnaireVersion: true, team: { select: { id: true, name: true } } } }),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    const counts = { RECEIVED: 0, REVIEWING: 0, CLOSED: 0 };
    for (const group of groups) { if (group._count && typeof group._count === 'object') counts[group.status] = group._count._all ?? 0; }
    res.json({ counts, total: Object.values(counts).reduce((a, b) => a + b, 0), companies: companies.map(company => ({ id: company.id, name: company.name, reportCount: company._count.vssReports })), pending });
  }));
  router.get('/companies', requireRole(Role.ADMIN), route(async (_req, res) => {
    const companies = await prisma.team.findMany({ where: { vssReports: { some: {} } }, select: { id: true, name: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] });
    res.json({ companies });
  }));
  router.get('/inbox', requireRole(Role.ADMIN), route(async (req, res) => {
    const { cursor, companyId, status } = z.object({ cursor: z.string().uuid().optional(), companyId: z.string().uuid().optional(), status: z.nativeEnum(VssStatus).optional() }).strict().parse(req.query);
    const reports = await prisma.vssReport.findMany({ where: { ...(companyId ? { teamId: companyId } : {}), ...(status ? { status } : {}), ...(cursor ? { id: { lt: cursor } } : {}) }, orderBy: { id: 'desc' }, take: 51, select: { id: true, status: true, createdAt: true, questionnaireVersion: true, team: { select: { id: true, name: true } } } });
    res.json({ reports: reports.slice(0, 50), nextCursor: reports.length > 50 ? reports[49].id : null });
  }));
  router.get('/inbox/:id', requireRole(Role.ADMIN), route(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const report = await prisma.vssReport.findUnique({ where: { id }, include: { team: { select: { id: true, name: true } } } });
    if (!report) return fail(res, 404, 'NOT_FOUND', 'Signalement introuvable.');
    const payload = decryptVss(report.encryptedPayload, id, report.teamId);
    await prisma.vssAccess.create({ data: { reportId: id, actorId: req.user!.id, action: 'READ' } });
    res.json({ id, status: report.status, createdAt: report.createdAt, team: report.team, payload });
  }));
  router.patch('/inbox/:id', requireRole(Role.ADMIN), route(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id), { status } = z.object({ status: z.nativeEnum(VssStatus) }).strict().parse(req.body);
    const result = await prisma.$transaction(async tx => { const result = await tx.vssReport.updateMany({ where: { id }, data: { status } }); if (result.count) await tx.vssAccess.create({ data: { reportId: id, actorId: req.user!.id, action: `STATUS_${status}` } }); return result; });
    if (!result.count) return fail(res, 404, 'NOT_FOUND', 'Signalement introuvable.'); res.json({ updated: true });
  }));
  return router;
}
