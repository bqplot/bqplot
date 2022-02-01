import { expect } from 'chai';

import { DummyManager } from './dummy-manager';

import * as bqplot from '..';

import { create_figure_scatter, getFills } from './widget-utils';

import * as d3Timer from 'd3-timer';

describe('scatter >', () => {
  beforeEach(async function () {
    this.manager = new DummyManager({ bqplot: bqplot });
  });

  it('create', async function () {
    const x = {
      dtype: 'float32',
      value: new DataView(new Float32Array([0, 1]).buffer),
    };
    const y = {
      dtype: 'float32',
      value: new DataView(new Float32Array([2, 3]).buffer),
    };
    const objects = await create_figure_scatter(this.manager, x, y);
    const scatter = objects.scatter;
    const data = scatter.d3el.selectAll('.object_grp').data();
    expect(data[0].x).to.equal(0);
    expect(data[1].x).to.equal(1);
    expect(data[0].y).to.equal(2);
    expect(data[1].y).to.equal(3);

    d3Timer.timerFlush(); // this makes sure the animations are all executed
    const transforms = scatter.d3el
      .selectAll('.object_grp')
      .nodes()
      .map((el) => el.getAttribute('transform'));
    const width = objects.figure.width;
    const height = objects.figure.height;
    expect(transforms).to.deep.equal([
      `translate(0, ${height})`,
      `translate(${width}, 0)`,
    ]);
  });

  it('computed fill', async function () {
    const x = [0, 1];
    const y = [2, 3];
    const objects = await create_figure_scatter(this.manager, x, y);
    const scatter = objects.scatter;

    const elements = scatter.d3el.selectAll('.object_grp .element');
    expect(getFills(elements)).to.deep.equal(['steelblue', 'steelblue']);

    scatter.model.set('unselected_style', { fill: 'orange', stroke: 'none' });
    scatter.model.set('selected', [0]);
    expect(getFills(elements)).to.deep.equal(['steelblue', 'orange']);

    scatter.model.set('colors', ['red']);
    expect(getFills(elements)).to.deep.equal(['red', 'orange']);

    scatter.model.set('selected_style', { fill: 'green', stroke: 'none' });
    scatter.model.set('selected', [0]);
    expect(getFills(elements)).to.deep.equal(['green', 'orange']);

    scatter.model.set('selected', [1]);
    expect(getFills(elements)).to.deep.equal(['orange', 'green']);

    scatter.model.set('unselected_style', {});
    expect(getFills(elements)).to.deep.equal(['red', 'green']);

    scatter.model.set('colors', []);
    expect(getFills(elements)).to.deep.equal(['', 'green']);

    scatter.model.set('selected_style', {});
    expect(getFills(elements)).to.deep.equal(['', '']);
  });
});
