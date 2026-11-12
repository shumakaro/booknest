// ЛР10: сценарий входа/регистрации/refresh/выхода на локальном учебном API без реальных аккаунтов.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { chromium } = createRequire(path.resolve('react-app/package.json'))('@playwright/test');
(async () => {
  const base = process.env.BOOKNEST_UI_URL || 'http://127.0.0.1:4173';
  const folder = '.tools/auth-usability-qa'; fs.mkdirSync(folder, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined), headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  let logged = false, expected = '', registrations = 0, logins = 0, logouts = 0, refreshes = 0, expireRefresh = false;
  const user = { id: 1, email: 'reader@example.test', role: 'member', is_active: true, email_verified: false };
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname.endsWith('/auth/refresh')) {
      refreshes++;
      if (!logged || expireRefresh) { logged = false; return reply({ message: 'Сеанс завершен' }, 401); }
      expected = `fixture-refresh-${refreshes}`; return reply({ access_token: expected, token_type: 'bearer' });
    }
    if (url.pathname.endsWith('/auth/register')) {
      registrations++; await new Promise(resolve => setTimeout(resolve, 400));
      return registrations === 1 ? reply({ message: 'Этот e-mail уже зарегистрирован' }, 409) : reply(user, 201);
    }
    if (url.pathname.endsWith('/auth/token')) {
      logins++; await new Promise(resolve => setTimeout(resolve, 400));
      if (logins === 1) return reply({ message: 'Неверный e-mail или пароль' }, 401);
      logged = true; expected = `fixture-login-${logins}`; return reply({ access_token: expected, token_type: 'bearer' });
    }
    if (url.pathname.endsWith('/auth/me')) return logged ? reply(user) : reply({}, 401);
    if (url.pathname.endsWith('/auth/logout')) {
      logouts++; await new Promise(resolve => setTimeout(resolve, 400));
      if (logouts === 1) return reply({ message: 'Учебная ошибка соединения' }, 503);
      logged = false; return route.fulfill({ status: 204 });
    }
    if (url.pathname.endsWith('/wishlist')) {
      if (!logged || route.request().headers().authorization !== `Bearer ${expected}`) return reply({}, 401);
      return reply({ items: [], total: 0, page: 1, size: 100 });
    }
    if (url.pathname.endsWith('/books')) return reply({ items: [], total: 0, page: 1, size: 30 });
    return reply({ message: 'Учебный маршрут не найден' }, 404);
  });
  const shot = name => page.screenshot({ path: `${folder}/${name}.png`, animations: 'disabled' });
  const fill = async password => { await page.getByLabel('E-mail', { exact: true }).fill(user.email); await page.getByLabel('Пароль', { exact: true }).fill(password); };
  try {
    await page.goto(base + '/wishlist?q=толкин#saved'); await page.waitForURL('**/login');
    await page.getByRole('link', { name: 'Создать учётную запись', exact: true }).click();
    await fill('я'.repeat(36) + '1'); await page.getByRole('button', { name: 'Зарегистрироваться', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: '72 байт' }).waitFor(); assert.equal(registrations, 0);
    assert.equal(await page.getByLabel('Пароль', { exact: true }).evaluate(input => input === document.activeElement), true);
    await page.getByLabel('Пароль', { exact: true }).fill('Fixture-pass-123');
    await page.getByRole('button', { name: 'Показать пароль', exact: true }).click();
    assert.equal(await page.getByLabel('Пароль', { exact: true }).getAttribute('type'), 'text');
    await page.getByRole('button', { name: 'Скрыть пароль', exact: true }).click();
    await page.getByRole('button', { name: 'Зарегистрироваться', exact: true }).dblclick();
    assert.equal(await page.getByLabel('E-mail', { exact: true }).isDisabled(), true);
    await page.getByRole('alert').filter({ hasText: 'уже зарегистрирован' }).waitFor(); assert.equal(registrations, 1);
    await page.getByRole('button', { name: 'Зарегистрироваться', exact: true }).click();
    await page.getByText('Регистрация завершена. Теперь можно войти.', { exact: true }).waitFor();
    assert.equal(registrations, 2); assert.equal(await page.getByLabel('Пароль', { exact: true }).inputValue(), '');
    await shot('registered'); await page.getByRole('link', { name: 'Перейти ко входу', exact: true }).click();
    assert.equal(await page.getByLabel('E-mail', { exact: true }).inputValue(), user.email);
    await page.getByLabel('Пароль', { exact: true }).fill('Fixture-pass-123');
    await page.locator('.auth-page').getByRole('button', { name: 'Войти', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Неверный e-mail или пароль' }).waitFor();
    assert.equal(await page.getByLabel('E-mail', { exact: true }).inputValue(), user.email); await shot('login-error');
    await page.locator('.auth-page').getByRole('button', { name: 'Войти', exact: true }).dblclick();
    await page.waitForURL('**/wishlist?q=**'); await page.getByText('Список желаемого пуст', { exact: true }).waitFor();
    assert.equal(logins, 2); assert.equal(new URL(page.url()).hash, '#saved'); assert.equal(new URL(page.url()).searchParams.get('q'), 'толкин');
    await page.getByText(`${user.email} · Читатель`, { exact: true }).waitFor();
    await page.getByRole('link', { name: 'Моя библиотека', exact: true }).click();
    const before = refreshes; expected = 'expired-fixture';
    await page.getByRole('link', { name: 'Желаемое', exact: true }).click();
    await page.getByText('Список желаемого пуст', { exact: true }).waitFor(); assert.equal(refreshes, before + 1);
    await page.getByRole('button', { name: 'Выйти', exact: true }).dblclick();
    await page.getByRole('alert').filter({ hasText: 'Выход не подтвержден сервером' }).waitFor(); assert.equal(logouts, 1);
    await page.getByRole('button', { name: 'Выйти', exact: true }).click(); await page.waitForURL('**/login');
    assert.equal(logouts, 2); assert.equal(await page.locator('.session-account').count(), 0);
    await fill('Fixture-pass-123'); await page.locator('.auth-page').getByRole('button', { name: 'Войти', exact: true }).click();
    await page.waitForURL('**/wishlist'); await page.getByText('Список желаемого пуст', { exact: true }).waitFor();
    await page.getByRole('link', { name: 'Моя библиотека', exact: true }).click();
    expected = 'expired-fixture'; expireRefresh = true;
    await page.getByRole('link', { name: 'Желаемое', exact: true }).click(); await page.waitForURL('**/login?**reason=session-expired');
    await page.getByText('Сеанс завершен. Войдите снова, чтобы продолжить.', { exact: true }).waitFor();
    for (const width of [320,375,768,1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Переполнение ${width}`);
      // Анимация появления может временно масштабировать всю страницу; измеряется конечная геометрия.
      await page.waitForFunction(() => [...document.querySelectorAll('.auth-page input, .auth-page button')].every(item => item.getBoundingClientRect().height >= 44));
      const controls = await page.locator('.auth-page input, .auth-page button').evaluateAll(items => items.map(item => ({ tag: item.tagName, height: item.getBoundingClientRect().height, min: getComputedStyle(item).minHeight })));
      assert(controls.every(item => item.height >= 44), JSON.stringify({ width, controls }));
      if (width === 375) { assert((await page.getByLabel('Пароль', { exact: true }).boundingBox()).width >= 180); await shot('mobile'); }
    }
    await shot('desktop'); await page.getByRole('button', { name: 'Тёмная тема', exact: true }).click(); await shot('dark');
    assert.deepEqual(errors, []);
    const storage = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
    assert.equal([...storage.local,...storage.session].some(key => /token|password|auth/i.test(key)), false);
    const result = { source: 'Local production build; fixture auth/API; no real accounts or production data', registrationByteLimitBeforeRequest: true, passwordVisibility: true, duplicateRegisterAndLoginBlocked: true, errorsKeepInput: true, registrationClearsPassword: true, registrationKeepsDestinationAndEmail: true, returnQueryAndHash: true, accountAndRoleVisible: true, accessExpiryRefresh: true, failedLogoutVisibleAndRetryable: true, confirmedLogoutClearsAccount: true, expiredSessionMessageAndReturn: true, noCredentialStorageKeys: true, widths: [320,375,768,1280], overflow: false, darkTheme: true, pageErrors: errors };
    fs.writeFileSync(`${folder}/results.json`, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
