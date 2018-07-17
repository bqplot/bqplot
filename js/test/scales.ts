import { LinearScaleModel } from "../src/LinearScaleModel.js";
import { LinearScale } from "../src/LinearScale.js";
import { expect } from 'chai';
import {DummyManager} from './dummy-manager';
import bqplot = require('..');

describe("scales >", () => {
    beforeEach(async function() {
        this.manager = new DummyManager({bqplot: bqplot});
    });

    var makeLinearScale = async function(args) {
        const modelId = 'u-u-i-d';
        var view = await this.manager.new_widget({
            model_module: 'bqplot',
            model_name: 'LinearScaleModel',
            model_module_version : '*',
            view_module: 'bqplot',
            view_name: 'LinearScale',
            view_module_version: '*',
            model_id: modelId,
        }, args );
        //this.sheet.state_change = Promise.resolve(); // bug in ipywidgets?
        //this.sheet.views = {}
        return view
    }
    it("linear", async function() {
        var scale = await makeLinearScale.call(this, {})
        expect(scale).to.be.not.undefined;
    });
});