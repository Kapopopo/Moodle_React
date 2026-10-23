import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
process.env.JWT_SECRET ||= 'journal-test-secret-at-least-32-characters';
const { app, prisma } = await import('./app.js');
const run = process.env.TEST_DATABASE === '1' ? describe : describe.skip;
run('Persistent journal across authenticated devices', () => {
  let teamId: string;
  let userId: string;
  let otherId: string;
  const auth = (id: string) => `Bearer ${jwt.sign({}, process.env.JWT_SECRET!, { subject: id })}`;
  const journal = { enabled: true, entries: [{day:'2026-10-23',score:4,tags:[]}], notes:[{day:'2026-10-23',text:'Saved on emulator'}] };
  beforeAll(async () => {
    const suffix = randomUUID();
    teamId = (await prisma.team.create({data:{name:`Journal test ${suffix}`}})).id;
    for (const other of [false,true]) {
      const user = await prisma.user.create({data:{email:`journal-${other}-${suffix}@example.test`,firstName:'Test',passwordHash:'unused',role:'EMPLOYEE',teamId}});
      if(other) otherId = user.id; else userId = user.id;
    }
  });
  afterAll(async () => {
    if(teamId) {
      await prisma.user.deleteMany({where:{teamId}});
      await prisma.team.delete({where:{id:teamId}});
    }
    await prisma.$disconnect();
  });
  it('creates once, reads from another session, and isolates accounts', async () => {
    const save = await supertest(app).put(`/api/journal/${userId}`).set('Authorization',auth(userId)).send({journal,revision:0});
    expect(save.status).toBe(200);
    const phone = await supertest(app).get(`/api/journal/${userId}`).set('Authorization',auth(userId));
    expect(phone.body).toEqual({journal,revision:1});
    expect((await supertest(app).get(`/api/journal/${userId}`).set('Authorization',auth(otherId))).status).toBe(403);
    expect((await supertest(app).get(`/api/journal/${otherId}`).set('Authorization',auth(otherId))).body.journal.notes).toEqual([]);
    expect((await supertest(app).put(`/api/journal/${userId}`).set('Authorization',auth(userId)).send({journal,revision:0})).status).toBe(409);
  });
  it('accepts only one simultaneous revision and persists an account-wide clear', async () => {
    const save = () => supertest(app).put(`/api/journal/${userId}`).set('Authorization',auth(userId)).send({journal,revision:1});
    expect((await Promise.all([save(),save()])).map(r=>r.status).sort()).toEqual([200,409]);
    const cleared = {enabled:false,entries:[],notes:[]};
    expect((await supertest(app).put(`/api/journal/${userId}`).set('Authorization',auth(userId)).send({journal:cleared,revision:2})).status).toBe(200);
    expect((await supertest(app).get(`/api/journal/${userId}`).set('Authorization',auth(userId))).body).toEqual({journal:cleared,revision:3});
  });
});
