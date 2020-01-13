import * as d3Timer from 'd3-timer';
import * as d3Color from 'd3-color';

import {
    expect
} from 'chai';

import * as bqplot from '..';

import {
    DummyManager
} from './dummy-manager';

import {
    create_figure_pie
} from './widget-utils'



describe("pie >", () => {

    beforeEach(async function() {
        this.manager = new DummyManager({bqplot: bqplot});
    });

    it("create", async function() {
        const sizes = {dtype: 'float32', value: new DataView((new Float32Array([0, 1, 4])).buffer)};
        const objects = await create_figure_pie(this.manager, sizes, ['foo', 'bar', 'baz']);
        const pie = objects.pie;

        d3Timer.timerFlush();

        const slices = pie.d3el.selectAll(".slice");
        const labels = pie.d3el.selectAll(".labels").selectAll('text');

        // Check slice values
        const data = slices.data();
        expect(data[0].value).to.equal(0);
        expect(data[1].value).to.equal(1);
        expect(data[2].value).to.equal(4);

        // Check slice colors
        const sliceElts = slices.nodes();
        expect(sliceElts[0].style.fill).to.equal(d3Color.rgb('#1f77b4').toString());
        expect(sliceElts[1].style.fill).to.equal(d3Color.rgb('#ff7f0e').toString());
        expect(sliceElts[2].style.fill).to.equal(d3Color.rgb('#2ca02c').toString());

        // Check labels
        const labelElts = labels.nodes();
        expect(labelElts[0].innerHTML).to.equal('foo');
        expect(parseFloat(labelElts[0].style.opacity)).to.equal(0);
        expect(labelElts[1].innerHTML).to.equal('bar');
        expect(parseFloat(labelElts[1].style.opacity)).to.equal(1);
        expect(labelElts[2].innerHTML).to.equal('baz');
        expect(parseFloat(labelElts[2].style.opacity)).to.equal(1);
    });

    it("update colors", async function() {
        const sizes = {dtype: 'float32', value: new DataView((new Float32Array([1, 3, 4, 5])).buffer)};
        const objects = await create_figure_pie(this.manager, sizes, ['foo', 'bar', 'baz', 'Hello World']);
        const pie = objects.pie;

        d3Timer.timerFlush();

        const slices = pie.d3el.selectAll(".slice");

        // Check slice colors
        const sliceElts = slices.nodes();
        expect(sliceElts[0].style.fill).to.equal(d3Color.rgb('#1f77b4').toString());
        expect(sliceElts[1].style.fill).to.equal(d3Color.rgb('#ff7f0e').toString());
        expect(sliceElts[2].style.fill).to.equal(d3Color.rgb('#2ca02c').toString());
        expect(sliceElts[3].style.fill).to.equal(d3Color.rgb('#d62728').toString());

        // Update slice colors
        pie.model.set('colors', ['red', 'blue', 'green', 'steelblue']);
        d3Timer.timerFlush();

        expect(sliceElts[0].style.fill).to.equal('red');
        expect(sliceElts[1].style.fill).to.equal('blue');
        expect(sliceElts[2].style.fill).to.equal('green');
        expect(sliceElts[3].style.fill).to.equal('steelblue');

        // Update slice colors
        pie.model.set('colors', ['red', 'blue']);
        d3Timer.timerFlush();

        expect(sliceElts[0].style.fill).to.equal('red');
        expect(sliceElts[1].style.fill).to.equal('blue');
        expect(sliceElts[2].style.fill).to.equal('red');
        expect(sliceElts[3].style.fill).to.equal('blue');
    });

    it("update text", async function() {
        const sizes = {dtype: 'float32', value: new DataView((new Float32Array([1, 0, 4, 5])).buffer)};
        const objects = await create_figure_pie(this.manager, sizes, ['foo', 'bar', 'baz', 'Hello World']);
        const pie = objects.pie;

        d3Timer.timerFlush();

        let labels = pie.d3el.selectAll(".labels").selectAll('text');

        // Check labels
        let labelElts = labels.nodes();
        expect(labelElts[0].innerHTML).to.equal('foo');
        expect(parseFloat(labelElts[0].style.opacity)).to.equal(1);
        expect(labelElts[1].innerHTML).to.equal('bar');
        expect(parseFloat(labelElts[1].style.opacity)).to.equal(0);
        expect(labelElts[2].innerHTML).to.equal('baz');
        expect(parseFloat(labelElts[2].style.opacity)).to.equal(1);
        expect(labelElts[3].innerHTML).to.equal('Hello World');
        expect(parseFloat(labelElts[3].style.opacity)).to.equal(1);

        // Update pie data
        pie.model.set('sizes', [1, 2, 0, 5, 6]);
        pie.model.set('labels', ['hey', 'there', 'how', 'are', 'you']);

        d3Timer.timerFlush();

        labels = pie.d3el.selectAll(".labels").selectAll('text');

        // Check labels
        labelElts = labels.nodes();
        expect(labelElts[0].innerHTML).to.equal('hey');
        expect(parseFloat(labelElts[0].style.opacity)).to.equal(1);
        expect(labelElts[1].innerHTML).to.equal('there');
        expect(parseFloat(labelElts[1].style.opacity)).to.equal(1);
        expect(labelElts[2].innerHTML).to.equal('how');
        expect(parseFloat(labelElts[2].style.opacity)).to.equal(0);
        expect(labelElts[3].innerHTML).to.equal('are');
        expect(parseFloat(labelElts[3].style.opacity)).to.equal(1);
        expect(labelElts[4].innerHTML).to.equal('you');
        expect(parseFloat(labelElts[4].style.opacity)).to.equal(1);
    });

});
