// Проверка первого этапа ЛР10 в настоящем браузере с учебными ответами API.
// Ни Render, ни Neon не используются; картинки также подменяются локальной SVG-обложкой.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { chromium } = createRequire(path.resolve('react-app/package.json'))('@playwright/test');

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined), headless: true });
  const baseUrl = process.env.BOOKNEST_UI_URL || 'http://127.0.0.1:4173';
  const folder = '.tools/card-polish-qa';
  fs.mkdirSync(folder, { recursive: true });
  const errors = [];
  const books = [
    { id: 1, title: 'Маленький принц', author: 'Антуан де Сент-Экзюпери', cover_id: 101, available: 3 },
    { id: 2, title: 'Очень длинное название книги для проверки переноса текста на узком экране', author: 'Длинное имя автора для проверки карточки', cover_id: 102, available: 0 },
    { id: 3, title: 'Альбом иллюстраций', author: 'Автор альбома', cover_id: 103, available: 1 },
    { id: 4, title: 'Без обложки', author: 'Автор', cover_id: null, available: 2 },
  ].map(book => ({ ...book, author_id: 1, year: 2000, total_copies: 3, description: 'Учебная проверка интерфейса', genre: 'fiction', isbn: null, publisher: 'Учебное издательство', language: 'ru', edition_year: 2000, pages: 120 }));
  let saved = false;
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  // Одна функция применяется и к мыши, и к сенсорному контексту.
  async function fixtures(target) {
    target.on('pageerror', error => errors.push(error.message));
    await target.route('https://covers.openlibrary.org/**', route => {
      if (route.request().url().includes('/102-')) return route.abort();
      const wide = route.request().url().includes('/103-');
      return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${wide ? 900 : 280}" height="400"><rect width="100%" height="100%" fill="#526451"/><text x="50%" y="47%" text-anchor="middle" fill="#fff6e5" font-size="27">BOOKNEST</text><text x="50%" y="58%" text-anchor="middle" fill="#fff6e5" font-size="16">Учебная обложка</text></svg>` });
    });
    await target.route('**/api/v1/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
      if (pathname.endsWith('/auth/refresh')) return reply({ access_token: 'ui-fixture-only', token_type: 'bearer' });
      if (pathname.endsWith('/auth/me')) return reply({ id: 1, email: 'fixture@example.com', role: 'member' });
      if (pathname.endsWith('/wishlist')) return reply({ items: [], total: 0, page: 1, size: 100 });
      if (/\/wishlist\/\d+$/.test(pathname)) {
        saved = route.request().method() === 'POST';
        await new Promise(resolve => setTimeout(resolve, 250));
        return route.fulfill({ status: 204 });
      }
      if (pathname.endsWith('/discover/books')) return reply({ items: [{ id: 'OL1W', title: 'Внешняя книга', authors: ['Автор Open Library'], year: 1999, cover_id: null }], total: 1, page: 1, size: 20, has_more: false });
      if (pathname.endsWith('/books/1')) return reply(books[0]);
      if (pathname.endsWith('/books')) return reply({ items: books, total: books.length, page: 1, size: 20 });
      return reply({ message: 'Нет учебного маршрута' }, 404);
    });
  }
  try {
    const page = await context.newPage();
    await fixtures(page);
    await page.goto(baseUrl + '/books');
    const card = page.getByRole('article', { name: 'Маленький принц', exact: true });
    await card.waitFor();
    await page.getByRole('img', { name: /Декоративный переплет книги «Очень длинное/ }).waitFor();
    await card.locator('img').evaluate(image => image.decode());
    await page.screenshot({ path: `${folder}/desktop.png`, fullPage: true });
    await card.hover();
    await page.waitForFunction(() => {
      const first = document.querySelector('.book-card');
      return new DOMMatrixReadOnly(getComputedStyle(first).transform).m42 < -4;
    });
    assert.notEqual(await card.locator('img').evaluate(image => getComputedStyle(image).transform), 'none');
    await page.screenshot({ path: `${folder}/hover.png`, fullPage: true });
    await card.getByRole('button', { name: 'Подробнее', exact: true }).focus();
    await page.keyboard.press('Tab');
    assert.equal(await card.evaluate(element => element.matches(':focus-within')), true);
    await page.screenshot({ path: `${folder}/focus.png`, fullPage: true });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await card.evaluate(element => getComputedStyle(element).transform), 'none');
    assert.equal(await card.locator('img').evaluate(element => getComputedStyle(element).transform), 'none');
    assert.equal(await card.evaluate(element => getComputedStyle(element).animationName), 'none');
    const widths = [320, 375, 768, 1280];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Переполнение на ${width}px`);
      assert.equal(await page.locator('.book-card img').evaluateAll(images => images.some(image => image.getBoundingClientRect().right > image.parentElement.getBoundingClientRect().right + 1)), false);
    }
    await page.getByRole('button', { name: 'Тёмная тема' }).click();
    await page.screenshot({ path: `${folder}/dark.png`, fullPage: true });
    await card.getByRole('button', { name: 'Подробнее', exact: true }).click();
    await page.getByRole('heading', { name: 'Маленький принц', exact: true }).waitFor();
    assert.match(page.url(), /\/books\/1$/);
    await page.goto(baseUrl + '/discover?title=test&page=1');
    const external = page.getByRole('article', { name: 'Внешняя книга', exact: true });
    await external.waitFor();
    assert.equal(await external.getByText(/Доступно:|Все экземпляры выданы/).count(), 0);
    assert.equal(await external.getByRole('button', { name: 'В желаемое', exact: true }).count(), 0);
    const touch = await browser.newContext({ viewport: { width: 375, height: 900 }, hasTouch: true, isMobile: true });
    const mobile = await touch.newPage();
    await fixtures(mobile);
    await mobile.goto(baseUrl + '/books');
    const wish = mobile.getByRole('article', { name: 'Маленький принц', exact: true }).getByRole('button', { name: 'В желаемое', exact: true });
    await wish.tap();
    const remove = mobile.getByRole('button', { name: 'Удалить из желаемого', exact: true });
    await remove.waitFor();
    await mobile.waitForFunction(() => !document.querySelector('.book-card [aria-pressed="true"]').disabled);
    assert.equal(saved, true);
    assert.equal(await remove.getAttribute('aria-pressed'), 'true');
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await mobile.screenshot({ path: `${folder}/mobile.png`, fullPage: true });
    await touch.close();
    assert.deepEqual(errors, []);
    const results = { source: 'Локальная production-сборка; API и обложки фикстурные; БД не используется', widths, overflow: false, hover: true, keyboardFocus: true, reducedMotion: true, brokenCoverFallback: true, wideCover: true, detailsNavigation: true, externalHasNoLocalAvailability: true, touchWishlist: true, pageErrors: errors };
    fs.writeFileSync(`${folder}/results.json`, JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
