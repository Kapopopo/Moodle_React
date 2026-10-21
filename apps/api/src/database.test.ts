import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import supertest from 'supertest';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { parisDay } from './aggregate.js';
process.env.JWT_SECRET ||= 'integration-test-secret-with-at-least-32-characters';
const { app, prisma } = await import('./app.js');
const run = process.env.TEST_DATABASE === '1' ? describe : describe.skip;
run('PostgreSQL end-to-end API and atomic submission', () => {
  let teamId: string, employeeToken: string, managerToken: string;
  const suffix = randomUUID();
  beforeAll(async () => {
    const team = await prisma.team.create({ data: { name: `Test ${suffix}` } }); teamId = team.id;
    const passwordHash = await bcrypt.hash('TestMoodly2026!', 4);
    for (let i = 0; i < 4; i++) await prisma.user.create({ data: { email: `test-${i}-${suffix}@moodly.test`, firstName: 'Test', passwordHash, role: i === 3 ? 'MANAGER' : 'EMPLOYEE', teamId } });
    const login = async (i: number) => { const result = await supertest(app).post('/api/auth/login').send({ email: `test-${i}-${suffix}@moodly.test`, password: 'TestMoodly2026!' }); expect(result.status).toBe(200); return result.body.token as string; };
    employeeToken = await login(0); managerToken = await login(3);
  });
  afterAll(async () => {
    if (teamId) {
      await prisma.participation.deleteMany({ where: { user: { teamId } } });
      await prisma.moodEntry.deleteMany({ where: { teamId } });
      await prisma.user.deleteMany({ where: { teamId } });
      await prisma.team.delete({ where: { id: teamId } });
    }
    await prisma.$disconnect();
  });
  it('has no submission initially', async () => {
    const result = await supertest(app).get('/api/moods/today').set('Authorization', `Bearer ${employeeToken}`);
    expect(result.body).toEqual({ hasSubmitted: false });
  });
  it('creates exactly one anonymous mood when two submissions race', async () => {
    const submit = () => supertest(app).post('/api/moods').set('Authorization', `Bearer ${employeeToken}`).send({ score: 4, tags: ['AMBIANCE_EQUIPE'] });
    const results = await Promise.all([submit(), submit()]);
    expect(results.map(r => r.status).sort()).toEqual([201, 409]);
    const rows = await prisma.moodEntry.findMany({ where: { teamId } });
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(['day', 'id', 'score', 'tags', 'teamId']);
    expect(await prisma.participation.count({ where: { user: { teamId } } })).toBe(1);
    const today = await supertest(app).get('/api/moods/today').set('Authorization', `Bearer ${employeeToken}`);
    expect(today.body).toEqual({ hasSubmitted: true });
  });
  it('masks the small day then publishes it only after three responses', async () => {
    const summary = () => supertest(app).get('/api/teams/me/summary?days=30').set('Authorization', `Bearer ${managerToken}`);
    const hidden = await summary(); expect(hidden.status).toBe(200);
    expect(hidden.body.totalResponses).toBe(0);
    expect(hidden.body.days.at(-1)).toMatchObject({ masked: true, total: null, distribution: null });
    await prisma.moodEntry.createMany({ data: [2, 5].map(score => ({ teamId, day: new Date(parisDay()), score, tags: ['CHARGE_DE_TRAVAIL'] })) });
    const visible = await summary();
    expect(visible.body.totalResponses).toBe(3);
    expect(visible.body.days.at(-1)).toMatchObject({ masked: false, total: 3 });
    const json = JSON.stringify(visible.body);
    expect(json).not.toContain('userId'); expect(json).not.toContain('firstName'); expect(json).not.toContain('createdAt'); expect(json).not.toContain(teamId);
  });
});
