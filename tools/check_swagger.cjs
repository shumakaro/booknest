const { chromium } = require('C:/Users/comp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({headless:true,channel:"msedge"});
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto('http://127.0.0.1:8000/docs');
  await page.getByRole('heading',{name:'BookNest API',exact:false}).waitFor();
  await page.screenshot({path:'docs/lab7/swagger.png',fullPage:true});
  console.log('Swagger UI: открыт, заголовок и маршруты загружены');
  await browser.close();
})();

