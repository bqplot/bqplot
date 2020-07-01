import {
    expect
} from 'chai';

import * as d3Timer from 'd3-timer';

import {
    DummyManager
} from './dummy-manager';

import {
    create_figure_bars, getFills, getStrokes, getStrokeWidth
} from './widget-utils';

import * as bqplot from '..';


describe("bars >", () => {
    beforeEach(async function() {
        this.manager = new DummyManager({bqplot: bqplot});
    });

    it("create 1d", async function() {
        let x = {dtype: 'float32', value: new DataView((new Float32Array([0,1])).buffer)};
        let y = {dtype: 'float32', value: new DataView((new Float32Array([2,3])).buffer)};
        let objects = await create_figure_bars(this.manager, x, y);
        let bars = objects.bars;
        let data = bars.d3el.selectAll(".bargroup").data();
        expect(data[0].values[0].x).to.equal(0);
        expect(data[1].values[0].x).to.equal(1);
        expect(data[0].values[0].y).to.equal(2);
        expect(data[1].values[0].y).to.equal(3);

        d3Timer.timerFlush(); // this makes sure the animations are all executed
        var heights = bars.d3el.selectAll(".bargroup rect.bar").nodes().map((el) => Number(el.getAttribute('height')));
        var height = objects.figure.plotarea_height;
        expect(heights).to.deep.equal([height*2/3, height]);
    });

    it("create 2d classic", async function() {
        let x = [0,0.5,1];
        let y = [[2,2.0,3], [2.0, 2.5, 3.5]];
        let objects = await create_figure_bars(this.manager, x, y);
        let bars = objects.bars;
        let data = bars.d3el.selectAll(".bargroup").data();
        expect(data).to.have.lengthOf(3);
        expect(data[0].values[0].x).to.equal(0);
        expect(data[0].values[0].y).to.equal(2);
        expect(data[0].values[1].x).to.equal(0);
        expect(data[0].values[1].y).to.equal(2);
        expect(data[0].values).to.have.lengthOf(2);

        expect(data[1].values[0].x).to.equal(0.5);
        expect(data[1].values[0].y).to.equal(2);
        expect(data[1].values[1].x).to.equal(0.5);
        expect(data[1].values[1].y).to.equal(2.5);
        expect(data[1].values).to.have.lengthOf(2);

        expect(data[2].values[0].x).to.equal(1);
        expect(data[2].values[0].y).to.equal(3);
        expect(data[2].values[1].x).to.equal(1);
        expect(data[2].values[1].y).to.equal(3.5);
        expect(data[2].values).to.have.lengthOf(2);

        d3Timer.timerFlush(); // this makes sure the animations are all executed
        var heights = bars.d3el.selectAll(".bargroup rect.bar").nodes().map((el) => Math.round(Number(el.getAttribute('height'))));
        var height = objects.figure.plotarea_height;
        var h0 = Math.round(height*2/3);
        var h2 = Math.round(height);
        var h3 = Math.round(height*2.5/3);
        var h4 = Math.round(height*3.5/3);
        expect(heights).to.deep.equal([h0, h0, h0, h3, h2, h4]);
    });

    it("create 2d binary", async function() {
        let x = {dtype: 'float32', value: new DataView((new Float32Array([0,0.5,1])).buffer), shape: [3]};
        let y = {dtype: 'float32', value: new DataView((new Float32Array([2,2.0,3, 2.0,2.5,3.5])).buffer), shape: [2,3]};
        let objects = await create_figure_bars(this.manager, x, y);
        let bars = objects.bars;
        let data = bars.d3el.selectAll(".bargroup").data();
        expect(data).to.have.lengthOf(3);
        expect(data[0].values[0].x).to.equal(0);
        expect(data[0].values[0].y).to.equal(2);
        expect(data[0].values[1].x).to.equal(0);
        expect(data[0].values[1].y).to.equal(2);
        expect(data[0].values).to.have.lengthOf(2);

        expect(data[1].values[0].x).to.equal(0.5);
        expect(data[1].values[0].y).to.equal(2);
        expect(data[1].values[1].x).to.equal(0.5);
        expect(data[1].values[1].y).to.equal(2.5);
        expect(data[1].values).to.have.lengthOf(2);

        expect(data[2].values[0].x).to.equal(1);
        expect(data[2].values[0].y).to.equal(3);
        expect(data[2].values[1].x).to.equal(1);
        expect(data[2].values[1].y).to.equal(3.5);
        expect(data[2].values).to.have.lengthOf(2);

        d3Timer.timerFlush(); // this makes sure the animations are all executed
        var heights = bars.d3el.selectAll(".bargroup rect.bar").nodes().map((el) => Math.round(Number(el.getAttribute('height'))));
        var height = objects.figure.plotarea_height;
        var h0 = Math.round(height*2/3);
        var h2 = Math.round(height);
        var h3 = Math.round(height*2.5/3);
        var h4 = Math.round(height*3.5/3);
        expect(heights).to.deep.equal([h0, h0, h0, h3, h2, h4]);
    });

    it("selected", async function() {
        const x = [0, 1, 2, 3, 5, 6];
        const y = [2, 3, 4, 5, 1, 2];
        const objects = await create_figure_bars(this.manager, x, y);

        const bars = objects.bars;
        const rects = bars.d3el.selectAll('.bargroup').selectAll('.bar');

        bars.model.set('selected_style', {'fill': 'orange'});
        bars.model.set('unselected_style', {'fill': 'red'});

        // Default color, no selection
        expect(getFills(rects)).to.eql(['steelblue', 'steelblue', 'steelblue', 'steelblue', 'steelblue', 'steelblue']);

        // Simulate selection from back-end
        bars.model.set('selected', [0, 3]);
        expect(getFills(rects)).to.eql(['orange', 'red', 'red', 'orange', 'red', 'red']);

        bars.model.set('selected', [4, 5]);
        expect(getFills(rects)).to.eql(['red', 'red', 'red', 'red', 'orange', 'orange']);

        bars.model.set('selected_style', {'fill': 'green'});
        expect(getFills(rects)).to.eql(['red', 'red', 'red', 'red', 'green', 'green']);

        bars.model.set('unselected_style', {'fill': 'black'});
        expect(getFills(rects)).to.eql(['black', 'black', 'black', 'black', 'green', 'green']);

        bars.model.set('selected_style', {});
        expect(getFills(rects)).to.eql(['black', 'black', 'black', 'black', 'steelblue', 'steelblue']);

        bars.model.set('selected', null);
        expect(getFills(rects)).to.eql(['steelblue', 'steelblue', 'steelblue', 'steelblue', 'steelblue', 'steelblue']);
    });

    it("styles", async function() {
        const x = [0, 1, 2, 3, 5, 6];
        const y = [2, 3, 4, 5, 1, 2];
        const objects = await create_figure_bars(this.manager, x, y);

        const bars = objects.bars;
        const rects = bars.d3el.selectAll('.bargroup').selectAll('.bar');

        bars.model.set('fill', false);

        // No fill
        expect(getFills(rects)).to.eql(['none', 'none', 'none', 'none', 'none', 'none']);
        expect(getStrokes(rects)).to.eql(['none', 'none', 'none', 'none', 'none', 'none']);
        expect(getStrokeWidth(rects)).to.eql(['1', '1', '1', '1', '1', '1']);

        bars.model.set('stroke', 'red');
        expect(getStrokes(rects)).to.eql(['red', 'red', 'red', 'red', 'red', 'red']);
        expect(getStrokeWidth(rects)).to.eql(['1', '1', '1', '1', '1', '1']);

        bars.model.set('stroke_width', 3);
        expect(getStrokes(rects)).to.eql(['red', 'red', 'red', 'red', 'red', 'red']);
        expect(getStrokeWidth(rects)).to.eql(['3', '3', '3', '3', '3', '3']);
    });
});
