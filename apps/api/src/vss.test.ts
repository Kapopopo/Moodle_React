import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';
import { randomUUID, randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { vssSubmissionSchema, VSS_VERSION } from './vss-questionnaire.js';
import { encryptVss, decryptVss } from './vss-crypto.js';
process.env.JWT_SECRET ||= 'test-vss-secret-with-at-least-32-characters';
process.env.VSS_ENCRYPTION_KEY = 'a'.repeat(64);
const { app, prisma } = await import('./app.js');
const valid = () => ({ version: VSS_VERSION, submissionKey: randomUUID(), answers: { position: 'SELF', concerns: ['UNSURE'], ongoing: 'UNSURE', description: 'Récit privé de test.', needs: ['LISTEN'] }, contactMode: 'ANONYMOUS', contact: '', consent: true });
describe('VSS question validation and encryption', () => {
  it('validates the current version and rejects missing necessary answers', () => {
    expect(vssSubmissionSchema.safeParse(valid()).success).toBe(true);
    expect(vssSubmissionSchema.safeParse({ ...valid(), answers: { needs: ['LISTEN'] } }).success).toBe(false);
    expect(vssSubmissionSchema.safeParse({ ...valid(), version: 0 }).success).toBe(false);
  });
  it('rejects consent omissions, unknown questions, duplicate choices and hidden contact', () => {
    expect(vssSubmissionSchema.safeParse({ ...valid(), consent: false }).success).toBe(false);
    expect(vssSubmissionSchema.safeParse({ ...valid(), userId: 'author' }).success).toBe(false);
    expect(vssSubmissionSchema.safeParse({ ...valid(), contact: 'private@example.test' }).success).toBe(false);
    expect(vssSubmissionSchema.safeParse({ ...valid(), answers: { ...valid().answers, concerns: ['UNSURE', 'UNSURE'] } }).success).toBe(false);
    expect(vssSubmissionSchema.safeParse({ ...valid(), answers: { ...valid().answers, unknown: 'field' } }).success).toBe(false);
  });
  it('requires voluntary contact information when recontact is selected', () => {
    expect(vssSubmissionSchema.safeParse({ ...valid(), contactMode: 'CONTACT' }).success).toBe(false);
    expect(vssSubmissionSchema.safeParse({ ...valid(), contactMode: 'CONTACT', contact: 'test@example.test' }).success).toBe(true);
  });
  it('encrypts with a fresh nonce and binds ciphertext to the report and team', () => {
    const payload = { description: 'sensitive text' }, id = randomUUID(), teamId = randomUUID();
    const encrypted = encryptVss(payload, id, teamId);
    expect(encrypted).not.toContain('sensitive text'); expect(decryptVss(encrypted, id, teamId)).toEqual(payload);
    expect(encryptVss(payload, id, teamId)).not.toEqual(encrypted);
    expect(() => decryptVss(encrypted, randomUUID(), teamId)).toThrow();
    expect(() => decryptVss(encrypted, id, randomUUID())).toThrow();
    const parts = encrypted.split('.'); parts[1] = randomBytes(16).toString('base64');
    expect(() => decryptVss(parts.join('.'), id, teamId)).toThrow();
  });
});
const run = process.env.TEST_DATABASE === '1' ? describe : describe.skip;
run('Internal VSS intake and referent access with PostgreSQL', () => {
  const suffix = randomUUID(); let teamId: string, otherTeamId: string, employee: string, manager: string, referent: string, outsider: string, referentId: string, reportId: string;
  beforeAll(async () => {
    teamId = (await prisma.team.create({ data: { name: `VSS ${suffix}` } })).id;
    otherTeamId = (await prisma.team.create({ data: { name: `Other VSS ${suffix}` } })).id;
    const passwordHash = await bcrypt.hash('TestMoodly2026!', 4);
    const login = async (n: number, role: 'EMPLOYEE' | 'MANAGER' | 'VSS_REFERENT' | 'ADMIN', teamId: string) => {
      const email = `vss-${n}-${suffix}@moodly.test`;
      const user = await prisma.user.create({ data: { email, firstName: `Secret${n}`, passwordHash, role, teamId } });
      if (n === 2) referentId = user.id;
      const res = await supertest(app).post('/api/auth/login').send({ email, password: 'TestMoodly2026!' }); if (role === 'VSS_REFERENT') { expect(res.status).toBe(403); return jwt.sign({}, process.env.JWT_SECRET!, { subject: user.id }); }
      expect(res.status).toBe(200); return res.body.token as string;
    };
    employee = await login(0, 'EMPLOYEE', teamId); manager = await login(1, 'MANAGER', teamId); referent = await login(2, 'ADMIN', teamId); outsider = await login(3, 'VSS_REFERENT', otherTeamId);
  });
  afterAll(async () => {
    for (const id of [teamId, otherTeamId].filter(Boolean)) {
      await prisma.vssReport.deleteMany({ where: { teamId: id } }); await prisma.user.deleteMany({ where: { teamId: id } }); await prisma.team.delete({ where: { id } });
    }
    await prisma.$disconnect();
  });
  const auth = (token: string) => `Bearer ${token}`;
  it('returns our questions to employees only, with an available recipient', async () => {
    const res = await supertest(app).get('/api/vss/questionnaire').set('Authorization', auth(employee));
    expect(res.status).toBe(200); expect(res.body.ready).toBe(true); expect(res.body.questions).toHaveLength(7);
    expect((await supertest(app).get('/api/vss/questionnaire').set('Authorization', auth(manager))).status).toBe(403);
  });
  it('refuses intake without a referent and stores nothing', async () => {
    const count = vi.spyOn(prisma.user, 'count').mockResolvedValueOnce(0);
    try {
      const res = await supertest(app).post('/api/vss/reports').set('Authorization', auth(employee)).send(valid());
      expect(res.status).toBe(503); expect(await prisma.vssReport.count({ where: { teamId } })).toBe(0);
    } finally { count.mockRestore(); }
  });
  it('stores only ciphertext with no author and makes duplicate submission retries idempotent', async () => {
    const data = valid(), post = () => supertest(app).post('/api/vss/reports').set('Authorization', auth(employee)).send(data);
    const [a, b] = await Promise.all([post(), post()]);
    expect([a.status, b.status].sort()).toEqual([200, 201]); expect(a.body.reference).toBe(b.body.reference); reportId = a.body.reference;
    expect(Object.keys(a.body)).toEqual(['reference']);
    const stored = await prisma.vssReport.findUniqueOrThrow({ where: { id: reportId } });
    expect(JSON.stringify(stored)).not.toContain('Récit privé'); expect(stored).not.toHaveProperty('userId');
    expect(await prisma.vssReport.count({ where: { teamId } })).toBe(1);
    const changed = await supertest(app).post('/api/vss/reports').set('Authorization', auth(employee)).send({ ...data, answers: { ...data.answers, description: 'Une autre réponse après une tentative ambiguë.' } });
    expect(changed.status).toBe(409);
    expect(changed.body.error.code).toBe('VSS_SUBMISSION_CHANGED');
  });
  it('blocks managers, employees and referents of another team from reading the dossier', async () => {
    expect((await supertest(app).get('/api/vss/inbox').set('Authorization', auth(manager))).status).toBe(403);
    expect((await supertest(app).get(`/api/vss/inbox/${reportId}`).set('Authorization', auth(employee))).status).toBe(403);
    expect((await supertest(app).get(`/api/vss/inbox/${reportId}`).set('Authorization', auth(outsider))).status).toBe(403);
    expect((await supertest(app).get('/api/vss/inbox').set('Authorization', auth(outsider))).status).toBe(403);
  });
  it('shows metadata separately and audits explicit referent reads', async () => {
    const list = await supertest(app).get(`/api/vss/inbox?companyId=${teamId}`).set('Authorization', auth(referent));
    expect(list.body.reports).toHaveLength(1); expect(JSON.stringify(list.body)).not.toContain('Récit privé'); expect(list.headers['cache-control']).toBe('no-store');
    const detail = await supertest(app).get(`/api/vss/inbox/${reportId}`).set('Authorization', auth(referent));
    expect(detail.body.payload.answers.description).toBe('Récit privé de test.');
    expect(await prisma.vssAccess.count({ where: { reportId, actorId: referentId, action: 'READ' } })).toBe(1);
  });
  it('allows only the proper referent to update and audits the status change', async () => {
    const patch = (token: string) => supertest(app).patch(`/api/vss/inbox/${reportId}`).set('Authorization', auth(token)).send({ status: 'REVIEWING' });
    expect((await patch(manager)).status).toBe(403); expect((await patch(outsider)).status).toBe(403); expect((await patch(referent)).status).toBe(200);
    expect(await prisma.vssAccess.count({ where: { reportId, action: 'STATUS_REVIEWING' } })).toBe(1);
    expect((await prisma.vssReport.findUniqueOrThrow({ where: { id: reportId } })).status).toBe('REVIEWING');
  });
  it('does not grant referents access to manager statistics or the idea box', async () => {
    expect((await supertest(app).get('/api/teams/me/summary').set('Authorization', auth(referent))).status).toBe(403);
    expect((await supertest(app).get('/api/ideas').set('Authorization', auth(referent))).status).toBe(403);
    expect((await supertest(app).get('/api/vss/questionnaire').set('Authorization', auth(referent))).status).toBe(403);
    expect((await supertest(app).post('/api/vss/reports').set('Authorization', auth(referent)).send(valid())).status).toBe(403);
  });
});
