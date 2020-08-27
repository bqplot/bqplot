import { expect } from 'chai';
import { DummyManager } from './dummy-manager';
import bqplot = require('..');
// import {Figure} from '../src/Figure.js';
// import {FigureModel} from '../src/FigureModel.js';
import {create_figure_scatter, create_model_bqplot} from './widget-utils'
import * as d3Timer from 'd3-timer';


// text pixel coordinate
const test_x = 200;
const test_y = 200;
const pixel_red = [255, 0, 0, 255];
const pixel_blue = [0, 0, 255, 255];

describe("figure >", () => {
    beforeEach(async function() {
        this.manager = new DummyManager({ bqplot: bqplot });
    });

    it("should not create a WebGL renderer if not needed", async function() {
        const x = {dtype: 'float32', value: new DataView((new Float32Array([0.5, 0.5])).buffer)};
        const y = {dtype: 'float32', value: new DataView((new Float32Array([2.0, 2.5])).buffer)};
        const { figure } = await create_figure_scatter(this.manager, x, y);

        expect(figure.renderer).to.be.undefined;
    });

    it("should create a WebGL renderer when needed", async function() {
        const x = {dtype: 'float32', value: new DataView((new Float32Array([0.5, 0.5])).buffer)};
        const y = {dtype: 'float32', value: new DataView((new Float32Array([2.0, 2.5])).buffer)};
        const { figure } = await create_figure_scatter(this.manager, x, y, true);

        expect(figure.renderer).to.not.be.undefined;
    });

    it("canvas/png render check", async function() {
        const x = {dtype: 'float32', value: new DataView((new Float32Array([0.5, 0.5])).buffer)};
        const y = {dtype: 'float32', value: new DataView((new Float32Array([2.0, 2.5])).buffer)};
        const { scatter, figure } = await create_figure_scatter(this.manager, x, y);
        // we render a huge red scatter point, and check if the path of svg->canvas (and thus
        // png) results in a red pixels at the test coordinates.
        scatter.model.set('default_size', 1e6);
        scatter.model.set('colors', ['red']);
        scatter.d3el.selectAll(".object_grp").data();

        d3Timer.timerFlush(); // this makes sure the animations are all executed
        const canvas = await figure.get_rendered_canvas();
        const context = canvas.getContext("2d");
        const pixel = context.getImageData(test_x, test_y, 1, 1);
        expect(Array.prototype.slice.call(pixel.data)).to.deep.equals(pixel_red);
    });

    it("canvas/png render gl check", async function() {
        const x = {dtype: 'float32', value: new DataView((new Float32Array([0.5, 0.5])).buffer)};
        const y = {dtype: 'float32', value: new DataView((new Float32Array([2.0, 2.5])).buffer)};
        const { scatter: scatterGlView, figure } = await create_figure_scatter(this.manager, x, y, true);

        // we render a huge red scatter point, and check if the path of svg->canvas (and thus
        // png) results in a red pixels at the test coordinates.
        scatterGlView.model.set('default_size', 1e6);
        scatterGlView.model.set('colors', ['red']);
        // scatterGlView.d3el.selectAll(".object_grp").data();

        d3Timer.timerFlush(); // this makes sure the animations are all executed
        let canvas = await figure.get_rendered_canvas();
        let context = canvas.getContext("2d");
        let pixel = context.getImageData(test_x, test_y, 1, 1);
        expect(Array.prototype.slice.call(pixel.data)).to.deep.equals(pixel_red);
        // add a normal (blue) scatter, which should be overlayed on top
        let scales = {x: scatterGlView.model.get('scales').x.toJSON(), y: scatterGlView.model.get('scales').y.toJSON()};
        let color    = null;
        let size     = null;
        let opacity  = null;
        let rotation = null;
        let skew     = null;
        const scatter = await create_model_bqplot(this.manager, 'Scatter', 'scatter1', {scales: scales,
                x: x, y: y, color: color, size: size, opacity: opacity, rotation: rotation, skew: skew, colors: ['blue'],
                visible: true, default_size: 1e6, selected_style: {}, unselected_style: {}, hovered_style: {}, unhovered_style: {},
                preserve_domain: {}, _view_module_version: '*', _view_module: 'bqplot'})
        figure.model.set('marks', [scatter, scatterGlView.model]);
        await Promise.all(figure.mark_views.views);
        d3Timer.timerFlush(); // this makes sure the animations are all executed
        canvas = await figure.get_rendered_canvas();
        context = canvas.getContext("2d");
        pixel = context.getImageData(test_x, test_y, 1, 1);
        expect(Array.prototype.slice.call(pixel.data)).to.deep.equals(pixel_blue);


    });

});
