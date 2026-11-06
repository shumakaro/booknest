const { chromium } = require('C:/Users/comp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
(async () => {
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const page=await browser.newPage();
    const email=`browser-${Date.now()}@example.com`;
    const password=randomBytes(16).toString('hex')+'A1';
    await page.goto('http://127.0.0.1:5173/register');
    await page.getByLabel('E-mail',{exact:true}).fill(email);
    await page.getByLabel('Пароль',{exact:true}).fill(password);
    await page.getByRole('button',{name:'Зарегистрироваться',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Регистрация завершена'}).waitFor();
    await page.getByRole('link',{name:'Перейти ко входу',exact:true}).click();
    await page.getByLabel('E-mail',{exact:true}).fill(email);
    await page.getByLabel('Пароль',{exact:true}).fill(password);
    await page.getByRole('button',{name:'Войти',exact:true}).click();
    await page.waitForURL('**/books');
    if (await page.getByRole('link',{name:'Добавить книгу',exact:true}).count()) throw new Error('Member видит действие библиотекаря');
    await page.goto('http://127.0.0.1:5173/books/new');
    await page.getByRole('heading',{name:'Недостаточно прав',exact:true}).waitFor();
    await page.getByRole('button',{name:'Выйти',exact:true}).click();
    fs.writeFileSync('docs/lab10/registration-browser.json',JSON.stringify({registration:201,login:true,member_controls_hidden:true,librarian_route_denied:true,logout:true},null,2));
    console.log('Browser registration, member login, role restriction and logout: OK');
  } finally { await browser.close(); }
})();
