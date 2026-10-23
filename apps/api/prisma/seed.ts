import 'dotenv/config';
import { PrismaClient, Role, Tag } from '@prisma/client';
import bcrypt from 'bcrypt';
import { parisDay, shiftDay, isWorkday } from '../src/aggregate.js';
const db = new PrismaClient();
async function seed() {
  const existing = await db.user.findUnique({ where: { email: 'manager@moodly.dev' } });
  if (existing) throw new Error('Les comptes existent déjà. Seed annulé pour préserver les données.');
  const passwordHash = await bcrypt.hash('Moodly2026!', 12);
  await db.$transaction(async tx => {
    const team = await tx.team.create({ data: { name: 'Équipe produit' } });
    await tx.user.create({ data: { email: 'manager@moodly.dev', firstName: 'Camille', role: Role.MANAGER, passwordHash, teamId: team.id } });
    const names = ['Maéna', 'Lou', 'Sacha', 'Emma', 'Noa', 'Jules', 'Lina', 'Max'];
    const users = [];
    for (let i = 0; i < 8; i++) users.push(await tx.user.create({ data: { email: i === 0 ? 'maena@gmail.com' : `employe${i + 1}@moodly.dev`, firstName: names[i], role: Role.EMPLOYEE, passwordHash: i === 0 ? await bcrypt.hash('EPITECHDIGI2026-Maena!', 12) : passwordHash, teamId: team.id } }));
    for (const [firstName, email, suffix] of [['Wilson', 'wilson@gmail.com', 'Wilson'], ['Nawfal', 'nawfal@gmail.com', 'Nawfal'], ['Théo', 'theo@gmail.com', 'Theo']]) {
      await tx.user.create({ data: { firstName, email, role: Role.EMPLOYEE, passwordHash: await bcrypt.hash(`EPITECHDIGI2026-${suffix}!`, 12), teamId: team.id } });
    }
    const today = parisDay();
    let workIndex = 0;
    for (let offset = -29; offset <= 0; offset++) {
      const date = shiftDay(today, offset);
      if (!isWorkday(date)) continue;
      const count = workIndex === 3 || workIndex === 11 ? 2 : offset === 0 ? 5 : 5 + workIndex % 4;
      for (let i = 0; i < count; i++) {
        const score = Math.max(1, Math.min(5, Math.round(2.1 + (offset + 29) / 21 + (i % 3 - 1))));
        const tags = [i % 2 === 0 ? Tag.CHARGE_DE_TRAVAIL : Tag.AMBIANCE_EQUIPE, i % 3 === 0 ? Tag.EQUILIBRE_PERSO : Tag.CONDITIONS_TRAVAIL];
        await tx.participation.create({ data: { userId: users[(i + 1) % 8].id, day: new Date(date) } });
        await tx.moodEntry.create({ data: { teamId: team.id, day: new Date(date), score, tags } });
      }
      workIndex++;
    }
  }, { timeout: 30_000 });
  console.log('Démo créée. maena@gmail.com peut saisir son humeur aujourd’hui.');
}
seed().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
