import { app, prisma } from './app.js';
const server = app.listen(Number(process.env.PORT || 3001), '0.0.0.0', () => console.log('Moodly API ready on port', process.env.PORT || 3001));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.close(() => { void prisma.$disconnect().then(() => process.exit(0)); }); });
