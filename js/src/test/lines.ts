import { expect } from 'chai';
import { DummyManager } from './dummy-manager';
import bqplot = require('..');
import { create_model_bqplot, create_figure_lines } from './widget-utils';
import * as d3Timer from 'd3-timer';

describe('lines >', () => {
  beforeEach(async function () {
    this.manager = new DummyManager({ bqplot: bqplot });
  });

  it('model mark set methods', async function () {
    const x = {
      dtype: 'float32',
      value: new DataView(new Float32Array([0, 1]).buffer),
    };
    const y = {
      dtype: 'float32',
      value: new DataView(new Float32Array([2, 3]).buffer),
    };
    const objects = await create_figure_lines(this.manager, x, y);
    const lines = objects.lines;
    lines.model.set('marker_size', 7);
    lines.model.set('marker', 'circle');
    lines.model.set('stroke_width', 3);
    lines.model.set('labels_visibility', 'label');
    lines.model.set('curves_subset', [2, 4, 5]);
    lines.model.set('line_style', 'solid');
  });

  it('create 1d ordinal', async function () {
    const x = ['a', 'b'];
    const scale_x = await create_model_bqplot(
      this.manager,
      'OrdinalScale',
      'scale_x_ordinal',
      { allow_padding: false, domain: [] }
    );
    const y = {
      dtype: 'float32',
      value: new DataView(new Float32Array([2, 3]).buffer),
    };
    const objects = await create_figure_lines(this.manager, x, y, {
      x: scale_x.toJSON(),
    });
    const lines = objects.lines;
    const data = lines.d3el.selectAll('.curve').data();
    expect(data[0].values[0].x).to.equal('a');
    expect(data[0].values[1].x).to.equal('b');
    expect(data[0].values[0].y).to.equal(2);
    expect(data[0].values[1].y).to.equal(3);

    lines.update_line_xy();
    d3Timer.timerFlush(); // this makes sure the animations are all executed
    const paths = lines.d3el
      .selectAll('.curve path.line')
      .nodes()
      .map((el) => el.getAttribute('d'));
    const width = objects.figure.plotarea_width;
    const height = objects.figure.plotarea_height;
    expect(paths).to.deep.equal([
      `M${(width * 1) / 4},${height}L${(width * 3) / 4},0`,
    ]);
  });

  it('create 1d', async function () {
    const x = {
      dtype: 'float32',
      value: new DataView(new Float32Array([0, 1]).buffer),
    };
    const y = {
      dtype: 'float32',
      value: new DataView(new Float32Array([2, 3]).buffer),
    };
    const objects = await create_figure_lines(this.manager, x, y);
    const lines = objects.lines;
    const data = lines.d3el.selectAll('.curve').data();
    expect(data[0].values[0].x).to.equal(0);
    expect(data[0].values[1].x).to.equal(1);
    expect(data[0].values[0].y).to.equal(2);
    expect(data[0].values[1].y).to.equal(3);

    lines.update_line_xy();
    d3Timer.timerFlush(); // this makes sure the animations are all executed
    const paths = lines.d3el
      .selectAll('.curve path.line')
      .nodes()
      .map((el) => el.getAttribute('d'));
    const width = objects.figure.plotarea_width;
    const height = objects.figure.plotarea_height;
    expect(paths).to.deep.equal([`M0,${height}L${width},0`]);
  });

  it('create 2d classic', async function () {
    const x = [
      [0, 0.5, 1],
      [0.5, 0.5, 1],
    ];
    const y = [
      [2, 2.0, 3],
      [2.0, 2.5, 3],
    ];
    const objects = await create_figure_lines(this.manager, x, y);
    const lines = objects.lines;
    const data = lines.d3el.selectAll('.curve').data();
    expect(data[0].values[0].x).to.equal(0);
    expect(data[0].values[1].x).to.equal(0.5);
    expect(data[0].values[2].x).to.equal(1);
    expect(data[0].values[0].y).to.equal(2);
    expect(data[0].values[1].y).to.equal(2);
    expect(data[0].values[2].y).to.equal(3);
    expect(data[0].values).to.have.lengthOf(3);

    expect(data[1].values[0].x).to.equal(0.5);
    expect(data[1].values[1].x).to.equal(0.5);
    expect(data[1].values[2].x).to.equal(1);
    expect(data[1].values[0].y).to.equal(2.0);
    expect(data[1].values[1].y).to.equal(2.5);
    expect(data[1].values[2].y).to.equal(3);
    expect(data[1].values).to.have.lengthOf(3);

    lines.update_line_xy();
    d3Timer.timerFlush(); // this makes sure the animations are all executed
    const paths = lines.d3el
      .selectAll('.curve path.line')
      .nodes()
      .map((el) => el.getAttribute('d'));
    const width = objects.figure.plotarea_width;
    const height = objects.figure.plotarea_height;
    expect(paths).to.deep.equal([
      `M0,${height}L${width / 2},${height}L${width},0`,
      `M${width / 2},${height}L${width / 2},${height / 2}L${width},0`,
    ]);
  });

  it('create 2d binary', async function () {
    const x = {
      dtype: 'float32',
      value: new DataView(
        new Float32Array([0.0, 0.5, 1.0, 0.5, 0.5, 1.0]).buffer
      ),
      shape: [2, 3],
    };
    const y = {
      dtype: 'float32',
      value: new DataView(
        new Float32Array([2.0, 2.0, 3.0, 2.0, 2.5, 3.0]).buffer
      ),
      shape: [2, 3],
    };
    const objects = await create_figure_lines(this.manager, x, y);
    const lines = objects.lines;
    const data = lines.d3el.selectAll('.curve').data();
    expect(data[0].values[0].x).to.equal(0);
    expect(data[0].values[1].x).to.equal(0.5);
    expect(data[0].values[2].x).to.equal(1);
    expect(data[0].values[0].y).to.equal(2);
    expect(data[0].values[1].y).to.equal(2);
    expect(data[0].values[2].y).to.equal(3);
    expect(data[0].values).to.have.lengthOf(3);

    expect(data[1].values[0].x).to.equal(0.5);
    expect(data[1].values[1].x).to.equal(0.5);
    expect(data[1].values[2].x).to.equal(1);
    expect(data[1].values[0].y).to.equal(2.0);
    expect(data[1].values[1].y).to.equal(2.5);
    expect(data[1].values[2].y).to.equal(3);
    expect(data[1].values).to.have.lengthOf(3);

    lines.update_line_xy();
    d3Timer.timerFlush(); // this makes sure the animations are all executed
    const paths = lines.d3el
      .selectAll('.curve path.line')
      .nodes()
      .map((el) => el.getAttribute('d'));
    const width = objects.figure.plotarea_width;
    const height = objects.figure.plotarea_height;
    expect(paths).to.deep.equal([
      `M0,${height}L${width / 2},${height}L${width},0`,
      `M${width / 2},${height}L${width / 2},${height / 2}L${width},0`,
    ]);
  });

  it('create 2d binary shared x', async function () {
    const x = {
      dtype: 'float32',
      value: new DataView(new Float32Array([0.0, 0.5, 1.0]).buffer),
      shape: [3],
    };
    const y = {
      dtype: 'float32',
      value: new DataView(
        new Float32Array([2.0, 2.0, 3.0, 2.0, 2.5, 3.0]).buffer
      ),
      shape: [2, 3],
    };
    const objects = await create_figure_lines(this.manager, x, y);
    const lines = objects.lines;
    const data = lines.d3el.selectAll('.curve').data();
    expect(data[0].values[0].x).to.equal(0);
    expect(data[0].values[1].x).to.equal(0.5);
    expect(data[0].values[2].x).to.equal(1);
    expect(data[0].values[0].y).to.equal(2);
    expect(data[0].values[1].y).to.equal(2);
    expect(data[0].values[2].y).to.equal(3);
    expect(data[0].values).to.have.lengthOf(3);

    expect(data[1].values[0].x).to.equal(0.0);
    expect(data[1].values[1].x).to.equal(0.5);
    expect(data[1].values[2].x).to.equal(1);
    expect(data[1].values[0].y).to.equal(2.0);
    expect(data[1].values[1].y).to.equal(2.5);
    expect(data[1].values[2].y).to.equal(3);
    expect(data[1].values).to.have.lengthOf(3);

    lines.update_line_xy();
    d3Timer.timerFlush(); // this makes sure the animations are all executed
    const paths = lines.d3el
      .selectAll('.curve path.line')
      .nodes()
      .map((el) => el.getAttribute('d'));
    const width = objects.figure.plotarea_width;
    const height = objects.figure.plotarea_height;

    expect(paths).to.deep.equal([
      `M0,${height}L${width / 2},${height}L${width},0`,
      `M0,${height}L${width / 2},${height / 2}L${width},0`,
    ]);
  });
});
