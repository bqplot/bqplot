import { expect, test } from '@jupyterlab/galata';
import * as path from 'path';

for (const theme of ['JupyterLab Light', 'JupyterLab Dark'] as const) {
  test(`Bins initialized with one bin update without resizing (${theme})`, async ({
    page,
    tmpPath,
  }, testInfo) => {
    const notebook = 'bins_update.ipynb';
    const prefix = theme === 'JupyterLab Light' ? 'light' : 'dark';
    await page.theme.setTheme(theme);
    await page.contents.uploadFile(
      path.resolve(__dirname, 'fixtures', notebook),
      `${tmpPath}/${notebook}`
    );
    await page.notebook.openByPath(`${tmpPath}/${notebook}`);
    await page.notebook.activate(notebook);

    await page.notebook.runCellByCell({
      onAfterCellRun: async (cellIndex: number) => {
        const output = await page.notebook.getCellOutput(0);
        await output.waitForSelector('svg.svg-figure');
        await expect
          .poll(() =>
            output.$$eval('.bargroup rect.bar', (bars) => bars.length)
          )
          .toBe([1, 10, 4][cellIndex]);
        await page.evaluate(() => (document as any).fonts.ready);
        await testInfo.attach(`bins-${cellIndex}`, {
          body: await output.screenshot(),
          contentType: 'image/png',
        });

        if (cellIndex > 0) {
          const count = cellIndex === 1 ? 10 : 4;
          await expect
            .poll(() =>
              output.$$eval(
                '.bargroup rect.bar',
                (bars) =>
                  bars.filter((bar) => Number(bar.getAttribute('width')) > 1)
                    .length
              )
            )
            .toBe(count);
        }
        const screenshot = await output.screenshot();
        expect(screenshot).toMatchSnapshot(
          `${prefix}-bins-cell-${cellIndex}.png`,
          {
            threshold: 0.3,
            maxDiffPixelRatio: 0.02,
          }
        );
      },
    });
    await page.notebook.close(true);
  });
}
