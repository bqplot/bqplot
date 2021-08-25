import { expect } from 'chai';
import { DummyManager } from './dummy-manager';
import bqplot = require('..');
import { create_figure_scatter, create_model_bqplot } from './widget-utils';
// import * as d3Timer from 'd3-timer';

// text pixel coordinate
// const test_x = 200;
// const test_y = 200;
// const pixel_red = [255, 0, 0, 255];

describe('coloraxis >', () => {
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
    const scale_color = await create_model_bqplot(
      this.manager,
      'ColorScale',
      'color_scale_1',
      { colors: ['#f00', '#f00'], min: 0, max: 1 }
    );
    const x_axis = await create_model_bqplot(
      this.manager,
      'Axis',
      'axis_model_x',
      { side: 'left', scale: scale_x.toJSON() }
    );
    const color_axis = await create_model_bqplot(
      this.manager,
      'ColorAxis',
      'coloraxis_model_x',
      { side: 'right', scale: scale_color.toJSON() }
    );

    let width0, width1, width2, width3, width3b, width0b;
    let x0, x1, x2, x3, x3b, x0b;
    ({ x: x0, width: width0 } = figure.getFigureSize());

    // adding an axis should decrease the width, and move it to the right
    figure.model.set('axes', [x_axis]);
    await figure.updateDecorators();
    ({ x: x1, width: width1 } = figure.getFigureSize());
    expect(width1).to.be.lessThan(width0);
    expect(x1).to.be.greaterThan(x0);

    // adding the color axis should decrease the width even more, but keep it at the same x
    figure.model.set('axes', [x_axis, color_axis]);
    await figure.updateDecorators();
    ({ x: x2, width: width2 } = figure.getFigureSize());
    expect(width2).to.be.lessThan(width0);
    expect(width2).to.be.lessThan(width1);
    expect(x2).to.be.equal(x1);

    // if we move the color axis to the left, it should keep the same width (approx), but larger x offset
    color_axis.set('side', 'left');
    await figure.updateDecorators();
    ({ x: x3, width: width3 } = figure.getFigureSize());
    // so the width is not exactly the same
    // expect(width3).to.be.equal(width2);
    // but again, it should be less than with 1 axis
    expect(width3).to.be.lessThan(width1);
    expect(x3).to.be.greaterThan(x2);

    // if we flip the order, it should be the same
    figure.model.set('axes', [color_axis, x_axis]);
    await figure.updateDecorators();
    ({ x: x3b, width: width3b } = figure.getFigureSize());
    expect(width3b).to.be.equal(width3);
    expect(x3b).to.be.equal(x3);

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
});
