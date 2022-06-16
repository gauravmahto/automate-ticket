import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { launch } from 'puppeteer';

import data from './data.json' assert { type: 'json' };

try {

  const browser = await launch({
    headless: false,
    args: [
      '--start-fullscreen'
    ],
    defaultViewport: null
  });
  const context = browser.defaultBrowserContext();
  context.overridePermissions('https://www.irctc.co.in', ['notifications']);
  const page = await browser.newPage();
  // page.setViewport({ width: 2040, height: 1080, deviceScaleFactor: 1 });
  await page.goto('https://www.irctc.co.in/nget/train-search');

  await page.waitForSelector('.ui-dialog-mask', { timeout: 100000 });
  await page.waitForSelector('.btn.btn-primary');
  await page.click('.btn.btn-primary');

  await page.waitForFunction((selector) => {
    return document.querySelector(selector) === null;
  }, {}, '.ui-dialog-mask');

  // Log in

  await page.waitForFunction((selector) => {
    return document.querySelector(selector) !== null;
  }, {}, '[aria-label="Click here to Login in application"]');

  await page.click(`[aria-label="Click here to Login in application"]`);

  await page.waitForFunction((selector) => {
    return document.querySelector(selector) !== null;
  }, {}, 'input.form-control[placeholder="User Name"]');
  await page.waitForFunction((selector) => {
    return document.querySelector(selector) !== null;
  }, {}, 'input.form-control[placeholder="Password"]');

  await page.type('input.form-control[placeholder="User Name"]', data.userid);
  await page.type('input.form-control[placeholder="Password"]', data.password);

  await page.waitForFunction((selector) => {
    return document.querySelector(selector) === null;
  }, {}, '.login-bg');

  // Logged in

  await page.waitForFunction((selector) => {
    return document.querySelector(selector) !== null;
  }, { timeout: 100000 }, '[aria-label="Click here Logout from application"]');

  await page.waitForFunction((selector) => {
    return document.querySelector(selector) !== null;
  }, {}, 'input[role="searchbox"]');

  const e = await page.$$('input[role="searchbox"]');
  await e[0].click({ clickCount: 3 });
  await e[0].type('lko');
  await page.waitForTimeout(500);
  await page.keyboard.press('Tab');

  await e[1].click({ clickCount: 3 });
  await e[1].type('cdg');
  await page.waitForTimeout(500);
  await page.keyboard.press('Tab');

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

  const rl = readline.createInterface({ input, output });

  let answer = '';

  do {

    answer = await rl.question('Continue (Y/N)?')

  } while (answer !== 'Y' && answer !== 'N' && answer !== 'y' && answer !== 'n');


  await page.waitForSelector('#mobileNumber', { timeout: 100000 });
  await page.click('#mobileNumber', { clickCount: 3 });
  await page.type('#mobileNumber', data.mobile);

  await page.waitForTimeout(1000);

  let [button] = await page.$x("//span[contains(., '+ Add Infant Without Berth')]");

  if (button) {
    button.click();
  }

  await page.waitForTimeout(500);

  await page.type('[name="infant-name"]', 'Test');   // TODO
  await page.select('[formcontrolname="age"]', '0');
  await page.select('[formcontrolname="gender"]', 'M');

  await page.waitForTimeout(500);

  [button] = await page.$x("//span[contains(., '+ Add Passenger')]");

  if (button) {
    button.click();
  }

  await page.waitForSelector('input[id="cardNumber"]', { timeout: 100000 });

  await page.type('input#cardNumber', '1234567890123456');  // TODO
  await page.type('input#cardExpiry', '0124'); // TODO
  await page.type('input#cardCvv', '011');  // TODO
  await page.type('input#cardOwnerName', 'Test'); // TODO

} catch (error) {
  console.log(error);
}
