import { test, expect } from '@playwright/test';

// Yo team! listen. here's what will happen, you'll run this and it will navigate to the gradescope login screen and then you have a small race against time (all the following even the human manual bits have to be done by TIMEOUT (see below)!
// you have to do the following things before the test times out (5 minutes) (there are a few manual bits to make it easier than requiring your figure out a bunch of args):
// 1. wait for you to enter your credentials (it assumes you want ot use your "school credentials") and press enter
// 2. then you have to manually click a course 
// 3. then manually choose an assignment
// 4. then manually select the Review Grades page for that assignment
// 5. then it will do a bunch of things to collect the submission history for each student (just the datetime, number, and score, not the submitted files)
// 6. when it's done running it will have produced a playwright-report/index.html file and if you open that and click the only "test" in there, and then there will be a page (same html file)  that expands to show the annotations which will have the json representation of the submission history

const TIMEOUT = 5 * 60 * 1000; // max length of time for all this in ms, set originally to 5 minutes
test('test', async ({ page }) => {
  test.setTimeout(TIMEOUT);
  const submissionHistory = {}
  await page.goto('https://www.gradescope.com/login');
  await page.getByRole('button', { name: 'Log In' }).click();
  await page.getByLabel('Email', { exact: true }).click();
  await page.getByLabel('Email', { exact: true }).press('Meta+.');
  await page.getByLabel('Email', { exact: true }).click();
  await page.getByRole('link', { name: 'School Credentials' }).click();
  await page.getByPlaceholder('Search for your school').click();
  await page.getByPlaceholder('Search for your school').fill('james ');
  await page.getByRole('link', { name: 'James Madison University Username' }).click();
  await page.getByLabel('JMU eID').click();
  await page.waitForURL('**/review_grades');
  const submissionTable = await page.locator('tbody').waitFor()
  const nameLinks = await page.locator('tbody > tr > td:first-child >a').all();
  for (const nameLink of nameLinks) {
    try {
      const nameLinkText = await nameLink.textContent();
      if (nameLink && !submissionHistory[nameLinkText]) {
        submissionHistory[nameLinkText] = {};

        await nameLink.click({timeout: 5000});

        await page.getByRole('button', { name: 'Submission History' }).click();
        // await page.locator('table.submissionHistoryTable>tbody').waitFor();
        await page.waitForFunction(() => {
          const tbody = document.querySelector('table.submissionHistoryTable>tbody')
          return tbody && tbody.textContent && !tbody.textContent.includes('Loading submission history')
        });
        const submissionRows = await page.locator('table.submissionHistoryTable>tbody>tr').all()
        for (const submissionRow of submissionRows) {
          const number = await submissionRow.locator('td:nth-child(1)').evaluate((el) => { 
            const tc = el.textContent; console.log(tc); 
            return tc; });
          const dateTime = await submissionRow.locator('td time').evaluate((el) => el.attributes['datetime'].value);
          const score = await submissionRow.locator('td:nth-child(4)').evaluate((el) => el.textContent);
          submissionHistory[nameLinkText][number] = { number, dateTime, score }
        }

      }
      console.log(submissionHistory)
      await page.goBack();
      await page.goBack();
      // console.log('backagain?')
    } catch (toe) {
      console.log(toe)
      await page.goBack();
    }

  }

  test.info().annotations.push({type:'submissionHistory', description: JSON.stringify(submissionHistory)})
});