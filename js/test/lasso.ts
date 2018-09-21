import { points_in_lasso } from "../src/selector_utils";
import { expect } from 'chai';
// import {DummyManager} from './dummy-manager';
// import bqplot = require('..');
// import {Figure} from '../src/Figure.js';
// import {FigureModel} from '../src/FigureModel.js';
// import {create_model, create_model_bqplot, create_view, create_figure_scatter} from './widget-utils'
// import * as d3 from 'd3';


describe("points_in_lasso >", () => {
    beforeEach(async function() {
    });

    it.only("points_in_lasso", async function() {
        let vx = new Float64Array([0, 1, 0]);
        let vy = new Float64Array([0, 0, 1]);
        let x  = new Float64Array([0.25, 0.7, 0.1]);
        let y  = new Float64Array([0.25, 0.5, 0.25]);
        let {mask, indices} = points_in_lasso(vx, vy, x, y);
        expect(Array.prototype.slice.call(mask)).to.deep.equal([1, 0, 1], 'mask test')
        expect(Array.prototype.slice.call(indices)).to.deep.equal([0, 2], 'indices test')
    });

});
