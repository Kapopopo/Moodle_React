import { test, expect } from '@playwright/test';

async function session(page: import('@playwright/test').Page, role = 'EMPLOYEE') {
  await page.addInitScript(() => localStorage.setItem('CapacitorStorage.moodly.token', 'v1-session'));
  let submitted = false;
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { id: 'v1', firstName: 'Alex', role, team: { id: 'team', name: 'Produit' } } });
    if (path === '/api/moods/today') return route.fulfill({ json: { hasSubmitted: submitted } });
    if (path === '/api/moods' && route.request().method() === 'POST') { submitted = true; return route.fulfill({ status: 201, json: { submitted: true } }); }
    if (path === '/api/teams/me/summary') return route.fulfill({ json: { period: { from: '2026-10-01', to: '2026-10-30' }, participationRate: 0, totalResponses: 0, minimumResponses: 3, topTags: [], days: [] } });
    return route.fulfill({ status: 404, json: { error: { message: 'Route absente de la V1' } } });
  });
}

test('employee submits once, sees generic confirmation after reload and can log out', async ({ page }) => {
  await session(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/accueil');
  await expect(page.locator('.mobile-navigation a')).toHaveCount(3);
  await page.getByRole('link', { name: 'Partager mon humeur' }).click();
  await page.getByRole('button', { name: 'Valider mon humeur' }).click();
  await expect(page.getByRole('alert')).toHaveText('Choisis d’abord ton humeur');
  await page.getByRole('button', { name: 'Bien', exact: true }).click();
  await page.getByRole('button', { name: 'Valider mon humeur' }).click();
  await expect(page.getByRole('heading', { name: 'Merci, c’est noté.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tu as pris un moment pour toi.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Valider mon humeur' })).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys(localStorage).some(key => key.includes('journal')))).toBe(false);
  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('removed spaces are inaccessible and manager cannot submit moods', async ({ page }) => {
  await session(page, 'MANAGER');
  for (const path of ['/carnet', '/pauses', '/idees', '/aide', '/aide/signalement', '/signalements', '/admin/tableau-de-bord', '/plus']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/accueil$/);
  }
  await page.goto('/humeur');
  await expect(page).toHaveURL(/\/equipe$/);
  await expect(page.getByRole('heading', { name: 'Humeur sur 30 jours' })).toBeVisible();
  await expect(page.getByText('Pas encore assez de réponses pour afficher une tendance.')).toBeVisible();
});
