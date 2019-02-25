import { expect } from 'chai';
import { DummyManager } from './dummy-manager';
import bqplot = require('..');
// import {Figure} from '../src/Figure.js';
// import {FigureModel} from '../src/FigureModel.js';
import {create_figure_scatter} from './widget-utils'
import * as d3 from 'd3';


// text pixel coordinate
const test_x = 200;
const test_y = 200;
const pixel_red = [255, 0, 0, 255];

describe("figure >", () => {
    beforeEach(async function() {
        this.manager = new DummyManager({ bqplot: bqplot });
    });

    it("canvas/png render check", async function() {
        let x = {dtype: 'float32', value: new DataView((new Float32Array([0.5, 0.5])).buffer)}
        let y = {dtype: 'float32', value: new DataView((new Float32Array([2.0, 2.5])).buffer)}
        let { scatter, figure } = await create_figure_scatter(this.manager, x, y);
        // we render a huge red scatter point, and check if the path of svg->canvas (and thus
        // png) results in a red pixels at the test coordinates.
        scatter.model.set('default_size', 1e6);
        scatter.model.set('colors', ['red'])
        let data = scatter.d3el.selectAll(".object_grp").data()

        d3.timer.flush() // this makes sure the animations are all executed
        let canvas = await figure.get_rendered_canvas();
        var context = canvas.getContext("2d");
        let pixel = context.getImageData(test_x, test_y, 1, 1)
        expect(Array.prototype.slice.call(pixel.data)).to.deep.equals(pixel_red);
    });

});
