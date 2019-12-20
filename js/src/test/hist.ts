// import * as d3Timer from 'd3-timer';

import {
    expect
} from 'chai';

import {
    DummyManager
} from './dummy-manager';

import {
    create_figure_hist, getFills
} from './widget-utils';

import * as bqplot from '..';


describe("hist >", () => {

    beforeEach(async function() {
        this.manager = new DummyManager({bqplot: bqplot});
    });

    it("colors", async function() {
        const sample = {dtype: 'float32', value: new DataView((new Float32Array(new Array(100).keys()).buffer))};
        const objects = await create_figure_hist(this.manager, sample, 3);

        const hist = objects.hist;
        let rects = hist.d3el.selectAll(".bargroup").selectAll(".rect");

        // Default color
        let colors = getFills(rects);
        expect(colors[0]).to.equal('steelblue');
        expect(colors[1]).to.equal('steelblue');
        expect(colors[2]).to.equal('steelblue');

        // Update colors
        hist.model.set('colors', ['steelblue', 'red', 'green']);
        colors = getFills(rects);
        expect(colors[0]).to.equal('steelblue');
        expect(colors[1]).to.equal('red');
        expect(colors[2]).to.equal('green');

        // Colors should cycle
        hist.model.set('bins', 6);
        rects = hist.d3el.selectAll(".bargroup").selectAll(".rect");
        colors = getFills(rects);
        expect(colors[0]).to.equal('steelblue');
        expect(colors[1]).to.equal('red');
        expect(colors[2]).to.equal('green');
        expect(colors[3]).to.equal('steelblue');
        expect(colors[4]).to.equal('red');
        expect(colors[5]).to.equal('green');
    });

    it("selected", async function() {
        const sample = {dtype: 'float32', value: new DataView((new Float32Array(new Array(100).keys()).buffer))};
        const objects = await create_figure_hist(this.manager, sample, 6);

        const hist = objects.hist;
        let rects = hist.d3el.selectAll(".bargroup").selectAll(".rect");

        hist.model.set('selected_style', {'fill': 'orange'});
        hist.model.set('unselected_style', {'fill': 'red'});

        // Default color, no selection
        let colors = getFills(rects);
        expect(colors[0]).to.equal('steelblue');
        expect(colors[1]).to.equal('steelblue');
        expect(colors[2]).to.equal('steelblue');
        expect(colors[3]).to.equal('steelblue');
        expect(colors[4]).to.equal('steelblue');
        expect(colors[5]).to.equal('steelblue');

        // Simulate selection of the first bar from back-end
        hist.model.set('selected', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        colors = getFills(rects);
        expect(colors[0]).to.equal('orange');
        expect(colors[1]).to.equal('red');
        expect(colors[2]).to.equal('red');
        expect(colors[3]).to.equal('red');
        expect(colors[4]).to.equal('red');
        expect(colors[5]).to.equal('red');

        // Simulate selection of both the first and the second bar from back-end
        // (there is no current way of visually showing the selection of a subset of the data in a bin)
        hist.model.set('selected', [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
        colors = getFills(rects);
        expect(colors[0]).to.equal('orange');
        expect(colors[1]).to.equal('orange');
        expect(colors[2]).to.equal('red');
        expect(colors[3]).to.equal('red');
        expect(colors[4]).to.equal('red');
        expect(colors[5]).to.equal('red');
    });

});
