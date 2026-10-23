import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
process.env.JWT_SECRET = 'test-secret-with-at-least-thirty-two-characters';
const { app, prisma } = await import('./app.js');
const employee = { id: 'employee-id', firstName: 'Alex', role: 'EMPLOYEE' as const, team: { id: 'team-id', name: 'Produit' } };
const manager = { ...employee, id: 'manager-id', role: 'MANAGER' as const };
const token = (id: string) => jwt.sign({}, process.env.JWT_SECRET!, { subject: id });
beforeAll(() => { vi.spyOn(prisma.user, 'findUnique').mockImplementation(async (args: any) => args.where.id === 'employee-id' ? employee : args.where.id === 'manager-id' ? manager : null as any); });
afterAll(async () => { vi.restoreAllMocks(); await prisma.$disconnect(); });
describe('API access control', () => {
  it('requires authentication', async () => { expect((await supertest(app).get('/api/moods/today')).status).toBe(401); });
  it('rejects invalid tokens', async () => { expect((await supertest(app).get('/api/auth/me').set('Authorization', 'Bearer invalid')).status).toBe(401); });
  it('forbids employees from manager summaries', async () => { expect((await supertest(app).get('/api/teams/me/summary').set('Authorization', `Bearer ${token(employee.id)}`)).status).toBe(403); });
  it('forbids managers from submitting and reading employee participation', async () => {
    const auth = `Bearer ${token(manager.id)}`;
    expect((await supertest(app).post('/api/moods').set('Authorization', auth).send({ score: 3, tags: [] })).status).toBe(403);
    expect((await supertest(app).get('/api/moods/today').set('Authorization', auth)).status).toBe(403);
  });
  it('validates scores and duplicate tags before any write', async () => {
    const auth = `Bearer ${token(employee.id)}`;
    expect((await supertest(app).post('/api/moods').set('Authorization', auth).send({ score: 6, tags: [] })).status).toBe(400);
    expect((await supertest(app).post('/api/moods').set('Authorization', auth).send({ score: 3, tags: ['MANAGEMENT', 'MANAGEMENT'] })).status).toBe(400);
  });
  it('rejects expired JWTs', async () => {
    const expired = jwt.sign({}, process.env.JWT_SECRET!, { subject: employee.id, expiresIn: -1 });
    expect((await supertest(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`)).status).toBe(401);
  });
});

describe('Account journal isolation and concurrency', () => {
  const journal = { enabled: true, entries: [{ day: '2026-10-23', score: 4, tags: [] }], notes: [{ day: '2026-10-23', text: 'Private note' }] };
  const auth = `Bearer ${token(employee.id)}`;
  it('requires a session and rejects other accounts and managers', async () => {
    expect((await supertest(app).get(`/api/journal/${employee.id}`)).status).toBe(401);
    expect((await supertest(app).get('/api/journal/other').set('Authorization', auth)).status).toBe(403);
    expect((await supertest(app).put('/api/journal/other').set('Authorization', auth).send({journal, revision:0})).status).toBe(403);
    expect((await supertest(app).get(`/api/journal/${employee.id}`).set('Authorization', `Bearer ${token(manager.id)}`)).status).toBe(403);
  });
  it('loads the same account data for independent sessions', async () => {
    const read = vi.spyOn(prisma.personalJournal, 'findUnique').mockResolvedValue({ userId: employee.id, data: journal, revision: 2 });
    for (let device = 0; device < 2; device++) {
      const response = await supertest(app).get(`/api/journal/${employee.id}`).set('Authorization', `Bearer ${token(employee.id)}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({journal, revision:2});
      expect(response.headers['cache-control']).toBe('no-store');
    }
    expect(read).toHaveBeenCalledWith({where:{userId:employee.id}});
  });
  it('validates dates and unexpected ownership fields', async () => {
    for (const invalid of [{...journal, userId:'other'}, {...journal, notes:[{day:'2026-02-30',text:'Bad date'}]}]) {
      expect((await supertest(app).put(`/api/journal/${employee.id}`).set('Authorization',auth).send({journal:invalid,revision:0})).status).toBe(400);
    }
  });
  it('writes only the session account and detects stale device revisions', async () => {
    const update = vi.spyOn(prisma.personalJournal, 'updateMany').mockResolvedValueOnce({count:1}).mockResolvedValueOnce({count:0});
    const save = () => supertest(app).put(`/api/journal/${employee.id}`).set('Authorization',auth).send({journal,revision:2});
    expect((await save()).body).toEqual({journal,revision:3});
    expect(update).toHaveBeenCalledWith({where:{userId:employee.id,revision:2},data:{data:journal,revision:{increment:1}}});
    expect((await save()).status).toBe(409);
  });
});

describe('Manager chart periods', () => {
  it('supports day, week and month and validates the requested period', async () => {
    vi.spyOn(prisma.moodEntry,'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.user,'count').mockResolvedValue(8);
    for (const days of [1,7,30]) {
      const response = await supertest(app).get(`/api/teams/me/summary?days=${days}&to=2026-10-26`).set('Authorization',`Bearer ${token(manager.id)}`);
      expect(response.status).toBe(200);
      expect(response.body.days).toHaveLength(days);
    }
    for (const query of ['days=999','days=7&to=2026-02-30']) {
      expect((await supertest(app).get(`/api/teams/me/summary?${query}`).set('Authorization',`Bearer ${token(manager.id)}`)).status).toBe(400);
    }
  });
});

describe('Accented account login', () => {
  it('looks up the same stored account with or without accents', async () => {
    const bcrypt = (await import('bcrypt')).default;
    const password = 'LoginTest2026!';
    const passwordHash = await bcrypt.hash(password, 4);
    for (const email of ['Maéna@gmail.com', 'MAENA@gmail.com', 'Mae\u0301na@gmail.com']) {
      const lookup = vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({ ...employee, email: 'maena@gmail.com', passwordHash } as any);
      const response = await supertest(app).post('/api/auth/login').send({email,password});
      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(employee.id);
      expect(lookup).toHaveBeenLastCalledWith({where:{email:'maena@gmail.com'},include:{team:true}});
    }
  });
});
