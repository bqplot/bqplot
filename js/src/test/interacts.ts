import * as widgets from '@jupyter-widgets/base';
import { expect } from 'chai';
import {DummyManager} from './dummy-manager';
import bqplot = require('..');
import {create_model_bqplot, create_figure_scatter, create_figure_bars} from './widget-utils'
import * as d3Timer from 'd3-timer';


// text pixel coordinate
const test_x = 200;
const test_y = 250;
const pixel_red = [255, 0, 0, 255];
const pixel_background = [255, 255, 255, 255];

describe("interacts >", () => {
    beforeEach(async function() {
        this.manager = new DummyManager({bqplot: bqplot});
    });

    it("brush selector basics", async function() {
        let x = {dtype: 'float32', value: new DataView((new Float32Array([0,1])).buffer)};
        let y = {dtype: 'float32', value: new DataView((new Float32Array([2,3])).buffer)};
        let {figure, scatter} = await create_figure_scatter(this.manager, x, y);

        let brush_selector = await create_model_bqplot(this.manager, 'BrushSelector', 'brush_selector_1', {
            'x_scale': figure.model.get('scale_x').toJSON(), 'y_scale': figure.model.get('scale_y').toJSON(),
            'marks': [scatter.model.toJSON()]
        });
        let brush_selector_view = await figure.set_interaction(brush_selector);
        await brush_selector_view.displayed;
        // all the events in figure are async, and we don't have access
        // to the promises, so we manually call these methods
        await brush_selector_view.create_scales()
        await brush_selector_view.mark_views_promise;
        brush_selector_view.relayout()
        brush_selector.set('selected_x', [0.5, 1.5])
        brush_selector.set('selected_y', [2.5, 3.5])
        let indices = scatter.model.get('selected')
        expect([...indices]).to.deep.equal([1]);
        expect(indices).to.be.an.instanceof(Uint32Array)
    });

    it("brush interval selector basics", async function() {
        let x = {dtype: 'float32', value: new DataView((new Float32Array([0,1])).buffer)};
        let y = {dtype: 'float32', value: new DataView((new Float32Array([2,3])).buffer)};
        let {figure, scatter} = await create_figure_scatter(this.manager, x, y);

        let brush_interval_selector = await create_model_bqplot(this.manager, 'BrushIntervalSelector', 'brush_interval_selector_1', {
            'scale': figure.model.get('scale_y').toJSON(), 'orientation': 'vertical',
            'marks': [scatter.model.toJSON()]
        });
        let brush_interval_selector_view = await figure.set_interaction(brush_interval_selector);
        await brush_interval_selector_view.displayed;
        // all the events in figure are async, and we don't have access
        // to the promises, so we manually call these methods
        await brush_interval_selector_view.create_scales()
        await brush_interval_selector_view.mark_views_promise;
        brush_interval_selector_view.relayout()
        brush_interval_selector.set('selected', [2.5, 3.5])
        expect([...scatter.model.get('selected')]).to.deep.equal([1]);
        brush_interval_selector.set('selected', [1.5, 2.5])
        expect([...scatter.model.get('selected')]).to.deep.equal([0]);
    });

    it("brush interval selector on bars", async function() {
        let x = {dtype: 'float32', value: new DataView((new Float32Array([0,1])).buffer)};
        let y = {dtype: 'float32', value: new DataView((new Float32Array([2,3])).buffer)};
        let { figure, bars } = await create_figure_bars(this.manager, x, y);

        let brush_interval_selector = await create_model_bqplot(this.manager, 'BrushIntervalSelector', 'brush_interval_selector_1', {
            'scale': figure.model.get('scale_x').toJSON(), 'orientation': 'horizontal',
            'marks': [bars.model.toJSON()]
        });
        let brush_interval_selector_view = await figure.set_interaction(brush_interval_selector);
        await brush_interval_selector_view.displayed;
        // all the events in figure are async, and we don't have access
        // to the promises, so we manually call these methods
        await brush_interval_selector_view.create_scales()
        await brush_interval_selector_view.mark_views_promise;
        brush_interval_selector_view.relayout()
        d3Timer.timerFlush(); // this makes sure the animations are all executed
        brush_interval_selector.set('selected', [0.9, 1.1])
        expect([...bars.model.get('selected')]).to.deep.equal([1]);
        brush_interval_selector.set('selected', [-0.1, 1.1])
        expect([...bars.model.get('selected')]).to.deep.equal([0, 1]);
        expect(bars.model.get('selected')).to.be.an.instanceof(Uint32Array)
    });


    it("pan/zoom", async function() {
        let x = {dtype: 'float32', value: new DataView((new Float32Array([0.5])).buffer)};
        let y = {dtype: 'float32', value: new DataView((new Float32Array([2.5])).buffer)};
        let {figure, scatter} = await create_figure_scatter(this.manager, x, y);
        // scatter.model.set("default_size", 100*100);
        scatter.model.set('default_size', 100*100);
        scatter.model.set('colors', ['red']);
        scatter.d3el.selectAll(".object_grp").data();

        let panzoom = await create_model_bqplot(this.manager, 'PanZoom', 'panzoom', {
            'scales': {'x': [figure.model.get('scale_x').toJSON()], 'y': [figure.model.get('scale_y').toJSON()]},
        });
        let panzoom_view = await figure.set_interaction(panzoom);
        await panzoom_view.displayed;
        await widgets.resolvePromisesDict(panzoom_view.scale_promises);

        await figure.relayout();
        // we want two cycles to make sure relayout is done (it is using requestAnimationFrame)
        await new Promise(resolve => window.requestAnimationFrame(resolve));
        await new Promise(resolve => window.requestAnimationFrame(resolve));

        // first check if we have a red pixel in the center
        let canvas = await figure.get_rendered_canvas();
        let context = canvas.getContext("2d");
        let pixel = context.getImageData(test_x*window.devicePixelRatio, test_y*window.devicePixelRatio, 1, 1);
        expect(Array.prototype.slice.call(pixel.data)).to.deep.equals(pixel_red);

        // we pan to the right
        panzoom_view._mousedown([0, 0])
        await panzoom_view._mousemove([150, 0]);
        d3Timer.timerFlush();

        // and check if we find a red pixel there as well
        canvas = await figure.get_rendered_canvas();
        context = canvas.getContext("2d");
        pixel = context.getImageData(test_x*window.devicePixelRatio, test_y*window.devicePixelRatio, 1, 1);
        expect(Array.prototype.slice.call(pixel.data)).to.deep.equals(pixel_background);

        pixel = context.getImageData((test_x + 150)*window.devicePixelRatio, test_y*window.devicePixelRatio, 1, 1);
        expect(Array.prototype.slice.call(pixel.data)).to.deep.equals(pixel_red);


        // check zooming
        const scale_x = figure.model.get("scale_x");
        const xmin = scale_x.get('min');
        const xmax = scale_x.get('max');
        await panzoom_view._zoom([test_x + 150, test_y], 10);
        const xmin2 = scale_x.get('min');
        const xmax2 = scale_x.get('max');
        expect(xmin2).to.be.greaterThan(xmin);
        expect(xmax2).to.be.lessThan(xmax);
    });

    it("pan/zoom log", async function() {
        let x = {dtype: 'float32', value: new DataView((new Float32Array([1.])).buffer)};
        let y = {dtype: 'float32', value: new DataView((new Float32Array([1.])).buffer)};
        let {figure, scatter} = await create_figure_scatter(this.manager, x, y, false, true);
        // scatter.model.set("default_size", 100*100);
        scatter.model.set('default_size', 100*100);
        scatter.model.set('colors', ['red']);
        scatter.d3el.selectAll(".object_grp").data();

        let panzoom = await create_model_bqplot(this.manager, 'PanZoom', 'panzoom', {
            'scales': {'x': [figure.model.get('scale_x').toJSON()], 'y': [figure.model.get('scale_y').toJSON()]},
        });
        let panzoom_view = await figure.set_interaction(panzoom);
        await panzoom_view.displayed;
        await widgets.resolvePromisesDict(panzoom_view.scale_promises);

        await figure.relayout();
        // we want two cycles to make sure relayout is done (it is using requestAnimationFrame)
        await new Promise(resolve => window.requestAnimationFrame(resolve));
        await new Promise(resolve => window.requestAnimationFrame(resolve));
        let canvas = await figure.get_rendered_canvas();
        let context = canvas.getContext("2d");
        let pixel = context.getImageData(test_x*window.devicePixelRatio, test_y*window.devicePixelRatio, 1, 1);
        expect(Array.prototype.slice.call(pixel.data)).to.deep.equals(pixel_red);

        // we pan to the right
        panzoom_view._mousedown([0, 0])
        await panzoom_view._mousemove([150, 0]);
        d3Timer.timerFlush();

        // and check if we find a red pixel there as well
        canvas = await figure.get_rendered_canvas();
        context = canvas.getContext("2d");
        pixel = context.getImageData(test_x*window.devicePixelRatio, test_y*window.devicePixelRatio, 1, 1);
        expect(Array.prototype.slice.call(pixel.data)).to.deep.equals(pixel_background);

        pixel = context.getImageData((test_x + 150)*window.devicePixelRatio, test_y*window.devicePixelRatio, 1, 1);
        expect(Array.prototype.slice.call(pixel.data)).to.deep.equals(pixel_red);
    });


});
