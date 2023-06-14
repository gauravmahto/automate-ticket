import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { launch } from 'puppeteer';

import data from './data.json' assert { type: 'json' };

const rl = readline.createInterface({ input, output });

try {
  const browser = await launch({
    headless: false,
    executablePath:
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    // 'C:\\Program Files\\Google\\Chrome\\Application\\Chrome.exe',
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

  // This dialog has been removed .. no need to wait.
  // await page.waitForFunction(
  //   (selector) => {
  //     return document.querySelector(selector) === null;
  //   },
  //   {},
  //   '.ui-dialog-mask'
  // );

  // Log in

  // Click login
  await page.waitForFunction(
    (selector) => {
      return document.querySelector(selector) !== null;
    },
    { timeout: 100000 },
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
  await new Promise(r => setTimeout(r, 500));
  await page.keyboard.press('Tab');

  await e[1].click({ clickCount: 3 });
  await e[1].type(data.to);
  await new Promise(r => setTimeout(r, 500));
  await page.keyboard.press('Tab');

  // Set date -- Fix this
  await page.click('p-calendar input', { clickCount: 3 });
  await page.type('p-calendar input', data.date);

  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');

  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 1000));

  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');

  // Await for user input to continue
  await prompt('Continue (Y/N)?', rl);

  await new Promise(r => setTimeout(r, 2000));

  // Fill other information
  await page.waitForSelector('#mobileNumber', { timeout: 100000 });
  await page.click('#mobileNumber', { clickCount: 3 });
  await page.type('#mobileNumber', data.mobile);

  await new Promise(r => setTimeout(r, 1000));

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

    // TODO
    // Add support for Infant with Birth

    if (button) {

      button.click();

    }

    await new Promise(r => setTimeout(r, 500));

    await page.type('[name="infant-name"]', infantCandidate?.name); // TODO
    await page.select('[formcontrolname="age"]', infantCandidate?.age);
    await page.select('[formcontrolname="gender"]', infantCandidate?.gender); // Gender can be 'M' or 'F'

    await new Promise(r => setTimeout(r, 500));

  }

  const adultPassengers = data.travelers
    .filter(traveller => !traveller.infant && traveller.name.length > 0);

  for (let index = 0; index < adultPassengers.length; index++) {

    const inputElements = await page.$$('[formcontrolname="passengerName"] input');
    const inputAgeElements = await page.$$('[formcontrolname="passengerAge"]');
    const inputGenderElements = await page.$$('[formcontrolname="passengerGender"]');
    const foodChoiceElements = await page.$$('[formcontrolname="passengerFoodChoice"]');

    inputElements[index].click({ clickCount: 3 });
    await new Promise(r => setTimeout(r, 500));
    inputElements[index].type(adultPassengers[index].name);
    await new Promise(r => setTimeout(r, 500));
    inputAgeElements[index].type(adultPassengers[index].age);
    await new Promise(r => setTimeout(r, 500));
    inputGenderElements[index].select(adultPassengers[index].gender);

    if (foodChoiceElements.length !== 0) {

      foodChoiceElements[index].select(adultPassengers[index].foodChoice);

    }

    if (index < adultPassengers.length - 1) {
      const [button] = await page.$x("//span[contains(., '+ Add Passenger')]");

      if (button) {

        button.click();

        await new Promise(r => setTimeout(r, 500));

      }
    }

  }

  // Await user input to continue for payment
  await prompt('Continue for Payment (Y/N)?', rl);

  let retryAttempt = 0;

  await tryWithRetry(paymentEntries, 4, () => ++retryAttempt, page);

} catch (error) {

  console.log(error);

}

async function prompt(message, rl) {

  let answer = '';

  do {

    // Expect user to fill the data and press Y to continue the script execution
    answer = await rl.question(message);

  } while (
    answer !== 'Y' &&
    answer !== 'N' &&
    answer !== 'y' &&
    answer !== 'n'
  );

  return answer.toLowerCase() === 'y';

}

async function tryWithRetry(retryFn, numberOfRetries = Number.POSITIVE_INFINITY, retryCountFn, ...args) {

  let attemptSuccessful = true;
  let continueAfterPrompt = false;

  do {

    continueAfterPrompt = false;
    attemptSuccessful = await paymentEntries(...args);

    if (!attemptSuccessful) {

      // Await for user input to retry
      continueAfterPrompt = await prompt('Retry Payment (Y/N)?', rl);

    }

  } while (continueAfterPrompt && retryCountFn() < numberOfRetries);

}

async function paymentEntries(page) {

  let result = true;

  try {

    await new Promise(r => setTimeout(r, 1000));

    // For ICICI gateway
    await page.type('input#cardnumber', data.creditCardNumber); // TODO
    await page.select('select#expmonth', data.expiryMonth || '2'); // Index of options
    await page.select('select#expyear', data.expiryYear || '3'); // Index of options
    await page.type('input#cvm_masked', data.cvv); // TODO
    await page.type('input#bname', data.nameOnCard); // TODO

    // TODO
    // Add support for other payment gateways

  } catch {

    result = false;

  }

  return result;

}
