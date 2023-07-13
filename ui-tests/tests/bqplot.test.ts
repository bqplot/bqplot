// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, IJupyterLabPageFixture, test } from '@jupyterlab/galata';
import * as path from 'path';
const klaw = require('klaw-sync');


const filterUpdateNotebooks = item => {
  const basename = path.basename(item.path);
  return basename.includes('_update');
}

const testCellOutputs = async (page: IJupyterLabPageFixture, tmpPath: string, theme: 'JupyterLab Light' | 'JupyterLab Dark') => {
  const paths = klaw(path.resolve(__dirname, './notebooks'), {filter: item => !filterUpdateNotebooks(item), nodir: true});
  const notebooks = paths.map(item => path.basename(item.path));

  const contextPrefix = theme == 'JupyterLab Light' ? 'light' : 'dark';
  page.theme.setTheme(theme);

  for (const notebook of notebooks) {
    let results = [];

    await page.notebook.openByPath(`${tmpPath}/${notebook}`);
    await page.notebook.activate(notebook);

    let numCellImages = 0;

    const getCaptureImageName = (contextPrefix: string, notebook: string, id: number): string => {
      return `${contextPrefix}-${notebook}-cell-${id}.png`;
    };

    await page.notebook.runCellByCell({
      onAfterCellRun: async (cellIndex: number) => {
        const cell = await page.notebook.getCellOutput(cellIndex);
        if (cell) {
          results.push(await cell.screenshot());
          numCellImages++;
        }
      }
    });

    await page.notebook.save();

    for (let c = 0; c < numCellImages; ++c) {
      expect(results[c]).toMatchSnapshot(getCaptureImageName(contextPrefix, notebook, c));
    }

    await page.notebook.close(true);
  }
}

const testPlotUpdates = async (page: IJupyterLabPageFixture, tmpPath: string, theme: 'JupyterLab Light' | 'JupyterLab Dark') => {
  const paths = klaw(path.resolve(__dirname, './notebooks'), {filter: item => filterUpdateNotebooks(item), nodir: true});
  const notebooks = paths.map(item => path.basename(item.path));

  const contextPrefix = theme == 'JupyterLab Light' ? 'light' : 'dark';
  page.theme.setTheme(theme);

  for (const notebook of notebooks) {
    let results = [];

    await page.notebook.openByPath(`${tmpPath}/${notebook}`);
    await page.notebook.activate(notebook);

    const getCaptureImageName = (contextPrefix: string, notebook: string, id: number): string => {
      return `${contextPrefix}-${notebook}-cell-${id}.png`;
    };

    let cellCount = 0;
    await page.notebook.runCellByCell({
      onAfterCellRun: async (cellIndex: number) => {
        // Always get first cell output which must contain the plot
        const cell = await page.notebook.getCellOutput(0);
        if (cell) {
          results.push(await cell.screenshot());
          cellCount++;
        }
      }
    });

    await page.notebook.save();

    for (let i = 0; i < cellCount; i++) {
      expect(results[i]).toMatchSnapshot(getCaptureImageName(contextPrefix, notebook, i));
    }

    await page.notebook.close(true);
  }
};

test.describe('bqplot Visual Regression', () => {
  test.beforeEach(async ({ page, tmpPath }) => {
    page.on("console", (message) => {
      console.log('CONSOLE MSG ---', message.text());
    });

    await page.contents.uploadDirectory(
      path.resolve(__dirname, './notebooks'),
      tmpPath
    );
    await page.filebrowser.openDirectory(tmpPath);
  });

  test('Light theme: Check bqplot first renders', async ({
    page,
    tmpPath,
  }) => {
    await testCellOutputs(page, tmpPath, 'JupyterLab Light');
  });

  test('Dark theme: Check bqplot first renders', async ({
    page,
    tmpPath,
  }) => {
    await testCellOutputs(page, tmpPath, 'JupyterLab Dark');
  });

  test('Light theme: Check bqplot update plot properties', async ({
    page,
    tmpPath,
  }) => {
    await testPlotUpdates(page, tmpPath, 'JupyterLab Light');
  });

  test('Dark theme: Check bqplot update plot properties', async ({
    page,
    tmpPath,
  }) => {
    await testPlotUpdates(page, tmpPath, 'JupyterLab Dark');
  });
});
