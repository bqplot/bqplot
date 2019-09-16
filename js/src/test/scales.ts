import { expect } from 'chai';
import {DummyManager} from './dummy-manager';
import bqplot = require('..');
import {create_model_bqplot} from './widget-utils'

describe("scales >", () => {
    beforeEach(async function() {
        this.manager = new DummyManager({bqplot: bqplot});
    });
    it("linear", async function() {
        var scale = await create_model_bqplot(this.manager, 'LinearScale', 'scale1', {min: 0, max:1})
        expect(scale).to.be.not.undefined;
    });
});
