import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { encryptVss } from './vss-crypto.js';
process.env.JWT_SECRET = 'admin-test-secret-at-least-thirty-two-characters';
process.env.VSS_ENCRYPTION_KEY = 'b'.repeat(64);
const { app, prisma } = await import('./app.js');
const adminTeam = randomUUID(), companyId = randomUUID(), reportId = randomUUID();
const company = { id: companyId, name: 'Entreprise cliente' };
const authorization = (role: string) => `Bearer ${jwt.sign({}, process.env.JWT_SECRET!, { subject: role })}`;
beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(prisma.user, 'findUnique').mockImplementation(async () => null);
});
function login(role: 'ADMIN' | 'EMPLOYEE' | 'MANAGER' | 'VSS_REFERENT') {
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: role, firstName: role, role, team: { id: adminTeam, name: 'Administration' } } as any);
  return authorization(role);
}
afterAll(async () => { vi.restoreAllMocks(); await prisma.$disconnect(); });
describe('Administration VSS globale', () => {
  it.each(['EMPLOYEE', 'MANAGER', 'VSS_REFERENT'] as const)('refuse tous les accès administratifs au rôle %s', async role => {
    const auth = login(role);
    for (const path of ['/dashboard', '/companies', '/inbox', `/inbox/${reportId}`]) {
      expect((await supertest(app).get(`/api/vss${path}`).set('Authorization', auth)).status).toBe(403);
    }
    expect((await supertest(app).patch(`/api/vss/inbox/${reportId}`).set('Authorization', auth).send({ status: 'CLOSED' })).status).toBe(403);
  });
  it('liste seulement les entreprises ayant un signalement sans charger les récits', async () => {
    const auth = login('ADMIN');
    const query = vi.spyOn(prisma.team, 'findMany').mockResolvedValue([company] as any);
    const res = await supertest(app).get('/api/vss/companies').set('Authorization', auth);
    expect(res.status).toBe(200); expect(res.body.companies).toEqual([company]);
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ where: { vssReports: { some: {} } }, select: { id: true, name: true } }));
  });
  it('filtre et pagine les dossiers par entreprise et valide le filtre', async () => {
    const auth = login('ADMIN'), cursor = randomUUID();
    const query = vi.spyOn(prisma.vssReport, 'findMany').mockResolvedValue([]);
    expect((await supertest(app).get(`/api/vss/inbox?companyId=${companyId}&cursor=${cursor}`).set('Authorization', auth)).status).toBe(200);
    expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ where: { teamId: companyId, id: { lt: cursor } }, take: 51 }));
    await supertest(app).get('/api/vss/inbox').set('Authorization', auth);
    expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ where: {} }));
    expect((await supertest(app).get('/api/vss/inbox?companyId=invalid').set('Authorization', auth)).status).toBe(400);
  });
  it('déchiffre un dossier d’une autre entreprise et journalise sa lecture', async () => {
    const auth = login('ADMIN'), payload = { answers: { description: 'confidentiel' } };
    vi.spyOn(prisma.vssReport, 'findUnique').mockResolvedValue({ id: reportId, teamId: companyId, team: company, status: 'RECEIVED', encryptedPayload: encryptVss(payload, reportId, companyId), createdAt: new Date() } as any);
    const audit = vi.spyOn(prisma.vssAccess, 'create').mockResolvedValue({} as any);
    const res = await supertest(app).get(`/api/vss/inbox/${reportId}`).set('Authorization', auth);
    expect(res.status).toBe(200); expect(res.body.payload).toEqual(payload); expect(res.body.team).toEqual(company);
    expect(audit).toHaveBeenCalledWith({ data: { reportId, actorId: 'ADMIN', action: 'READ' } });
  });
  it('renvoie les compteurs complets et les métadonnées sans récit', async () => {
    const auth = login('ADMIN');
    vi.spyOn(prisma, '$transaction').mockResolvedValue([
      [{ status: 'RECEIVED', _count: { _all: 60 } }, { status: 'CLOSED', _count: { _all: 2 } }],
      [{ ...company, _count: { vssReports: 62 } }], [],
    ] as any);
    const res = await supertest(app).get('/api/vss/dashboard').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ counts: { RECEIVED: 60, REVIEWING: 0, CLOSED: 2 }, total: 62, companies: [{ ...company, reportCount: 62 }], pending: [] });
    expect(res.headers['cache-control']).toBe('no-store');
  });
  it('autorise un changement de statut global dans une transaction journalisée', async () => {
    const auth = login('ADMIN');
    const updateMany = vi.fn().mockResolvedValue({ count: 1 }), create = vi.fn();
    vi.spyOn(prisma, '$transaction').mockImplementation(async (fn: any) => fn({ vssReport: { updateMany }, vssAccess: { create } }));
    const res = await supertest(app).patch(`/api/vss/inbox/${reportId}`).set('Authorization', auth).send({ status: 'CLOSED' });
    expect(res.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({ where: { id: reportId }, data: { status: 'CLOSED' } });
    expect(create).toHaveBeenCalledWith({ data: { reportId, actorId: 'ADMIN', action: 'STATUS_CLOSED' } });
  });
});
