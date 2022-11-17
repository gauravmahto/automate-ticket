import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { launch } from 'puppeteer';

import data from './data.json' assert { type: 'json' };

try {
  const browser = await launch({
    headless: false,
    executablePath:
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--start-fullscreen'],
    defaultViewport: null
  });
  const context = browser.defaultBrowserContext();
  context.overridePermissions('https://www.irctc.co.in', ['notifications']);
  const page = await browser.newPage();

  // Avoid website webdriver sniffing
  await page.evaluateOnNewDocument(() => {
    const handleDocumentLoaded = () => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', handleDocumentLoaded);
    } else {
      handleDocumentLoaded();
    }
  });

  // page.setViewport({ width: 2040, height: 1080, deviceScaleFactor: 1 });

  // Goto page
  await page.goto('https://www.irctc.co.in/nget/train-search');

  // Wait for the notification dialog to be open
  // await page.waitForSelector('.ui-dialog-mask', { timeout: 100000 });
  // await page.waitForSelector('.btn.btn-primary');
  // await page.click('.btn.btn-primary');

  await page.waitForFunction(
    (selector) => {
      return document.querySelector(selector) === null;
    },
    {},
    '.ui-dialog-mask'
  );

  // Log in

  // Click login
  await page.waitForFunction(
    (selector) => {
      return document.querySelector(selector) !== null;
    },
    {},
    '[aria-label="Click here to Login in application"]'
  );

  await page.click(`[aria-label="Click here to Login in application"]`);

  await page.waitForFunction(
    (selector) => {
      return document.querySelector(selector) !== null;
    },
    {},
    'input.form-control[placeholder="User Name"]'
  );
  await page.waitForFunction(
    (selector) => {
      return document.querySelector(selector) !== null;
    },
    {},
    'input.form-control[placeholder="Password"]'
  );

  // Fill log-in info
  await page.type('input.form-control[placeholder="User Name"]', data.userid);
  await page.type('input.form-control[placeholder="Password"]', data.password);

  await page.waitForFunction(
    (selector) => {
      return document.querySelector(selector) === null;
    },
    {},
    '.login-bg'
  );

  // Logged in

  await page.waitForFunction(
    (selector) => {
      return document.querySelector(selector) !== null;
    },
    { timeout: 100000 },
    '[aria-label="Click here Logout from application"]'
  );

  await page.waitForFunction(
    (selector) => {
      return document.querySelector(selector) !== null;
    },
    {},
    'input[role="searchbox"]'
  );

  // Enter source and destination, etc info
  const e = await page.$$('input[role="searchbox"]');
  await e[0].click({ clickCount: 3 });
  await e[0].type(data.from);
  await page.waitForTimeout(500);
  await page.keyboard.press('Tab');

  await e[1].click({ clickCount: 3 });
  await e[1].type(data.to);
  await page.waitForTimeout(500);
  await page.keyboard.press('Tab');

  // Set date -- Fix this
  await page.click('p-calendar input', { clickCount: 3 });
  await page.type('p-calendar input', data.date);

  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');

  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');

  // Expect user to fill the data and press Y to continue the script execution
  const rl = readline.createInterface({ input, output });

  let answer = '';

  do {
    answer = await rl.question('Continue (Y/N)?');
  } while (
    answer !== 'Y' &&
    answer !== 'N' &&
    answer !== 'y' &&
    answer !== 'n'
  );

  await page.waitForTimeout(2000);

  // Fill other information
  await page.waitForSelector('#mobileNumber', { timeout: 100000 });
  await page.click('#mobileNumber', { clickCount: 3 });
  await page.type('#mobileNumber', data.mobile);

  await page.waitForTimeout(1000);

  // Fill travelers details

  let infantCandidate;

  const isInfantCandidate = data.travelers.some((traveler) => {
    if (traveler.infant) {
      infantCandidate = traveler;

      return true;
    }

    return false;
  });

  if (isInfantCandidate) {
    const [button] = await page.$x(
      "//span[contains(., '+ Add Infant Without Berth')]"
    );

    if (button) {
      button.click();
    }

    await page.waitForTimeout(500);

    await page.type('[name="infant-name"]', infantCandidate?.name); // TODO
    await page.select('[formcontrolname="age"]', infantCandidate?.age);
    await page.select('[formcontrolname="gender"]', infantCandidate?.gender); // Gender can be 'M' or 'F'

    await page.waitForTimeout(500);
  }

  let [button] = await page.$x("//span[contains(., '+ Add Passenger')]");

  if (button) {
    button.click();
  }

  await page.waitForSelector('input[id="cardNumber"]', { timeout: 100000 });

  await page.type('input#cardNumber', '1234567890123456'); // TODO
  await page.type('input#cardExpiry', '0124'); // TODO
  await page.type('input#cardCvv', '011'); // TODO
  await page.type('input#cardOwnerName', 'Test'); // TODO

} catch (error) {

  console.log(error);

}
