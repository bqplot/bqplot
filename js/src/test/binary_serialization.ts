import { array_or_json } from "../serialize";
import { expect } from 'chai';
// import {DummyManager} from './dummy-manager';
// import bqplot = require('..');
// import {Figure} from '../src/Figure.js';
// import {FigureModel} from '../src/FigureModel.js';
// import {create_model, create_model_bqplot, create_view, create_figure_scatter} from './widget-utils'
// import * as d3 from 'd3';


describe("binary serialization >", () => {
    beforeEach(async function() {
    });

    it("arrays", async function() {
        let x_wire = {dtype: 'float32', value: new DataView((new Float32Array([0,0.5,1])).buffer)}
        let x_ar = array_or_json.deserialize(x_wire, null);
        let x =  Array.prototype.slice.call(x_ar);
        expect(x).to.deep.equal([0, 0.5, 1.0])
        let x_wire_bytes = Array.prototype.slice.call(new Uint8Array(x_wire.value.buffer))

        let x_ar2 = new Float32Array([0, 0.5, 1.])
        let x_wire2 = array_or_json.serialize(x_ar2, null);
        let x_wire2_bytes = Array.prototype.slice.call(new Uint8Array(x_wire2.value.buffer))
        expect(x_wire_bytes).to.deep.equal(x_wire2_bytes)
    });

    it("date arrays", async function() {
        // 2005-02-25 and 2 days after:
        let x_wire = {dtype: 'float64', value: new DataView((new Float64Array([1109289600000, 1109376000000, 1109462400000])).buffer), type: 'date'}
        let x_ar = array_or_json.deserialize(x_wire, null);
        expect(x_ar.type).to.equal('date')
        let x =  Array.prototype.slice.call(x_ar);
        expect(x).to.deep.equal([1109289600000, 1109376000000, 1109462400000])
        let x_wire_bytes = Array.prototype.slice.call(new Uint8Array(x_wire.value.buffer))


        let x_ar2 :any = new Float64Array(['2005-02-25', '2005-02-26', '2005-02-27'].map((x) => Number(new Date(x))))
        x_ar2.type = 'date'
        let x_wire2 = array_or_json.serialize(x_ar2, null);
        let x_wire2_bytes = Array.prototype.slice.call(new Uint8Array(x_wire2.value.buffer))
        expect(x_wire_bytes).to.deep.equal(x_wire2_bytes)
        expect(x_wire2.dtype).to.equal('float64')
        expect(x_wire2.type).to.equal('date')
    });
});
