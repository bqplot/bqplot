import { expect } from 'chai';
import {DummyManager} from './dummy-manager';
import bqplot = require('..');
import {create_model_bqplot, create_figure_scatter} from './widget-utils'


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
        expect(scatter.model.get('selected')).to.deep.equal([1]);
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
        expect(scatter.model.get('selected')).to.deep.equal([1]);
        brush_interval_selector.set('selected', [1.5, 2.5])
        expect(scatter.model.get('selected')).to.deep.equal([0]);
    });

});
