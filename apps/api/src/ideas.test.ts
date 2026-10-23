import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import supertest from 'supertest';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
process.env.JWT_SECRET ||= 'ideas-test-secret-at-least-32-characters-long';
const { app, prisma } = await import('./app.js');
const run = process.env.TEST_DATABASE === '1' ? describe : describe.skip;
run('Anonymous ideas and external support', () => {
  const suffix = randomUUID();
  let teamId: string, otherTeamId: string, employee: string, manager: string, outsider: string, ideaId: string;
  beforeAll(async () => {
    teamId = (await prisma.team.create({ data: { name: `Ideas test ${suffix}` } })).id;
    otherTeamId = (await prisma.team.create({ data: { name: `Other team ${suffix}` } })).id;
    const passwordHash = await bcrypt.hash('TestMoodly2026!', 4);
    const login = async (n: number, role: 'EMPLOYEE' | 'MANAGER', teamId: string) => {
      const email = `idea-${n}-${suffix}@moodly.test`;
      await prisma.user.create({ data: { email, firstName: 'Secret Name', passwordHash, role, teamId } });
      const res = await supertest(app).post('/api/auth/login').send({ email, password: 'TestMoodly2026!' });
      expect(res.status).toBe(200); return res.body.token as string;
    };
    employee = await login(0, 'EMPLOYEE', teamId); manager = await login(1, 'MANAGER', teamId); outsider = await login(2, 'MANAGER', otherTeamId);
  });
  afterAll(async () => {
    for (const id of [teamId, otherTeamId].filter(Boolean)) {
      await prisma.idea.deleteMany({ where: { teamId: id } });
      await prisma.user.deleteMany({ where: { teamId: id } });
      await prisma.team.delete({ where: { id } });
    }
    await prisma.$disconnect();
  });
  const auth = (token: string) => `Bearer ${token}`;
  const proposal = { category: 'GAME', title: 'Pause jeux collective', description: 'Une pause pour découvrir des jeux de société ensemble.' };
  it('requires authentication and rejects attempts to provide an author', async () => {
    expect((await supertest(app).get('/api/ideas')).status).toBe(401);
    expect((await supertest(app).post('/api/ideas').set('Authorization', auth(employee)).send({ ...proposal, userId: 'author' })).status).toBe(400);
  });
  it('stores an idea without any author or submission timestamp', async () => {
    const result = await supertest(app).post('/api/ideas').set('Authorization', auth(employee)).send(proposal);
    expect(result.status).toBe(201); ideaId = result.body.id;
    expect(Object.keys(result.body).sort()).toEqual(['category', 'description', 'id', 'managerNote', 'status', 'title']);
    const stored = await prisma.idea.findUniqueOrThrow({ where: { id: ideaId } });
    expect(Object.keys(stored).sort()).toEqual(['category', 'description', 'id', 'managerNote', 'status', 'teamId', 'title']);
  });
  it('lists team proposals without exposing an author', async () => {
    const result = await supertest(app).get('/api/ideas').set('Authorization', auth(manager));
    expect(result.body.ideas).toHaveLength(1); expect(JSON.stringify(result.body)).not.toContain('Secret Name');
    expect((await supertest(app).get('/api/ideas').set('Authorization', auth(outsider))).body.ideas).toEqual([]);
  });
  it('restricts creation to employees and changes to the team manager', async () => {
    expect((await supertest(app).post('/api/ideas').set('Authorization', auth(manager)).send(proposal)).status).toBe(403);
    const update = { status: 'PLANNED', managerNote: 'Prévu pour notre prochaine rencontre.' };
    expect((await supertest(app).patch(`/api/ideas/${ideaId}`).set('Authorization', auth(employee)).send(update)).status).toBe(403);
    expect((await supertest(app).patch(`/api/ideas/${ideaId}`).set('Authorization', auth(outsider)).send(update)).status).toBe(404);
    expect((await supertest(app).patch(`/api/ideas/${ideaId}`).set('Authorization', auth(manager)).send(update)).status).toBe(200);
    const result = await supertest(app).get('/api/ideas').set('Authorization', auth(employee));
    expect(result.body.ideas[0]).toMatchObject(update);
  });
  it('validates category, status and text length', async () => {
    expect((await supertest(app).post('/api/ideas').set('Authorization', auth(employee)).send({ ...proposal, category: 'INVALID' })).status).toBe(400);
    expect((await supertest(app).patch(`/api/ideas/${ideaId}`).set('Authorization', auth(manager)).send({ status: 'INVALID', managerNote: '' })).status).toBe(400);
    expect((await supertest(app).post('/api/ideas').set('Authorization', auth(employee)).send({ ...proposal, description: 'x'.repeat(1501) })).status).toBe(400);
  });
  it('exposes verified external support only to employees, without tracking their use', async () => {
    expect((await supertest(app).get('/api/support').set('Authorization', auth(manager))).status).toBe(403);
    const res = await supertest(app).get('/api/support').set('Authorization', auth(employee));
    expect(res.status).toBe(200);
    expect(res.body.officialReportUrl).toBe('https://www.service-public.gouv.fr/particuliers/vosdroits/R50241');
    expect(res.body.therapyUrl).toMatch(/^https:\/\/www.betterhelp.com\//);
    expect(res.body).not.toHaveProperty('userId');
  });
});
