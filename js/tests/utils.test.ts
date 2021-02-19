import { deepCopy, convert_dates } from '../src/utils';


describe("Utils", () => {

    test("convert dates", async () => {
        let dates = ['2005-02-25', '2005-02-26', '2005-02-27'].map((x) => new Date(x));
        let numbers = [1109289600000, 1109376000000, 1109462400000];
        expect(Array.from(convert_dates(dates))).toEqual(numbers);
        expect([Array.from(convert_dates([dates])[0])]).toEqual([numbers]);
        expect(Array.from(convert_dates(numbers))).toEqual(numbers);
        expect(Array.from(convert_dates([numbers, numbers]))).toEqual([numbers, numbers]);
    });

    test("deepCopy", () => {
        var ar = new Float64Array([0, 0.5]);
        expect(Array.from(deepCopy(ar))).toEqual(Array.from(ar));
        expect(Array.from(deepCopy([ar])[0])).toEqual(Array.from(ar));
        expect(Array.from(deepCopy({ar:ar}).ar)).toEqual(Array.from(ar));
    })

});
