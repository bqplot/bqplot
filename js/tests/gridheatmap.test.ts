import * as d3Timer from 'd3-timer';

import {
    DummyManager
} from '../tests/dummyManager';

import {
    create_figure_gridheatmap, getFills
} from '../tests/widgetUtils';

import * as bqplot from '../src/index';


let manager;
describe("gridheatmap >", () => {

    beforeEach(async function() {
        manager = new DummyManager({bqplot: bqplot});
    });

    it("create", async function() {
        const colors = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
        const objects = await create_figure_gridheatmap(manager, colors);
        const grid = objects.grid;

        d3Timer.timerFlush();

        const rows = grid.d3el.selectAll('.heatmaprow');

        const rowPositions = rows.nodes().map((row) => row.getAttribute('transform'));
        expect(rowPositions[0]).toEqual('translate(0, 0)');
        // expect(rowPositions[1]).toEqual('translate(0, 166.66666666666666)');
        // expect(rowPositions[2]).toEqual('translate(0, 333.3333333333333)');

        const rects = rows.selectAll('rect');
        const expectedColors = ['rgb(165, 0, 38)', 'rgb(222, 63, 46)', 'rgb(249, 142, 82)', 'rgb(254, 212, 129)', 'rgb(255, 255, 191)', 'rgb(204, 234, 131)', 'rgb(134, 203, 103)', 'rgb(45, 161, 85)', 'rgb(0, 104, 55)'];
        expect(getFills(rects)).toEqual(expectedColors);
    });

    it("update selected", async function() {
        const colors = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
        const objects = await create_figure_gridheatmap(manager, colors);
        const grid = objects.grid;

        d3Timer.timerFlush();

        grid.model.set('selected', [[0, 1], [1, 1], [2, 0]]);
        grid.model.set('selected_style', {fill: 'red', opacity: 1})

        d3Timer.timerFlush();

        const rows = grid.d3el.selectAll('.heatmaprow');
        const rects = rows.selectAll('rect');
        let expectedColors = [
            'rgb(165, 0, 38)', 'red', 'rgb(249, 142, 82)',
            'rgb(254, 212, 129)', 'red', 'rgb(204, 234, 131)',
            'red', 'rgb(45, 161, 85)', 'rgb(0, 104, 55)'];

        expect(getFills(rects)).toEqual(expectedColors);

        grid.model.set('selected', [[0, 2], [1, 1], [2, 1]]);

        d3Timer.timerFlush();

        expectedColors = [
            'rgb(165, 0, 38)', 'rgb(222, 63, 46)', 'red',
            'rgb(254, 212, 129)', 'red', 'rgb(204, 234, 131)',
            'rgb(134, 203, 103)', 'red', 'rgb(0, 104, 55)'];

        expect(getFills(rects)).toEqual(expectedColors);
    });

});
