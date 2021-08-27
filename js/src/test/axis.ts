import { expect } from 'chai';
import { DummyManager } from './dummy-manager';
import * as bqplot from '..';
import { create_figure_scatter, create_model_bqplot } from './widget-utils';
// import * as d3Timer from 'd3-timer';

// text pixel coordinate
// const test_x = 200;
// const test_y = 200;
// const pixel_red = [255, 0, 0, 255];

describe('axis >', () => {
  beforeEach(async function () {
    this.manager = new DummyManager({ bqplot: bqplot });
  });

  it('axis add/remove', async function () {
    const x = {
      dtype: 'float32',
      value: new DataView(new Float32Array([0.5, 0.5]).buffer),
    };
    const y = {
      dtype: 'float32',
      value: new DataView(new Float32Array([2.0, 2.5]).buffer),
    };
    const { figure, scatter } = await create_figure_scatter(
      this.manager,
      x,
      y,
      false,
      true
    );
    const scale_x = scatter.model.get('scales').x;
    const x_axis = await create_model_bqplot(
      this.manager,
      'Axis',
      'axis_model_x',
      { side: 'left', scale: scale_x.toJSON() }
    );
    const x_axis_2 = await create_model_bqplot(
      this.manager,
      'Axis',
      'axis_model_x',
      { side: 'right', scale: scale_x.toJSON() }
    );

    let width0, width1, width2, width3, width1b, width0b;
    let x0, x1, x2, x3, x1b, x0b;
    ({ x: x0, width: width0 } = figure.getFigureSize());

    // adding an axis should decrease the width, and move it to the right
    figure.model.set('axes', [x_axis]);
    await figure.updateDecorators();
    ({ x: x1, width: width1 } = figure.getFigureSize());
    expect(width1).to.be.lessThan(width0);
    expect(x1).to.be.greaterThan(x0);

    // adding a second axis should decrease the width even more, but keep it at the same x
    figure.model.set('axes', [x_axis, x_axis_2]);
    await figure.updateDecorators();
    ({ x: x2, width: width2 } = figure.getFigureSize());
    expect(width2).to.be.lessThan(width0);
    expect(width2).to.be.lessThan(width1);
    expect(x2).to.be.equal(x1);

    // if we move the second axis to the left, it should keep the same width (approx), but larger x offset
    x_axis_2.set('side', 'left');
    await figure.updateDecorators();
    ({ x: x3, width: width3 } = figure.getFigureSize());
    // so the width is not exactly the same
    // expect(width3).to.be.equal(width2);
    // but again, it should be less than with 1 axis
    expect(width3).to.be.lessThan(width1);
    expect(x3).to.be.greaterThan(x2);

    // all axis being equal, this should reduce to case1
    figure.model.set('axes', [x_axis_2]);
    await figure.updateDecorators();
    ({ x: x1b, width: width1b } = figure.getFigureSize());
    expect(width1b).to.be.equal(width1);
    expect(x1b).to.be.equal(x1);

    // and no axis
    figure.model.set('axes', []);
    await figure.updateDecorators();
    ({ x: x0b, width: width0b } = figure.getFigureSize());
    expect(width0b).to.be.equal(width0);
    expect(x0b).to.be.equal(x0);
  });

  it('axis offset', async function () {
    const x = {
      dtype: 'float32',
      value: new DataView(new Float32Array([0.5, 0.5]).buffer),
    };
    const y = {
      dtype: 'float32',
      value: new DataView(new Float32Array([2.0, 2.5]).buffer),
    };
    const { figure, scatter } = await create_figure_scatter(
      this.manager,
      x,
      y,
      false,
      true
    );
    const scale_x = scatter.model.get('scales').x;
    const x_axis = await create_model_bqplot(
      this.manager,
      'Axis',
      'axis_model_x',
      { side: 'left', scale: scale_x.toJSON() }
    );

    let width0, width1, width2, width1b;
    let x0, x1, x2, x1b;
    ({ x: x0, width: width0 } = figure.getFigureSize());

    // adding an axis should decrease the width, and move it to the right
    figure.model.set('axes', [x_axis]);
    await figure.updateDecorators();
    ({ x: x1, width: width1 } = figure.getFigureSize());
    expect(width1).to.be.lessThan(width0);
    expect(x1).to.be.greaterThan(x0);

    // setting the offset, should make it not part of the the auto layout
    x_axis.set('offset', { value: 0.5 });
    await figure.updateDecorators();
    ({ x: x2, width: width2 } = figure.getFigureSize());
    expect(width2).to.be.equal(width0);
    expect(x2).to.be.equal(x0);

    x_axis.set('offset', {});
    await figure.updateDecorators();
    ({ x: x1b, width: width1b } = figure.getFigureSize());
    expect(width1b).to.be.equal(width1);
    expect(x1b).to.be.equal(x1);
  });

  it('label and label offset', async function () {
    const x = {
      dtype: 'float32',
      value: new DataView(new Float32Array([0.5, 0.5]).buffer),
    };
    const y = {
      dtype: 'float32',
      value: new DataView(new Float32Array([2.0, 2.5]).buffer),
    };
    const { figure, scatter } = await create_figure_scatter(
      this.manager,
      x,
      y,
      false,
      true
    );
    const scale_x = scatter.model.get('scales').x;
    const x_axis = await create_model_bqplot(
      this.manager,
      'Axis',
      'axis_model_x',
      { side: 'left', scale: scale_x.toJSON() }
    );

    let width0, width1, width2, width3, width4;
    let x0, x1, x2, x3, x4;
    ({ x: x0, width: width0 } = figure.getFigureSize());

    // adding an axis should decrease the width, and move it to the right
    figure.model.set('axes', [x_axis]);
    await figure.updateDecorators();
    ({ x: x1, width: width1 } = figure.getFigureSize());
    expect(width1).to.be.lessThan(width0);
    expect(x1).to.be.greaterThan(x0);

    // setting a label, should grow the size the axis takes up, and shrink the width
    x_axis.set('label', 'x');
    await figure.updateDecorators();
    ({ x: x2, width: width2 } = figure.getFigureSize());
    expect(width2).to.be.lessThan(width1);
    expect(x2).to.be.greaterThan(x1);

    // the default offset is > 1px, so this should shrink it compared to case 2
    x_axis.set('label_offset', '1px');
    await figure.updateDecorators();
    ({ x: x3, width: width3 } = figure.getFigureSize());
    expect(width3).to.be.greaterThan(width2);
    expect(x3).to.be.lessThan(x2);

    // a negative offset will put it inside of the figure, so we should treat it as case 1 (no label)
    x_axis.set('label_offset', '-100px');
    await figure.updateDecorators();
    ({ x: x4, width: width4 } = figure.getFigureSize());
    expect(width4).to.be.equal(width1);
    expect(x4).to.be.equal(x1);
  });
});
