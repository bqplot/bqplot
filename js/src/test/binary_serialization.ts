import { array_or_json } from "../serialize";
import { expect } from 'chai';


describe("binary serialization >", () => {
    beforeEach(async function() {
    });

    it("deserialize/serialize number arrays", async function() {
        const x = {dtype: 'float32', value: new DataView((new Float32Array([0, 0.5, 1])).buffer), shape: [3], type: null};
        const deserialized_x = array_or_json.deserialize(x, null);
        expect([...deserialized_x]).to.deep.equal([0, 0.5, 1.0]);

        const serialized_x = array_or_json.serialize(deserialized_x, null);
        expect(serialized_x).to.deep.equal(x);
    });

    it("deserialize/serialize date arrays", async function() {
        // 2005-02-25 and 2 days after:
        const x = {dtype: 'float64', value: new DataView((new Float64Array([1109289600000, 1109376000000, 1109462400000])).buffer), shape: [3], type: 'date'};
        const deserialized_x = array_or_json.deserialize(x, null);
        expect(deserialized_x.type).to.equal('date');
        expect([...deserialized_x]).to.deep.equal([1109289600000, 1109376000000, 1109462400000]);

        const serialized_x = array_or_json.serialize(deserialized_x, null);
        expect(serialized_x).to.deep.equal(x);
    });

    it("deserialize/serialize string arrays", async function() {
        // String arrays are not sent using binary buffers from the Python side
        const strlist = ['H', 'E', 'L', 'L', 'O'];
        const deserialized_strlist = array_or_json.deserialize(strlist, null);
        expect(deserialized_strlist).to.deep.equal(strlist);

        const serialized_strlist = array_or_json.serialize(deserialized_strlist, null);
        expect(serialized_strlist).to.deep.equal(strlist);
    });

    it("deserialize/serialize nested arrays", async function() {
        const x = [
            {dtype: 'float32', value: new DataView((new Float32Array([0, 0.5, 1])).buffer), shape: [3], type: null},
            {dtype: 'float32', value: new DataView((new Float32Array([0, 0.5])).buffer), shape: [2], type: null},
            {dtype: 'float32', value: new DataView((new Float32Array([0, 0.5, 2, 3])).buffer), shape: [4], type: null},
        ];
        const deserialized_x = array_or_json.deserialize(x, null);
        expect(deserialized_x.length).to.equal(3);
        expect([...deserialized_x[0]]).to.deep.equal([0, 0.5, 1.0]);
        expect([...deserialized_x[1]]).to.deep.equal([0, 0.5]);
        expect([...deserialized_x[2]]).to.deep.equal([0, 0.5, 2., 3.]);

        const serialized_x = array_or_json.serialize(deserialized_x, null);
        expect(serialized_x).to.deep.equal(x);
    });
});
