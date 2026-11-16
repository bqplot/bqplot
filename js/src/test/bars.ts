import { expect } from 'chai';

import * as d3Timer from 'd3-timer';

import { DummyManager } from './dummy-manager';

import {
  create_figure_bars,
  getFills,
  getStrokes,
  getStrokeWidth,
} from './widget-utils';

import * as bqplot from '..';

describe('bars >', () => {
  beforeEach(async function () {
    this.manager = new DummyManager({ bqplot: bqplot });
  });

  for (const [initialCount, orientation] of [
    [1, 'vertical'],
    [2, 'vertical'],
    [10, 'vertical'],
    [1, 'horizontal'],
  ] as const) {
    it(`updates layout when changing from ${initialCount} bars to four (${orientation})`, async function () {
      const scaleState = { min: null, max: null, allow_padding: true };
      const x = [0.375, 1.125, 1.875, 2.625];
      const y = [1, 1, 1, 1];
      const reference = await create_figure_bars(
        new DummyManager({ bqplot: bqplot }),
        x,
        y,
        scaleState
      );
      const { bars } = await create_figure_bars(
        this.manager,
        Array.from({ length: initialCount }, (_, i) => i + 0.5),
        Array(initialCount).fill(1),
        scaleState
      );
      reference.bars.model.set('orientation', orientation);
      bars.model.set('orientation', orientation);

      bars.model.set({ x: x, y: y });
      d3Timer.timerFlush();

      const geometry = (view) =>
        view.d3el
          .selectAll('.bargroup')
          .nodes()
          .map((group) => ({
            transform: group.getAttribute('transform'),
            width: group.querySelector('rect.bar').getAttribute('width'),
            height: group.querySelector('rect.bar').getAttribute('height'),
          }));
      expect(geometry(bars)).to.deep.equal(geometry(reference.bars));
      expect(bars.scales.x.scale.range()).to.deep.equal(
        reference.bars.scales.x.scale.range()
      );
    });
  }

  it('create 1d', async function () {
    const x = {
      dtype: 'float32',
      value: new DataView(new Float32Array([0, 1]).buffer),
    };
    const y = {
      dtype: 'float32',
      value: new DataView(new Float32Array([2, 3]).buffer),
    };
    const objects = await create_figure_bars(this.manager, x, y);
    const bars = objects.bars;
    const data = bars.d3el.selectAll('.bargroup').data();
    expect(data[0].values[0].x).to.equal(0);
    expect(data[1].values[0].x).to.equal(1);
    expect(data[0].values[0].y).to.equal(2);
    expect(data[1].values[0].y).to.equal(3);

    d3Timer.timerFlush(); // this makes sure the animations are all executed
    const heights = bars.d3el
      .selectAll('.bargroup rect.bar')
      .nodes()
      .map((el) => Number(el.getAttribute('height')));
    const height = objects.figure.height;
    expect(heights).to.deep.equal([(height * 2) / 3, height]);
  });

  it('create 2d classic', async function () {
    const x = [0, 0.5, 1];
    const y = [
      [2, 2.0, 3],
      [2.0, 2.5, 3.5],
    ];
    const objects = await create_figure_bars(this.manager, x, y);
    const bars = objects.bars;
    const data = bars.d3el.selectAll('.bargroup').data();
    expect(data).to.have.lengthOf(3);
    expect(data[0].values[0].x).to.equal(0);
    expect(data[0].values[0].y).to.equal(2);
    expect(data[0].values[1].x).to.equal(0);
    expect(data[0].values[1].y).to.equal(2);
    expect(data[0].values).to.have.lengthOf(2);

    expect(data[1].values[0].x).to.equal(0.5);
    expect(data[1].values[0].y).to.equal(2);
    expect(data[1].values[1].x).to.equal(0.5);
    expect(data[1].values[1].y).to.equal(2.5);
    expect(data[1].values).to.have.lengthOf(2);

    expect(data[2].values[0].x).to.equal(1);
    expect(data[2].values[0].y).to.equal(3);
    expect(data[2].values[1].x).to.equal(1);
    expect(data[2].values[1].y).to.equal(3.5);
    expect(data[2].values).to.have.lengthOf(2);

    d3Timer.timerFlush(); // this makes sure the animations are all executed
    const heights = bars.d3el
      .selectAll('.bargroup rect.bar')
      .nodes()
      .map((el) => Math.round(Number(el.getAttribute('height'))));
    const height = objects.figure.height;
    const h0 = Math.round((height * 2) / 3);
    const h2 = Math.round(height);
    const h3 = Math.round((height * 2.5) / 3);
    const h4 = Math.round((height * 3.5) / 3);
    expect(heights).to.deep.equal([h0, h0, h0, h3, h2, h4]);
  });

  it('create 2d binary', async function () {
    const x = {
      dtype: 'float32',
      value: new DataView(new Float32Array([0, 0.5, 1]).buffer),
      shape: [3],
    };
    const y = {
      dtype: 'float32',
      value: new DataView(new Float32Array([2, 2.0, 3, 2.0, 2.5, 3.5]).buffer),
      shape: [2, 3],
    };
    const objects = await create_figure_bars(this.manager, x, y);
    const bars = objects.bars;
    const data = bars.d3el.selectAll('.bargroup').data();
    expect(data).to.have.lengthOf(3);
    expect(data[0].values[0].x).to.equal(0);
    expect(data[0].values[0].y).to.equal(2);
    expect(data[0].values[1].x).to.equal(0);
    expect(data[0].values[1].y).to.equal(2);
    expect(data[0].values).to.have.lengthOf(2);

    expect(data[1].values[0].x).to.equal(0.5);
    expect(data[1].values[0].y).to.equal(2);
    expect(data[1].values[1].x).to.equal(0.5);
    expect(data[1].values[1].y).to.equal(2.5);
    expect(data[1].values).to.have.lengthOf(2);

    expect(data[2].values[0].x).to.equal(1);
    expect(data[2].values[0].y).to.equal(3);
    expect(data[2].values[1].x).to.equal(1);
    expect(data[2].values[1].y).to.equal(3.5);
    expect(data[2].values).to.have.lengthOf(2);

    d3Timer.timerFlush(); // this makes sure the animations are all executed
    const heights = bars.d3el
      .selectAll('.bargroup rect.bar')
      .nodes()
      .map((el) => Math.round(Number(el.getAttribute('height'))));
    const height = objects.figure.height;
    const h0 = Math.round((height * 2) / 3);
    const h2 = Math.round(height);
    const h3 = Math.round((height * 2.5) / 3);
    const h4 = Math.round((height * 3.5) / 3);
    expect(heights).to.deep.equal([h0, h0, h0, h3, h2, h4]);
  });

  it('selected', async function () {
    const x = [0, 1, 2, 3, 5, 6];
    const y = [2, 3, 4, 5, 1, 2];
    const objects = await create_figure_bars(this.manager, x, y);

    const bars = objects.bars;
    const rects = bars.d3el.selectAll('.bargroup').selectAll('.bar');

    bars.model.set('selected_style', { fill: 'orange' });
    bars.model.set('unselected_style', { fill: 'red' });

    // Default color, no selection
    expect(getFills(rects)).to.eql([
      'steelblue',
      'steelblue',
      'steelblue',
      'steelblue',
      'steelblue',
      'steelblue',
    ]);

    // Simulate selection from back-end
    bars.model.set('selected', [0, 3]);
    expect(getFills(rects)).to.eql([
      'orange',
      'red',
      'red',
      'orange',
      'red',
      'red',
    ]);

    bars.model.set('selected', [4, 5]);
    expect(getFills(rects)).to.eql([
      'red',
      'red',
      'red',
      'red',
      'orange',
      'orange',
    ]);

    bars.model.set('selected_style', { fill: 'green' });
    expect(getFills(rects)).to.eql([
      'red',
      'red',
      'red',
      'red',
      'green',
      'green',
    ]);

    bars.model.set('unselected_style', { fill: 'black' });
    expect(getFills(rects)).to.eql([
      'black',
      'black',
      'black',
      'black',
      'green',
      'green',
    ]);

    bars.model.set('selected_style', {});
    expect(getFills(rects)).to.eql([
      'black',
      'black',
      'black',
      'black',
      'steelblue',
      'steelblue',
    ]);

    bars.model.set('selected', null);
    expect(getFills(rects)).to.eql([
      'steelblue',
      'steelblue',
      'steelblue',
      'steelblue',
      'steelblue',
      'steelblue',
    ]);
  });

  it('styles', async function () {
    const x = [0, 1, 2, 3, 5, 6];
    const y = [2, 3, 4, 5, 1, 2];
    const objects = await create_figure_bars(this.manager, x, y);

    const bars = objects.bars;
    const rects = bars.d3el.selectAll('.bargroup').selectAll('.bar');

    bars.model.set('fill', false);

    // No fill
    expect(getFills(rects)).to.eql([
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
    ]);
    expect(getStrokes(rects)).to.eql([
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
    ]);
    expect(getStrokeWidth(rects)).to.eql(['1', '1', '1', '1', '1', '1']);

    bars.model.set('stroke', 'red');
    expect(getStrokes(rects)).to.eql([
      'red',
      'red',
      'red',
      'red',
      'red',
      'red',
    ]);
    expect(getStrokeWidth(rects)).to.eql(['1', '1', '1', '1', '1', '1']);

    bars.model.set('stroke_width', 3);
    expect(getStrokes(rects)).to.eql([
      'red',
      'red',
      'red',
      'red',
      'red',
      'red',
    ]);
    expect(getStrokeWidth(rects)).to.eql(['3', '3', '3', '3', '3', '3']);
  });
});
