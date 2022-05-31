import { expect } from 'chai';
import { DummyManager } from './dummy-manager';
import * as bqplot from '..';
import { create_figure_scatter } from './widget-utils';

describe('figure >', () => {
  beforeEach(async function () {
    this.manager = new DummyManager({ bqplot: bqplot });
  });

  it('marks removed before created', async function () {
    const x = {
      dtype: 'float32',
      value: new DataView(new Float32Array([0.5, 0.5]).buffer),
    };
    const y = {
      dtype: 'float32',
      value: new DataView(new Float32Array([2.0, 2.5]).buffer),
    };
    const { scatter, figure } = await create_figure_scatter(this.manager, x, y);

    // we start with the scatter and legend
    expect(figure.fig_marks.node().children).lengthOf(2);
    // we remove the scatter
    figure.model.set('marks', []);
    await Promise.all(figure.mark_views.views);
    expect(figure.fig_marks.node().children).lengthOf(1);
    // we set the marks twice without waiting, so we should never see the second scatter in the DOM
    figure.model.set('marks', [scatter.model, scatter.model]);
    const previousViewsPromise = Promise.all(figure.mark_views.views);
    figure.model.set('marks', [scatter.model]);
    await Promise.all(figure.mark_views.views);
    await previousViewsPromise; // we also want to wait for these promises to be resolved so the dummy
    // DOM node van be removed in the remove event handler in Figure.add_mark
    expect(figure.fig_marks.node().children).lengthOf(2);
  });
});
