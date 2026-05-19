const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE LOG ERROR:', msg.text());
  });
  await page.goto('http://localhost:3000/taiwan-wanderlust/');
  await page.waitForTimeout(1000);
  await page.click('text=我的行程');
  await page.waitForTimeout(2000);
  await browser.close();
})();
