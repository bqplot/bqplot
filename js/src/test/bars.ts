import { expect } from 'chai';
import {DummyManager} from './dummy-manager';
import bqplot = require('..');
import {create_figure_bars} from './widget-utils'
import * as d3Timer from 'd3-timer';


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
});
