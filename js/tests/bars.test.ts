import * as d3Timer from 'd3-timer';

import {
    DummyManager
} from '../tests/dummyManager';

import {
    create_figure_bars, getFills, getStrokes, getStrokeWidth
} from '../tests/widgetUtils';

import * as bqplot from '../src/index';


let manager;
describe("bars >", () => {

    beforeEach(async () => {
        manager = new DummyManager({bqplot: bqplot});
    });

    test("create 1d", async function() {
        let x = {dtype: 'float32', value: new DataView((new Float32Array([0,1])).buffer)};
        let y = {dtype: 'float32', value: new DataView((new Float32Array([2,3])).buffer)};
        let objects = await create_figure_bars(manager, x, y);
        let bars = objects.bars;
        let data = bars.d3el.selectAll(".bargroup").data();
        expect(data[0].values[0].x).toEqual(0);
        expect(data[1].values[0].x).toEqual(1);
        expect(data[0].values[0].y).toEqual(2);
        expect(data[1].values[0].y).toEqual(3);

        d3Timer.timerFlush(); // this makes sure the animations are all executed
        var heights = bars.d3el.selectAll(".bargroup rect.bar").nodes().map((el) => Number(el.getAttribute('height')));
        var height = objects.figure.plotarea_height;
        expect(heights).toEqual([height*2/3, height]);
    });

    test("create 2d classic", async function() {
        let x = [0,0.5,1];
        let y = [[2,2.0,3], [2.0, 2.5, 3.5]];
        let objects = await create_figure_bars(manager, x, y);
        let bars = objects.bars;
        let data = bars.d3el.selectAll(".bargroup").data();
        expect(data.length).toEqual(3);
        expect(data[0].values[0].x).toEqual(0);
        expect(data[0].values[0].y).toEqual(2);
        expect(data[0].values[1].x).toEqual(0);
        expect(data[0].values[1].y).toEqual(2);
        expect(data[0].values.length).toEqual(2);

        expect(data[1].values[0].x).toEqual(0.5);
        expect(data[1].values[0].y).toEqual(2);
        expect(data[1].values[1].x).toEqual(0.5);
        expect(data[1].values[1].y).toEqual(2.5);
        expect(data[1].values.length).toEqual(2);

        expect(data[2].values[0].x).toEqual(1);
        expect(data[2].values[0].y).toEqual(3);
        expect(data[2].values[1].x).toEqual(1);
        expect(data[2].values[1].y).toEqual(3.5);
        expect(data[2].values.length).toEqual(2);

        d3Timer.timerFlush(); // this makes sure the animations are all executed
        var heights = bars.d3el.selectAll(".bargroup rect.bar").nodes().map((el) => Math.round(Number(el.getAttribute('height'))));
        var height = objects.figure.plotarea_height;
        var h0 = Math.round(height*2/3);
        var h2 = Math.round(height);
        var h3 = Math.round(height*2.5/3);
        var h4 = Math.round(height*3.5/3);
        expect(heights).toEqual([h0, h0, h0, h3, h2, h4]);
    });

    test("create 2d binary", async function() {
        let x = {dtype: 'float32', value: new DataView((new Float32Array([0,0.5,1])).buffer), shape: [3]};
        let y = {dtype: 'float32', value: new DataView((new Float32Array([2,2.0,3, 2.0,2.5,3.5])).buffer), shape: [2,3]};
        let objects = await create_figure_bars(manager, x, y);
        let bars = objects.bars;
        let data = bars.d3el.selectAll(".bargroup").data();
        expect(data.length).toEqual(3);
        expect(data[0].values[0].x).toEqual(0);
        expect(data[0].values[0].y).toEqual(2);
        expect(data[0].values[1].x).toEqual(0);
        expect(data[0].values[1].y).toEqual(2);
        expect(data[0].values.length).toEqual(2);

        expect(data[1].values[0].x).toEqual(0.5);
        expect(data[1].values[0].y).toEqual(2);
        expect(data[1].values[1].x).toEqual(0.5);
        expect(data[1].values[1].y).toEqual(2.5);
        expect(data[1].values.length).toEqual(2);

        expect(data[2].values[0].x).toEqual(1);
        expect(data[2].values[0].y).toEqual(3);
        expect(data[2].values[1].x).toEqual(1);
        expect(data[2].values[1].y).toEqual(3.5);
        expect(data[2].values.length).toEqual(2);

        d3Timer.timerFlush(); // this makes sure the animations are all executed
        var heights = bars.d3el.selectAll(".bargroup rect.bar").nodes().map((el) => Math.round(Number(el.getAttribute('height'))));
        var height = objects.figure.plotarea_height;
        var h0 = Math.round(height*2/3);
        var h2 = Math.round(height);
        var h3 = Math.round(height*2.5/3);
        var h4 = Math.round(height*3.5/3);
        expect(heights).toEqual([h0, h0, h0, h3, h2, h4]);
    });

    test("selected", async function() {
        const x = [0, 1, 2, 3, 5, 6];
        const y = [2, 3, 4, 5, 1, 2];
        const objects = await create_figure_bars(manager, x, y);

        const bars = objects.bars;
        const rects = bars.d3el.selectAll('.bargroup').selectAll('.bar');

        bars.model.set('selected_style', {'fill': 'orange'});
        bars.model.set('unselected_style', {'fill': 'red'});

        // Default color, no selection
        expect(getFills(rects)).toEqual(['steelblue', 'steelblue', 'steelblue', 'steelblue', 'steelblue', 'steelblue']);

        // Simulate selection from back-end
        bars.model.set('selected', [0, 3]);
        expect(getFills(rects)).toEqual(['orange', 'red', 'red', 'orange', 'red', 'red']);

        bars.model.set('selected', [4, 5]);
        expect(getFills(rects)).toEqual(['red', 'red', 'red', 'red', 'orange', 'orange']);

        bars.model.set('selected_style', {'fill': 'green'});
        expect(getFills(rects)).toEqual(['red', 'red', 'red', 'red', 'green', 'green']);

        bars.model.set('unselected_style', {'fill': 'black'});
        expect(getFills(rects)).toEqual(['black', 'black', 'black', 'black', 'green', 'green']);

        bars.model.set('selected_style', {});
        expect(getFills(rects)).toEqual(['black', 'black', 'black', 'black', 'steelblue', 'steelblue']);

        bars.model.set('selected', null);
        expect(getFills(rects)).toEqual(['steelblue', 'steelblue', 'steelblue', 'steelblue', 'steelblue', 'steelblue']);
    });

    test("styles", async function() {
        const x = [0, 1, 2, 3, 5, 6];
        const y = [2, 3, 4, 5, 1, 2];
        const objects = await create_figure_bars(manager, x, y);

        const bars = objects.bars;
        const rects = bars.d3el.selectAll('.bargroup').selectAll('.bar');

        bars.model.set('fill', false);

        // No fill
        expect(getFills(rects)).toEqual(['none', 'none', 'none', 'none', 'none', 'none']);
        expect(getStrokes(rects)).toEqual(['none', 'none', 'none', 'none', 'none', 'none']);
        expect(getStrokeWidth(rects)).toEqual(['1', '1', '1', '1', '1', '1']);

        bars.model.set('stroke', 'red');
        expect(getStrokes(rects)).toEqual(['red', 'red', 'red', 'red', 'red', 'red']);
        expect(getStrokeWidth(rects)).toEqual(['1', '1', '1', '1', '1', '1']);

        bars.model.set('stroke_width', 3);
        expect(getStrokes(rects)).toEqual(['red', 'red', 'red', 'red', 'red', 'red']);
        expect(getStrokeWidth(rects)).toEqual(['3', '3', '3', '3', '3', '3']);
    });
});
