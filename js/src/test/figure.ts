import { expect } from 'chai';
import { DummyManager } from './dummy-manager';
import * as bqplot from '..';
import { create_figure_scatter } from './widget-utils';

describe('figure >', () => {
  beforeEach(async function () {
    this.manager = new DummyManager({ bqplot: bqplot });
  });

  // it('marks removed before created', async function () {
  //   const x = {
  //     dtype: 'float32',
  //     value: new DataView(new Float32Array([0.5, 0.5]).buffer),
  //   };
  //   const y = {
  //     dtype: 'float32',
  //     value: new DataView(new Float32Array([2.0, 2.5]).buffer),
  //   };
  //   const { scatter, figure } = await create_figure_scatter(this.manager, x, y);

  //   // we start with the scatter and legend
  //   expect(figure.fig_marks.node().children).lengthOf(2);
  //   // we remove the scatter
  //   figure.model.set('marks', []);
  //   await Promise.all(figure.mark_views.views);
  //   expect(figure.fig_marks.node().children).lengthOf(1);
  //   // we set the marks twice without waiting, so we should never see the second scatter in the DOM
  //   figure.model.set('marks', [scatter.model, scatter.model]);
  //   const previousViewsPromise = Promise.all(figure.mark_views.views);
  //   figure.model.set('marks', [scatter.model]);
  //   await Promise.all(figure.mark_views.views);
  //   await previousViewsPromise; // we also want to wait for these promises to be resolved so the dummy
  //   // DOM node van be removed in the remove event handler in Figure.add_mark
  //   expect(figure.fig_marks.node().children).lengthOf(2);
  // });

  it('min aspect check', async function () {
    const data_x = {
      dtype: 'float32',
      value: new DataView(new Float32Array([0.5, 0.5]).buffer),
    };
    const data_y = {
      dtype: 'float32',
      value: new DataView(new Float32Array([2.0, 2.5]).buffer),
    };
    const { figure } = await create_figure_scatter(
      this.manager,
      data_x,
      data_y,
      false,
      true
    );

    // the dom is 400x500
    expect(figure.width).to.be.equals(400);
    expect(figure.height).to.be.equals(500);

    let width;
    let height;
    let x;
    let y;
    // current aspect is 400/500 ~= 0.8 < 2, so we expect the height to decrease
    figure.model.set('min_aspect_ratio', 2);
    ({ width, height, x, y } = figure.getFigureSize());
    expect(width).to.be.equals(400);
    expect(height).to.be.equals(200);
    expect(x).to.be.equals(0);
    expect(y).to.be.equals(150);

    // // relaxing it, we expect it to grow again
    // figure.model.set('min_aspect_ratio', 1.0);
    // ({width, height, x, y} = figure.getFigureSize());
    // expect(width).to.be.equals(400);
    // expect(height).to.be.equals(400);
    // expect(x).to.be.equals(0);
    // expect(y).to.be.equals(50);

    // // and back to its original size
    // figure.model.set('min_aspect_ratio', 0.1);
    // ({width, height, x, y} = figure.getFigureSize());
    // expect(width).to.be.equals(400);
    // expect(height).to.be.equals(500);
    // expect(x).to.be.equals(0);
    // expect(y).to.be.equals(0);
  });

  it('title respect', async function () {
    const data_x = {
      dtype: 'float32',
      value: new DataView(new Float32Array([0.5, 0.5]).buffer),
    };
    const data_y = {
      dtype: 'float32',
      value: new DataView(new Float32Array([2.0, 2.5]).buffer),
    };
    const { figure } = await create_figure_scatter(
      this.manager,
      data_x,
      data_y,
      false,
      true
    );

    // the dom is 400x500
    expect(figure.width).to.be.equals(400);
    expect(figure.height).to.be.equals(500);

    let width;
    let height;
    let x;
    let y;
    figure.model.set('max_aspect_ratio', 0.5);
    figure.model.set('min_aspect_ratio', 0.5);
    ({ width, height, x, y } = figure.getFigureSize());
    expect(width).to.be.equals(250);
    expect(height).to.be.equals(500);
    expect(x).to.be.equal((400 - 250) / 2);
    expect(y).to.be.equal(0);

    figure.model.set('title', 'I take up vertical space');
    ({ width, height, x, y } = figure.getFigureSize());
    // expect(x).to.be.greaterThan((400-250)/2);
    const fontHeight = figure.title.node().getBBox().height;
    expect(y).to.be.equal(fontHeight);
    expect(height).to.be.equal(500 - fontHeight);
    // expect(width).to.be.equals(250);
    // expect(x).to.be.greaterThan(0);
    // expect(y).to.be.greaterThan(0);

    figure.decorators.bottom.push({
      calculateAutoSize: () => 11,
      setAutoOffset: (x) => null,
    });
    ({ width, height, x, y } = figure.getFigureSize());
    // expect(x).to.be.greaterThan((400-250)/2);
    expect(y).to.be.equal(fontHeight);
    expect(height).to.be.equal(500 - fontHeight - 11);

    figure.model.set('title', '');
    ({ width, height, x, y } = figure.getFigureSize());
    expect(y).to.be.equal(0);
    expect(height).to.be.equal(500 - 11);

    // make the bottom decorators take the same space as the title
    figure.decorators.bottom.push({
      calculateAutoSize: () => fontHeight - 11,
      setAutoOffset: (x) => null,
    });
    figure.model.set('title', 'i should fit above');
    figure.model.set('max_aspect_ratio', 2);
    figure.model.set('min_aspect_ratio', 2);
    ({ width, height, x, y } = figure.getFigureSize());
    expect(width).to.be.equals(400);
    expect(height).to.be.equals(200);
    expect(y).to.be.equals((500 - 200) / 2);
  });

  it('max aspect check', async function () {
    const data_x = {
      dtype: 'float32',
      value: new DataView(new Float32Array([0.5, 0.5]).buffer),
    };
    const data_y = {
      dtype: 'float32',
      value: new DataView(new Float32Array([2.0, 2.5]).buffer),
    };
    const { figure } = await create_figure_scatter(
      this.manager,
      data_x,
      data_y,
      false,
      true
    );

    // the dom is 400x500
    expect(figure.width).to.be.equals(400);
    expect(figure.height).to.be.equals(500);

    let width;
    let height;
    let x;
    let y;
    // current aspect is 400/500 ~= 0.8 > 2, so we expect the width to decrease
    figure.model.set('max_aspect_ratio', 0.5);
    ({ width, height, x, y } = figure.getFigureSize());
    expect(width).to.be.equals(250);
    expect(height).to.be.equals(500);
    expect(x).to.be.equals(75);
    expect(y).to.be.equals(0);

    // relaxing it, we expect it to grow again
    figure.model.set('max_aspect_ratio', 0.6);
    ({ width, height, x, y } = figure.getFigureSize());
    expect(width).to.be.equals(300);
    expect(height).to.be.equals(500);
    expect(x).to.be.equals(50);
    expect(y).to.be.equals(0);

    // and back to its original size
    figure.model.set('max_aspect_ratio', 1);
    ({ width, height, x, y } = figure.getFigureSize());
    expect(width).to.be.equals(400);
    expect(height).to.be.equals(500);
    expect(x).to.be.equals(0);
    expect(y).to.be.equals(0);
  });
});
