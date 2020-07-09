import { expect } from 'chai';
import {deepCopy, convert_dates} from '../utils';


describe("utils >", () => {
    it("convert dates", async function() {
        let dates = ['2005-02-25', '2005-02-26', '2005-02-27'].map((x) => new Date(x));
        let numbers = [1109289600000, 1109376000000, 1109462400000];
        expect(Array.from(convert_dates(dates))).to.deep.equal(numbers);
        expect([Array.from(convert_dates([dates])[0])]).to.deep.equal([numbers]);
        expect(Array.from(convert_dates(numbers))).to.deep.equal(numbers);
        expect(Array.from(convert_dates([numbers, numbers]))).to.deep.equal([numbers, numbers]);
    });

    it("deepCopy", function() {
        var ar = new Float64Array([0, 0.5]);
        expect(Array.from(deepCopy(ar))).to.deep.equal(Array.from(ar));
        expect(Array.from(deepCopy([ar])[0])).to.deep.equal(Array.from(ar));
        expect(Array.from(deepCopy({ar:ar}).ar)).to.deep.equal(Array.from(ar));
    })
});
