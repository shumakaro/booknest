// ЛР10/12: клавиатура, конечная геометрия и уведомления на локальной сборке с фикстурами.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { chromium } = createRequire(path.resolve('react-app/package.json'))('@playwright/test');
function contrast(a, b) {
  const lum = hex => { const c = hex.trim().replace('#',''); const channels = [0,2,4].map(i => parseInt(c.slice(i,i+2),16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4); return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722; };
  const x = lum(a), y = lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined), headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const base = process.env.BOOKNEST_UI_URL || 'http://127.0.0.1:4173';
  const folder = '.tools/accessibility-qa'; fs.mkdirSync(folder, { recursive: true });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const book = { id: 7, title: 'Длинное название '.repeat(12), author: 'Учебный автор', author_id: 1, year: 2000, edition_year: 2000, total_copies: 1, available: 1, genre: 'fiction', description: '', isbn: null, language: 'Русский', pages: 100, publisher: null, cover_id: null, external_work_id: null };
  await page.route('**/api/v1/**', route => {
    const url = new URL(route.request().url()); const reply = value => route.fulfill({ contentType: 'application/json', body: JSON.stringify(value) });
    if (url.pathname.endsWith('/auth/refresh')) return reply({ access_token: 'fixture-only', token_type: 'bearer' });
    if (url.pathname.endsWith('/auth/me')) return reply({ id: 1, email: 'reader-ui@example.test', role: 'member' });
    if (url.pathname.endsWith('/books/7')) return reply(book);
    if (url.pathname.endsWith('/books') || url.pathname.endsWith('/wishlist')) return reply({ items: [book], total: 1, page: 1, size: 30 });
    return reply({ items: [], total: 0, page: 1, size: 20 });
  });
  const show = message => page.evaluate(text => dispatchEvent(new CustomEvent('booknest:notice', { detail: text })), message);
  const shot = name => page.screenshot({ path: `${folder}/${name}.png`, animations: 'disabled' });
  try {
    await page.goto(base + '/books'); await page.getByRole('article').first().waitFor();
    await page.getByRole('link', { name: 'Желаемое', exact: true }).click(); await page.getByRole('searchbox', { name: 'Поиск в желаемом', exact: true }).waitFor();
    assert.equal(await page.title(), 'Желаемое — BookNest'); assert.equal(await page.evaluate(() => document.activeElement.id), 'main-content');
    const search = page.getByRole('searchbox', { name: 'Поиск в желаемом', exact: true }); await search.fill('Длинное');
    assert.equal(await search.evaluate(input => document.activeElement === input), true);
    await show('Книга сохранена'); const close = page.getByRole('button', { name: 'Закрыть уведомление', exact: true }); await close.focus();
    const original = await close.elementHandle(); await page.mouse.move(0, 0); await page.waitForTimeout(6500);
    await close.waitFor(); await show('Книга возвращена'); assert.equal(await original.evaluate(button => button === document.activeElement), true);
    await page.keyboard.press('Enter'); assert.equal(await search.evaluate(input => input === document.activeElement), true);
    await show('Уведомление для чтения'); await page.locator('.notice').hover(); await page.waitForTimeout(6500); await page.getByText('Уведомление для чтения', { exact: true }).waitFor();
    await page.mouse.move(0, 0); await close.click();
    const ratios = {};
    for (const theme of ['light','dark']) {
      if (theme === 'dark') await page.getByRole('button', { name: 'Тёмная тема', exact: true }).click();
      const colors = await page.locator('.app').evaluate(app => { const css = getComputedStyle(app); return Object.fromEntries(['text','surface','muted','button-text','primary','danger','danger-soft','badge-text','primary-soft'].map(key => [key,css.getPropertyValue('--'+key).trim()])); });
      ratios[theme] = {};
      for (const [foreground,background] of [['text','surface'],['muted','surface'],['button-text','primary'],['danger','danger-soft'],['badge-text','primary-soft']]) {
        const value = contrast(colors[foreground],colors[background]); assert(value >= 4.5, `${theme} ${foreground}/${background}: ${value}`); ratios[theme][`${foreground}/${background}`] = Number(value.toFixed(2));
      }
      await show('ДлинноеУведомление'.repeat(40)); await page.locator('.notice').hover();
      for (const width of [320,375,768,1280]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${theme} переполнение ${width}`);
        const heights = await page.locator('.main-nav .nav-link').evaluateAll(links => links.map(link => link.getBoundingClientRect().height)); assert(heights.every(height => height >= 44));
        if (width === 375) await shot(`mobile-${theme}`);
      }
      await shot(`desktop-${theme}`); await close.click();
    }
    await page.emulateMedia({ reducedMotion: 'reduce' }); await show('Без лишнего движения');
    assert.equal(await page.locator('.notice').evaluate(item => getComputedStyle(item).animationName), 'none'); await close.click();
    await page.getByRole('link', { name: 'Перейти к содержимому', exact: true }).focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'main-content');
    assert.deepEqual(errors, []);
    const result = { source: 'Local production build; fixture API; no real account or production data', pathTitleAndMainFocus: true, queryKeepsInputFocus: true, notificationFocusPausesTimeout: true, newMessageKeepsCloseButton: true, closeReturnsFocus: true, notificationHoverPausesTimeout: true, longUnbrokenNoticeWraps: true, navLinks44px: true, skipLinkKeyboard: true, reducedMotion: true, contrastPairs: ratios, widths: [320,375,768,1280], overflow: false, pageErrors: errors, manualRemaining: ['Real screen reader speech', 'Native browser zoom 200%', 'Final production screenshots after Neon and Render'] };
    fs.writeFileSync(`${folder}/results.json`, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
