import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.toString());
  });

  await page.goto('http://localhost:3000/dashboard');
  
  console.log('Page loaded. Waiting for Bell icon...');
  await page.waitForSelector('.lucide-bell');
  
  console.log('Clicking Bell icon...');
  // Find the button wrapping the bell
  await page.evaluate(() => {
    const bell = document.querySelector('.lucide-bell');
    if (bell) bell.closest('button, [data-slot="dropdown-menu-trigger"]').click();
  });
  
  console.log('Clicked. Waiting 2 seconds...');
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
