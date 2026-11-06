// Проверка настоящего истечения 30-секундного access без перезагрузки страницы.
const fs = require('node:fs');
const { chromium } = require('C:/Users/comp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const account = JSON.parse(fs.readFileSync('.tools/demo-accounts.json','utf8')).librarian;
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:5173/login');
    await page.getByLabel('E-mail',{exact:true}).fill(account.email);
    await page.getByLabel('Пароль',{exact:true}).fill(account.password);
    const tokenResponse = page.waitForResponse(response => response.url().endsWith('/auth/token'));
    await page.getByRole('button',{name:'Войти',exact:true}).click();
    const issued = await (await tokenResponse).json();
    if (issued.expires_in !== 30) throw new Error('Не включён 30-секундный режим');
    await page.waitForURL('**/books');
    await page.getByLabel('Поиск по названию').fill('Книга 01');
    const card = page.getByRole('article').filter({has:page.getByRole('heading',{name:'Книга 01',exact:true})});
    await card.waitFor();
    const initiallySaved = await card.getByRole('button',{name:'Удалить из желаемого',exact:true}).isVisible();
    const responses=[];
    page.on('response',response=>{ if (response.url().includes('/wishlist/') || response.url().endsWith('/auth/refresh')) responses.push([new URL(response.url()).pathname,response.status()]); });
    await page.waitForTimeout(31000);
    await card.getByRole('button',{name:initiallySaved?'Удалить из желаемого':'В желаемое',exact:true}).click();
    await card.getByRole('button',{name:initiallySaved?'В желаемое':'Удалить из желаемого',exact:true}).waitFor();
    await page.waitForFunction(() => true);
    const deadline=Date.now()+5000;
    while (responses.filter(item=>item[1]===204).length===0 && Date.now()<deadline) await page.waitForTimeout(100);
    const refreshes=responses.filter(([path,status])=>path.endsWith('/auth/refresh') && status===200);
    if (refreshes.length!==1 || !responses.some(([,status])=>status===401) || !responses.some(([,status])=>status===204)) throw new Error(JSON.stringify(responses));
    // Возвращаем только собственное изменение списка в исходное состояние.
    await card.getByRole('button',{name:initiallySaved?'В желаемое':'Удалить из желаемого',exact:true}).click();
    await card.getByRole('button',{name:initiallySaved?'Удалить из желаемого':'В желаемое',exact:true}).waitFor();
    fs.writeFileSync('docs/lab10/refresh-browser.json',JSON.stringify({access_ttl_seconds:30,waited_seconds:31,responses,passed:true},null,2));
    console.log('Expired access: 401 -> one refresh 200 -> retried mutation 204; previous wishlist state restored');
  } finally { await browser.close(); }
})();
