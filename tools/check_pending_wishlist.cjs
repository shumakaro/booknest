// Запись действительно выполняется API; задерживается только доставка ее ответа в браузер.
const {createRequire}=require('node:module');const path=require('node:path');const fs=require('node:fs');
const {chromium}=createRequire(path.resolve('react-app/package.json'))('@playwright/test');
(async()=>{
 const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
 let release; const gate=new Promise(resolve=>{release=resolve;});
 try {
  const page=await browser.newPage();const account=JSON.parse(fs.readFileSync('.tools/demo-accounts.json','utf8')).librarian;
  await page.goto('http://127.0.0.1:5173/login');await page.getByLabel('E-mail',{exact:true}).fill(account.email);await page.getByLabel('Пароль',{exact:true}).fill(account.password);
  await page.getByRole('button',{name:'Войти',exact:true}).click();await page.waitForURL('**/books');await page.locator('.book-card').first().waitFor();
  const card=page.locator('.book-card').first();const button=card.getByRole('button').last();
  const previous=await button.getAttribute('aria-pressed');let requests=0;let ready;
  const sent=new Promise(resolve=>{ready=resolve;});
  await page.route('**/api/v1/wishlist/*',async route=>{requests++;const response=await route.fetch();ready();await gate;await route.fulfill({response});});
  await button.click();await sent;
  if(!await button.isDisabled())throw Error('Wishlist button is not disabled during mutation');
  const box=await button.boundingBox();await page.mouse.dblclick(box.x+box.width/2,box.y+box.height/2);
  if(requests!==1)throw Error('Duplicate mutation requests: '+requests);
  release();await page.getByRole('complementary',{name:'Уведомления'}).getByRole('status').filter({hasText:'Книга'}).waitFor();
  await page.unroute('**/api/v1/wishlist/*');
  const restored=page.waitForResponse(r=>r.status()===204 && new URL(r.url()).pathname.includes('/wishlist/'));
  await button.click();await restored;
  if(await button.getAttribute('aria-pressed')!==previous)throw Error('Previous wishlist state not restored');
  fs.writeFileSync('docs/stage3/pending-wishlist.json',JSON.stringify({api:'real',duplicateRequests:0,requestsWhilePending:requests,buttonDisabled:true,previousWishlistStateRestored:true},null,2));
  console.log('Pending wishlist: one request, repeated clicks blocked, previous state restored');
 } finally {release();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
