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

describe('Scope', () => {
  it('keeps external therapy outside this version', async () => {
    expect((await supertest(app).get('/api/support').set('Authorization', `Bearer ${token(employee.id)}`)).status).toBe(404);
  });
});
