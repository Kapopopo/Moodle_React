import { test, expect } from '@playwright/test';
import { vssQuestions, VSS_VERSION } from '../apps/api/src/vss-questionnaire';

test('employee proposes an idea and manager publishes a response', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('CapacitorStorage.moodly.token', 'test'));
  let role = 'EMPLOYEE';
  const ideas: any[] = [];
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { id: 'test', role, firstName: 'Alex', team: { id: 'team', name: 'Équipe test' } } });
    if (path === '/api/ideas' && route.request().method() === 'GET') return route.fulfill({ json: { ideas, nextCursor: null } });
    if (path === '/api/ideas' && route.request().method() === 'POST') { const idea = { ...route.request().postDataJSON(), id: 'idea', status: 'NEW', managerNote: '' }; ideas.push(idea); return route.fulfill({ status: 201, json: idea }); }
    if (path === '/api/ideas/idea') { Object.assign(ideas[0], route.request().postDataJSON()); return route.fulfill({ json: { updated: true } }); }
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto('/idees');
  await page.getByLabel('Un titre pour ton idée').fill('Une pause jeux');
  await page.getByLabel('Comment tu l’imagines ?').fill('Organiser un moment convivial avec des jeux.');
  await page.getByRole('button', { name: 'Partager mon idée' }).click();
  await expect(page.getByText('Ton idée est partagée avec l’équipe.')).toBeVisible();
  role = 'MANAGER'; await page.reload();
  await expect(page.getByRole('button', { name: 'Partager mon idée' })).toHaveCount(0);
  await page.getByText('Donner une suite à cette idée').click();
  await page.getByLabel('Statut', { exact: true }).selectOption('PLANNED');
  await page.getByLabel('Réponse visible par l’équipe (facultatif)').fill('Prévu vendredi.');
  await page.getByRole('button', { name: 'Enregistrer le suivi' }).click();
  await expect(page.getByText('Suivi enregistré.')).toBeVisible();
  role = 'EMPLOYEE'; await page.reload();
  await expect(page.getByText('Prévu vendredi.')).toBeVisible();
});

test('VSS requires explicit consent, submits once and discards abandoned answers', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('CapacitorStorage.moodly.token', 'test'));
  let sent = 0;
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { id: 'test', role: 'EMPLOYEE', firstName: 'Alex', team: { id: 'team', name: 'Équipe test' } } });
    if (path === '/api/vss/questionnaire') return route.fulfill({ json: { questions: vssQuestions, version: VSS_VERSION, ready: true, recipientLabel: 'l’administration Moodly' } });
    if (path === '/api/vss/reports') { expect(route.request().postDataJSON().consent).toBe(true); sent++; return route.fulfill({ status: 201, json: { reference: 'test-reference' } }); }
    return route.fulfill({ json: { hasSubmitted: false } });
  });
  await page.goto('/aide/signalement');
  await page.getByLabel('Que je vis ou que j’ai vécue', { exact: true }).check();
  await page.getByLabel('Propos ou comportements sexistes', { exact: true }).check();
  await page.getByLabel('Non', { exact: true }).check();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByLabel('Que souhaites-tu nous partager ?', { exact: true }).fill('Récit fictif pour vérifier le parcours.');
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByLabel('Être écouté et orienté', { exact: true }).check();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Transmettre mon signalement' })).toBeDisabled();
  expect(sent).toBe(0);
  await page.getByLabel('J’ai relu mes réponses et je souhaite les transmettre au destinataire indiqué.').check();
  await page.getByRole('button', { name: 'Transmettre mon signalement' }).click();
  await expect(page.getByRole('heading', { name: 'Ton signalement est enregistré.' })).toBeVisible();
  expect(sent).toBe(1);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ta situation', exact: true })).toBeVisible();
  await expect(page.getByLabel('Que je vis ou que j’ai vécue', { exact: true })).not.toBeChecked();
});

test('administrator reads a VSS dossier and changes its status', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('CapacitorStorage.moodly.token', 'admin-test'));
  const team = { id: 'team', name: 'Équipe test' };
  const report = { id: 'report-test', status: 'RECEIVED', createdAt: '2026-10-23T10:00:00Z', questionnaireVersion: 1, team };
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { id: 'admin', role: 'ADMIN', firstName: 'Admin', team } });
    if (path === '/api/vss/companies') return route.fulfill({ json: { companies: [team] } });
    if (path === '/api/vss/inbox') return route.fulfill({ json: { reports: [report], nextCursor: null } });
    if (path === '/api/vss/inbox/report-test' && route.request().method() === 'PATCH') { report.status = route.request().postDataJSON().status; return route.fulfill({ json: { updated: true } }); }
    if (path === '/api/vss/inbox/report-test') return route.fulfill({ json: { ...report, payload: { questions: vssQuestions, answers: { description: 'Dossier fictif du test.' }, contactMode: 'ANONYMOUS', contact: '' } } });
    return route.fulfill({ status: 403, json: { error: { message: 'Accès refusé' } } });
  });
  await page.goto('/signalements');
  await page.getByRole('button', { name: /Consulter le dossier/ }).click();
  await expect(page.getByText('Dossier fictif du test.', { exact: true })).toBeVisible();
  await page.getByLabel('Statut du dossier', { exact: true }).selectOption('REVIEWING');
  await page.getByRole('button', { name: 'Enregistrer le statut' }).click();
  await expect(page.getByText('Statut enregistré.')).toBeVisible();
  expect(report.status).toBe('REVIEWING');
  await page.goto('/idees');
  await expect(page).toHaveURL(/\/signalements$/);
});
