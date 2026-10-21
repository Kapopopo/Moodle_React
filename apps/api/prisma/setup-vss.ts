import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import { z } from 'zod';
const db = new PrismaClient();
async function setup() {
  const email = z.string().trim().toLowerCase().email().parse(process.env.MOODLY_ADMIN_EMAIL);
  const password = z.string().min(12).max(128).parse(process.env.MOODLY_ADMIN_PASSWORD);
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== Role.ADMIN) throw new Error('Cette adresse appartient déjà à un autre compte. Aucun droit modifié.');
    console.log('Le compte administrateur Moodly existe déjà.'); return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await db.$transaction(async tx => {
    const team = await tx.team.create({ data: { name: 'Administration Moodly' } });
    await tx.user.create({ data: { email, firstName: 'Administration Moodly', passwordHash, role: Role.ADMIN, teamId: team.id } });
  });
  console.log('Compte administrateur Moodly créé.');
}
setup().catch(e => { console.error(e instanceof z.ZodError ? 'Configurer MOODLY_ADMIN_EMAIL et MOODLY_ADMIN_PASSWORD (12 caractères minimum).' : e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
