import puppeteer from 'puppeteer';
import { exec } from 'child_process';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 1000));
  
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('我的行程'));
    if (btn) btn.click();
  });
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
  process.exit(0);
})();
