// ЛР10: проверка loading/success/error в production-сборке на учебных ответах.
// Рабочие API, Neon и Render не используются, результаты не являются production-тестом.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { chromium } = createRequire(path.resolve('react-app/package.json'))('@playwright/test');

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined), headless: true });
  const base = process.env.BOOKNEST_UI_URL || 'http://127.0.0.1:4173';
  const folder = '.tools/loading-transitions-qa';
  fs.mkdirSync(folder, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  const requests = [];
  let secondAttempts = 0;
  const book = number => ({ id: `OL${number}W`, title: `Учебная книга ${number}`, authors: ['Автор'], year: 2000, cover_id: null });
  page.on('pageerror', error => errors.push(error.message));
  // Считаются настоящие события CSS, а не только наличие имени анимации в стилях.
  await page.addInitScript(() => {
    window.resultAnimations = {};
    document.addEventListener('animationstart', event => {
      if (event.animationName !== 'result-enter' || !event.target.classList.contains('book-results__item')) return;
      const title = event.target.querySelector('h3')?.textContent;
      window.resultAnimations[title] = (window.resultAnimations[title] || 0) + 1;
    });
  });
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (url.pathname.endsWith('/auth/refresh')) return reply({ message: 'Учебный гостевой сеанс' }, 401);
    if (url.pathname.endsWith('/discover/books')) {
      const number = Number(url.searchParams.get('page'));
      requests.push(number);
      await new Promise(resolve => setTimeout(resolve, 650));
      if (number === 2 && ++secondAttempts === 1) return reply({ message: 'Учебный сбой следующей страницы', code: 'external_unavailable' }, 503);
      return reply({ items: number === 1 ? Array.from({ length: 20 }, (_, index) => book(index + 1)) : [book(20), book(21), book(22), book(23)], total: 23, page: number, size: 20, has_more: number === 1 });
    }
    if (url.pathname.endsWith('/discover/books/OL21W')) return reply({ ...book(21), description: 'Учебные подробности', notice: null });
    return reply({ message: 'Учебный маршрут отсутствует' }, 404);
  });
  try {
    await page.goto(base + '/discover?title=fixture&page=1');
    await page.getByRole('status', { name: 'Загружаем каталог', exact: true }).waitFor();
    await page.screenshot({ path: `${folder}/initial-loading.png`, fullPage: true });
    const first = page.getByRole('article', { name: 'Учебная книга 1', exact: true });
    await first.waitFor();
    // Метка позволяет доказать, что первый DOM-узел не заменялся при подгрузке.
    await first.evaluate(element => { element.dataset.retained = 'yes'; });
    await page.waitForFunction(() => window.resultAnimations['Учебная книга 1'] === 1);
    await page.getByRole('button', { name: 'Показать ещё', exact: true }).click();
    await page.getByRole('status', { name: 'Загружаем следующую страницу', exact: true }).waitFor();
    assert.equal(await first.getAttribute('data-retained'), 'yes');
    assert.equal(await page.getByRole('button', { name: 'Загружаем…', exact: true }).isDisabled(), true);
    await page.screenshot({ path: `${folder}/append-loading.png` });
    await page.getByRole('alert').filter({ hasText: 'Учебный сбой следующей страницы' }).waitFor();
    assert.equal(await first.getAttribute('data-retained'), 'yes');
    await page.screenshot({ path: `${folder}/append-error.png` });
    await page.getByRole('button', { name: 'Повторить', exact: true }).click();
    await page.getByRole('article', { name: 'Учебная книга 23', exact: true }).waitFor();
    assert.equal(await first.getAttribute('data-retained'), 'yes');
    assert.equal(await page.getByRole('article').count(), 23);
    assert.deepEqual(requests, [1, 2, 2]);
    assert.equal(await page.evaluate(() => window.resultAnimations['Учебная книга 1']), 1);
    // Даем последним карточкам дойти до своей короткой задержки появления.
    await page.waitForFunction(() => window.resultAnimations['Учебная книга 23'] === 1);
    const motion = await page.evaluate(() => window.resultAnimations);
    await page.screenshot({ path: `${folder}/loaded.png` });
    const detailButton = page.getByRole('article', { name: 'Учебная книга 21', exact: true }).getByRole('button', { name: 'Подробнее', exact: true });
    await detailButton.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    await detailButton.click();
    await page.getByText('Учебные подробности', { exact: true }).waitFor();
    await page.getByRole('link', { name: 'Вернуться к глобальному поиску', exact: true }).click();
    await page.getByRole('article', { name: 'Учебная книга 23', exact: true }).waitFor();
    await page.waitForFunction(top => Math.abs(scrollY - top) <= 2, before);
    assert.deepEqual(requests, [1, 2, 2]);
    assert.deepEqual(await page.evaluate(() => window.resultAnimations), motion);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await page.getByRole('article', { name: 'Учебная книга 23', exact: true }).waitFor();
    assert.equal(await page.locator('.book-results__item').first().evaluate(element => getComputedStyle(element).animationName), 'none');
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Переполнение ${width}px`);
      if (width === 375) await page.screenshot({ path: `${folder}/mobile.png` });
    }
    assert.deepEqual(errors, []);
    const result = { source: 'Локальная production-сборка; API фикстурные; рабочая БД не используется', initialSkeleton: true, appendSkeleton: true, pendingButtonDisabled: true, existingDomRetained: true, failedPageRetried: true, requestsBeforeReload: [1, 2, 2], uniqueBooks: 23, oldCardAnimationStarts: 1, newCardsAnimated: true, cachedReturnWithoutAnimationOrRequest: true, scrollRestored: true, reducedMotion: true, widths: [320, 375, 768, 1280], horizontalOverflow: false, pageErrors: errors };
    fs.writeFileSync(`${folder}/results.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
