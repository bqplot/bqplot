import { LinearScaleModel } from "../src/LinearScaleModel.js";
import { LinearScale } from "../src/LinearScale.js";
import { expect } from 'chai';
import {DummyManager} from './dummy-manager';
import bqplot = require('..');
import {Figure} from '../src/Figure.js';
import {FigureModel} from '../src/FigureModel.js';
import {create_model, create_model_bqplot, create_view, create_figure_scatter} from './widget-utils'
import * as d3 from 'd3';


describe("scatter >", () => {
    beforeEach(async function() {
        this.manager = new DummyManager({bqplot: bqplot});
    });

    it("create", async function() {
        let x = {type: 'dontcare', values: [0, 1]}
        let y = {type: 'dontcare', values: [2, 3]}
        // let x = {dtype: 'float64', buffer: new DataView((new Float32Array([1,2])).buffer)}
        // let y = {dtype: 'float32', buffer: new DataView((new Float32Array([1,2])).buffer)}
        let objects = await create_figure_scatter(this.manager, x, y);
        let scatter = objects.scatter;
        let data = scatter.d3el.selectAll(".object_grp").data()
        expect(data[0].x).to.equal(0)
        expect(data[1].x).to.equal(1)
        expect(data[0].y).to.equal(2)
        expect(data[1].y).to.equal(3)
        
        d3.timer.flush() // this makes sure the animations are all executed
        var transforms = scatter.d3el.selectAll(".object_grp")[0].map((el) => el.getAttribute('transform'));
        var width = objects.figure.plotarea_width;
        var height = objects.figure.plotarea_height;
        expect(transforms).to.deep.equal([`translate(0,${height})`, `translate(${width},0)`])

    });
});