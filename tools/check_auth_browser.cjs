// Проверяется реальная форма входа, а учётные данные читаются из игнорируемого файла.
const fs = require('node:fs');
const { chromium } = require('C:/Users/comp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const accounts = JSON.parse(fs.readFileSync('.tools/demo-accounts.json', 'utf8'));
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto('http://127.0.0.1:5173/login');
  await page.getByLabel('E-mail',{exact:true}).fill(accounts.librarian.email);
  await page.getByLabel('Пароль',{exact:true}).fill(accounts.librarian.password);
  await page.getByRole('button',{name:'Войти',exact:true}).click();
  await page.waitForURL('**/books');
  await page.getByRole('button',{name:'Выйти',exact:true}).waitFor();
  await page.screenshot({path:'docs/lab9/login-success.png',fullPage:true});
  await page.reload();
  await page.getByRole('button',{name:'Выйти',exact:true}).waitFor();
  if (!(await page.getByRole('link',{name:'Добавить книгу',exact:true}).isVisible())) throw new Error('Роль не восстановилась');
  await page.getByRole('button',{name:'Выйти',exact:true}).click();
  await page.getByRole('link',{name:'Войти',exact:true}).waitFor();
  await browser.close();
  console.log('Browser: login, librarian controls, session restore, logout: OK');
})();
