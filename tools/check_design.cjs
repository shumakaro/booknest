// Изолированная проверка интерфейса: ответы API фикстурные, рабочая БД не используется.
const path = require('node:path');
const { createRequire } = require('node:module');
const { chromium } = createRequire(path.resolve('react-app/package.json'))('@playwright/test');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),headless:true});
 const folder='.tools/stage2-qa'; fs.mkdirSync(folder,{recursive:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[]; page.on('pageerror',error=>errors.push(error.message));
 let mode='books'; let saved=false;
 const titles=['Маленький принц','Тихие истории','Сад забытых книг','Письма к другу','Поэзия осени','В поисках света'];
 await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url()); const path=url.pathname;
  const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(path.endsWith('/auth/refresh')) return reply({access_token:'ui-fixture-only'});
  if(path.endsWith('/auth/me'))return reply({id:1,email:'reader@example.com',role:'member'});
  if(path.includes('/wishlist/')) { saved=route.request().method()==='POST'; return route.fulfill({status:204}); }
  if(path.endsWith('/wishlist'))return reply({items:[],total:0,page:1,size:100});
  if(path.endsWith('/books')) {
   await new Promise(resolve=>setTimeout(resolve,450));
   if(mode==='error')return reply({message:'Учебная проверка ошибки загрузки'},500);
   const items=mode==='empty'?[]:titles.map((title,index)=>({id:index+1,title,author:'Автор '+(index+1),author_id:1,year:2000+index,available:index===1?0:3,total_copies:3,genre:'fiction',description:'Описание книги',isbn:null}));
   return reply({items,total:items.length,page:1,size:20});
  }
  return reply({message:'Fixture route not provided'},404);
 });
 try {
  await page.goto('http://127.0.0.1:5173/books');
  await page.getByLabel('Загружаем каталог',{exact:true}).waitFor();
  await page.screenshot({path:folder+'/skeleton.png'});
  await page.getByRole('heading',{name:'Маленький принц',exact:true}).waitFor();
  await page.screenshot({path:folder+'/desktop.png',fullPage:true});
  await page.getByRole('button',{name:'В желаемое',exact:true}).first().click();
  await page.getByRole('status').filter({hasText:'Книга добавлена в желаемое'}).waitFor();
  if(!saved)throw Error('Wishlist action not sent');
  await page.getByRole('button',{name:'Закрыть уведомление'}).click();
  const widths=[];
  for(const width of [320,375,768,1440]) {
   await page.setViewportSize({width,height:900});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   if(overflow)throw Error('Horizontal overflow at '+width);
   widths.push(width);
   if(width===375) await page.screenshot({path:folder+'/mobile.png',fullPage:true});
  }
  await page.getByRole('button',{name:'Тёмная тема'}).click();
  await page.screenshot({path:folder+'/dark.png',fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});
  const duration=await page.locator('.book-card').first().evaluate(el=>getComputedStyle(el).animationName);
  if(duration!=='none')throw Error('Reduced motion ignored');
  mode='empty'; await page.getByRole('button',{name:'Найти',exact:true}).click();
  await page.getByRole('heading',{name:'Книги не найдены'}).waitFor();
  mode='error'; await page.getByRole('button',{name:'Найти',exact:true}).click();
  await page.getByText('Учебная проверка ошибки загрузки',{exact:true}).waitFor();
  if(errors.length)throw Error(errors.join('\n'));
  fs.writeFileSync(folder+'/results.json',JSON.stringify({api:'fixtures; no DB accessed',widths,overflow:false,skeleton:true,wishlistNotice:true,empty:true,error:true,reducedMotion:true,pageErrors:errors},null,2));
  console.log('UI fixtures passed: skeleton, wishlist notice, responsive, dark, reduced motion, empty, error');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
