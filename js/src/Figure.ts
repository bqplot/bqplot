/* Copyright 2015 Bloomberg Finance L.P.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as widgets from '@jupyter-widgets/base';
import * as d3 from 'd3';
// var d3 =Object.assign({}, require("d3-selection"), require("d3-selection-multi"));
import * as _ from 'underscore';
import * as popperreference from './PopperReference';
import popper from 'popper.js';
import * as THREE from 'three';
import { Dict, WidgetModel, WidgetView } from '@jupyter-widgets/base';
import { applyAttrs, applyStyles } from './utils';
import { Scale } from './Scale';
import { ScaleModel } from './ScaleModel';
import { AxisModel } from './AxisModel';
import { Mark } from './Mark';
import { MarkModel } from './MarkModel';
import { Interaction } from './Interaction';

THREE.ShaderChunk['scales'] =
  require('raw-loader!../shaders/scales.glsl').default;

interface IFigureSize {
  width: number;
  height: number;
}

export class Figure extends widgets.DOMWidgetView {
  initialize() {
    this.debouncedRelayout = _.debounce(() => {
      this.relayout();
    }, 300);
    // Internet Explorer does not support classList for svg elements
    this.el.classList.add('bqplot');
    this.el.classList.add('figure');
    this.el.classList.add('jupyter-widgets');
    this.change_theme();

    const svg = document.createElementNS(
      d3.namespaces.svg,
      'svg'
    ) as SVGElement;
    svg.classList.add('svg-figure');
    this.svg = d3.select<SVGElement, any>(svg);

    const svg_background = document.createElementNS(
      d3.namespaces.svg,
      'svg'
    ) as SVGElement;
    svg_background.classList.add('svg-background');
    this.svg_background = d3.select<SVGElement, any>(svg_background);

    this.el.appendChild(svg_background);
    this.el.appendChild(svg);

    // For testing we need to know when the mark_views is created, the tests
    // can wait for this promise.
    this._initial_marks_created = new Promise((resolve) => {
      this._initial_marks_created_resolve = resolve;
    });

    super.initialize.apply(this, arguments);
  }

  protected getFigureSize(): IFigureSize {
    const figureSize: IFigureSize = this.el.getBoundingClientRect();
    const clientRectRatio = figureSize.width / figureSize.height;

    const minRatio: number = this.model.get('min_aspect_ratio');
    const maxRatio: number = this.model.get('max_aspect_ratio');

    if (clientRectRatio < minRatio) {
      // Too much vertical space: Keep horizontal space but compute height from min aspect ratio
      figureSize.height = figureSize.width / minRatio;
    } else if (clientRectRatio > maxRatio) {
      // Too much horizontal space: Keep vertical space but compute width from max aspect ratio
      figureSize.width = figureSize.height * maxRatio;
    }

    return figureSize;
  }

  render() {
    // we cannot use Promise.all here, since this.layoutPromise is resolved, and will be overwritten later on
    this.displayed.then(() => {
      // make sure we render after all layouts styles are set, since they can affect the size
      this.layoutPromise.then(this.renderImpl.bind(this));
    });
  }

  protected async renderImpl() {
    const figureSize = this.getFigureSize();
    this.width = figureSize.width;
    this.height = figureSize.height;

    this.id = widgets.uuid();

    // Dictionary which contains the mapping for each of the marks id
    // to it's padding. Dictionary is required to not recompute
    // everything when a mark is removed.
    this.x_pad_dict = {};
    this.y_pad_dict = {};

    // this is the net padding in pixel to be applied to the x and y.
    // If there is no restriction on the plottable area of the figure,
    // then these two variables are the maximum of the values in the
    // corresponding variables x_pad_dict, y_pad_dict.
    this.xPaddingArr = {};
    this.yPaddingArr = {};
    this.figure_padding_x = this.model.get('padding_x');
    this.figure_padding_y = this.model.get('padding_y');
    this.clip_id = 'clip_path_' + this.id;
    this.margin = this.model.get('fig_margin');

    this.update_plotarea_dimensions();
    // we hide it when the plot area is too small
    if (this.plotarea_width < 1 || this.plotarea_height < 1) {
      this.el.style.visibility = 'hidden';
    } else {
      this.el.style.visibility = '';
    }
    // this.fig is the top <g> element to be impacted by a rescaling / change of margins

    this.fig = this.svg
      .append('g')
      .attr(
        'transform',
        'translate(' + this.margin.left + ',' + this.margin.top + ')'
      );
    this.fig_background = this.svg_background
      .append('g')
      .attr(
        'transform',
        'translate(' + this.margin.left + ',' + this.margin.top + ')'
      );
    this.tooltip_div = d3
      .select(document.createElement('div'))
      .attr('class', 'tooltip_div');
    this.popper_reference = new popperreference.PositionReference({
      x: 0,
      y: 0,
      width: 20,
      height: 20,
    });
    this.popper = new popper(this.popper_reference, this.tooltip_div.node(), {
      placement: 'auto',
    });

    this.bg = this.fig_background
      .append('rect')
      .attr('class', 'plotarea_background')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.plotarea_width)
      .attr('height', this.plotarea_height)
      .style('pointer-events', 'inherit');
    applyStyles(this.bg, this.model.get('background_style'));

    this.bg_events = this.fig
      .append('rect')
      .attr('class', 'plotarea_events')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.plotarea_width)
      .attr('height', this.plotarea_height)
      .style('pointer-events', 'inherit');
    this.bg_events.on('click', () => {
      this.trigger('bg_clicked');
    });

    this.fig_axes = this.fig_background.append('g');
    this.fig_marks = this.fig.append('g');
    this.interaction = this.fig.append('g');

    /*
         * The following was the structure of the DOM element constructed
         *
        <div class="bqplot figure jupyter-widgets">
            <svg>
                <g class="svg-figure" transform="margin translation">
                    <g class="svg-axes"></g>
                    <g class="svg-marks"></g>
                    <g class="svg-interaction"></g>
                </g>
            </svg>
        </div>

        To allow the main/interaction layer on top, and also allowing us to draw
        on top of the canvas (e.g. selectors), we create a new DOM structure.
        When creating a screenshot/image, we collapse all this into one svg.

        <div class="bqplot figure jupyter-widgets">
            <svg class="svg-background">
                <g transform="margin translation">
                    <g class="svg-axes"></g>
                </g>
            </svg>
            <canvas>
            </canvas>
            <svg class="svg-figure">
                <g transform="margin translation">
                    <g class="svg-marks"></g>
                    <g class="svg-interaction"></g>
                </g>
            </svg>
        </div>
        */

    this.clip_path = this.svg
      .append('svg:defs')
      .append('svg:clipPath')
      .attr('id', this.clip_id)
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.plotarea_width)
      .attr('height', this.plotarea_height);

    this.title = this.fig
      .append('text')
      .attr('class', 'mainheading')
      .attr('x', 0.5 * this.plotarea_width)
      .attr('y', -(this.margin.top / 2.0))
      .attr('dy', '1em');
    applyStyles(this.title, this.model.get('title_style'));

    this.title.text(this.model.get('title'));

    // TODO: remove the save png event mechanism.
    this.model.on('save_png', this.save_png, this);
    this.model.on('save_svg', this.save_svg, this);

    const figure_scale_promise = this.create_figure_scales();

    await figure_scale_promise;

    this.mark_views = new widgets.ViewList(
      this.add_mark,
      this.remove_mark,
      this
    );

    const mark_views_updated = this.mark_views
      .update(this.model.get('marks'))
      .then((views) => {
        this.replace_dummy_nodes(views);
        this.update_marks(views);
        this.update_legend();
        // Update Interaction layer
        // This has to be done after the marks are created
        this.set_interaction(this.model.get('interaction'));
        this._initial_marks_created_resolve();
        this.update_gl();
      });

    this.axis_views = new widgets.ViewList(this.add_axis, null, this);
    const axis_views_updated = this.axis_views.update(this.model.get('axes'));

    // TODO: move to the model
    this.model.on_some_change(
      ['fig_margin', 'min_aspect_ratio', 'max_aspect_ratio'],
      this.debouncedRelayout,
      this
    );
    this.model.on_some_change(
      ['padding_x', 'padding_y'],
      () => {
        this.figure_padding_x = this.model.get('padding_x');
        this.figure_padding_y = this.model.get('padding_y');
        this.trigger('margin_updated');
      },
      this
    );
    this.model.on(
      'change:axes',
      (model, value, options) => {
        this.axis_views.update(value);
      },
      this
    );
    this.model.on(
      'change:marks',
      (model, value, options) => {
        this.mark_views.update(value).then((views) => {
          this.replace_dummy_nodes(views);
          this.update_marks(views);
          this.update_legend();
          this.update_gl();
        });
      },
      this
    );
    this.model.on('change:legend_location', this.update_legend, this);
    this.model.on('change:title', this.update_title, this);

    this.model.on(
      'change:interaction',
      (model, value) => {
        Promise.all(this.mark_views.views).then((views) => {
          // Like above:
          // This has to be done after the marks are created
          this.set_interaction(value);
        });
      },
      this
    );

    document.body.appendChild(this.tooltip_div.node());
    this.create_listeners();

    // In the classic notebook, we should relayout the figure on
    // resize of the main window.
    window.addEventListener('resize', this.debouncedRelayout);
    this.once('remove', () => {
      window.removeEventListener('resize', this.debouncedRelayout);
    });

    return Promise.all([mark_views_updated, axis_views_updated]);
  }

  createWebGLRenderer() {
    // a shared webgl context for all marks
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        premultipliedAlpha: true,
      });

      this.renderer.setSize(100, 100);
      this.renderer.setClearAlpha(0);
      this.renderer.setPixelRatio(
        this.model.get('pixel_ratio') || window.devicePixelRatio
      );
    }

    if (this.renderer && !this.el.contains(this.renderer.domElement)) {
      this.el.insertBefore(this.renderer.domElement, this.el.childNodes[1]);
    }
    this.layout_webgl_canvas();
  }

  replace_dummy_nodes(views: Mark[]) {
    for (const view of views) {
      const dummyNode = this.dummyNodes[view.cid];

      // It could be that the dummy node is removed before we got a change to replace it
      // This happens when the marks list is changed rapidly
      if (dummyNode !== null && dummyNode.parentNode) {
        dummyNode.parentNode.replaceChild(view.el, dummyNode);
        this.dummyNodes[view.cid] = null;
        this.displayed.then(() => {
          view.trigger('displayed');
        });
      }
    }
  }

  create_listeners() {
    this.listenTo(this.model, 'change:title_style', this.title_style_updated);
    this.listenTo(
      this.model,
      'change:background_style',
      this.background_style_updated
    );
    this.listenTo(this.model, 'change:layout', this.change_layout);
    this.listenTo(this.model, 'change:legend_style', this.legend_style_updated);
    this.listenTo(this.model, 'change:legend_text', this.legend_text_updated);
    this.listenTo(this.model, 'change:pixel_ratio', () => {
      if (this.renderer) {
        this.renderer.setPixelRatio(
          this.model.get('pixel_ratio') || window.devicePixelRatio
        );
        this.update_gl();
      }
    });
    this.listenTo(this.model, 'change:theme', this.change_theme);
  }

  title_style_updated() {
    applyStyles(this.title, this.model.get('title_style'));
  }

  background_style_updated() {
    applyStyles(this.bg, this.model.get('background_style'));
  }

  legend_style_updated() {
    applyStyles(
      this.fig_marks
        .selectAll('.g_legend')
        .selectAll('.axis')
        .selectAll('rect'),
      this.model.get('legend_style')
    );
  }

  legend_text_updated() {
    applyStyles(
      this.fig_marks.selectAll('.g_legend').selectAll('text.legendtext'),
      this.model.get('legend_text')
    );
  }

  create_figure_scales() {
    // Creates the absolute scales for the figure: default domain is [0,1], range is [0,width] and [0,height].
    // See the scale_x and scale_y attributes of the python Figure
    const that = this;
    const x_scale_promise = this.create_child_view(
      this.model.get('scale_x')
    ).then((view) => {
      that.scale_x = view as WidgetView as Scale;
      (
        that.scale_x.scale as
          | d3.ScaleLinear<number, number>
          | d3.ScaleTime<Date, number>
          | d3.ScaleLogarithmic<number, number>
      ).clamp(true);
      that.scale_x.set_range([0, that.plotarea_width]);
    });

    const y_scale_promise = this.create_child_view(
      this.model.get('scale_y')
    ).then((view) => {
      that.scale_y = view as WidgetView as Scale;
      (
        that.scale_y.scale as
          | d3.ScaleLinear<number, number>
          | d3.ScaleTime<Date, number>
          | d3.ScaleLogarithmic<number, number>
      ).clamp(true);
      that.scale_y.set_range([that.plotarea_height, 0]);
    });
    return Promise.all([x_scale_promise, y_scale_promise]);
  }

  padded_range(direction: 'x' | 'y', scale_model: ScaleModel) {
    // Functions to be called by mark which respects padding.
    // Typically all marks do this. Axis do not do this.
    // Also, if a mark does not set the domain, it can potentially call
    // the unpadded ranges.
    if (!scale_model.get('allow_padding')) {
      return this.range(direction);
    }
    const scale_id = scale_model.model_id;

    if (direction === 'x') {
      const scale_padding =
        this.xPaddingArr[scale_id] !== undefined
          ? this.xPaddingArr[scale_id]
          : 0;
      const fig_padding = this.plotarea_width * this.figure_padding_x;
      return [
        fig_padding + scale_padding,
        this.plotarea_width - fig_padding - scale_padding,
      ];
    } else if (direction === 'y') {
      const scale_padding =
        this.yPaddingArr[scale_id] !== undefined
          ? this.yPaddingArr[scale_id]
          : 0;
      const fig_padding = this.plotarea_height * this.figure_padding_y;
      return [
        this.plotarea_height - scale_padding - fig_padding,
        scale_padding + fig_padding,
      ];
    }
  }

  range(direction: 'x' | 'y') {
    if (direction === 'x') {
      return [0, this.plotarea_width];
    } else if (direction === 'y') {
      return [this.plotarea_height, 0];
    }
  }

  get_mark_plotarea_height(scaleModel: ScaleModel) {
    if (!scaleModel.get('allow_padding')) {
      return this.plotarea_height;
    }
    const scale_id = scaleModel.model_id;
    const scale_padding =
      this.yPaddingArr[scale_id] !== undefined ? this.yPaddingArr[scale_id] : 0;
    return (
      this.plotarea_height * (1 - this.figure_padding_y) -
      scale_padding -
      scale_padding
    );
  }

  get_mark_plotarea_width(scaleModel: ScaleModel) {
    if (!scaleModel.get('allow_padding')) {
      return this.plotarea_width;
    }

    const scale_id = scaleModel.model_id;
    const scale_padding =
      this.xPaddingArr[scale_id] !== undefined ? this.xPaddingArr[scale_id] : 0;
    return (
      this.plotarea_width * (1 - this.figure_padding_x) -
      scale_padding -
      scale_padding
    );
  }

  async add_axis(model: AxisModel) {
    // Called when an axis is added to the axes list.
    const view = await this.create_child_view(model);

    this.fig_axes.node().appendChild(view.el);
    this.displayed.then(() => {
      view.trigger('displayed');
    });

    return view;
  }

  remove_from_padding_dict(dict, mark_view: Mark, scale_model: ScaleModel) {
    if (scale_model === undefined || scale_model === null) {
      return;
    }
    const scale_id = scale_model.model_id;
    if (dict[scale_id] !== undefined) {
      delete dict[scale_id][mark_view.model.model_id + '_' + mark_view.cid];
      if (Object.keys(dict[scale_id]).length === 0) {
        delete dict[scale_id];
      }
    }
  }

  update_padding_dict(dict, mark_view: Mark, scale_model: ScaleModel, value) {
    const scale_id = scale_model.model_id;
    if (!dict[scale_id]) {
      dict[scale_id] = {};
    }
    dict[scale_id][mark_view.model.model_id + '_' + mark_view.cid] = value;
  }

  mark_scales_updated(view: Mark) {
    const model = view.model;
    const prev_scale_models = model.previous('scales');
    this.remove_from_padding_dict(
      this.x_pad_dict,
      view,
      prev_scale_models[model.get_key_for_orientation('horizontal')]
    );
    this.remove_from_padding_dict(
      this.y_pad_dict,
      view,
      prev_scale_models[model.get_key_for_orientation('vertical')]
    );

    const scale_models = model.get('scales');
    this.update_padding_dict(
      this.x_pad_dict,
      view,
      scale_models[model.get_key_for_orientation('horizontal')],
      view.xPadding
    );
    this.update_padding_dict(
      this.y_pad_dict,
      view,
      scale_models[model.get_key_for_orientation('vertical')],
      view.yPadding
    );

    this.update_paddings();
  }

  mark_padding_updated(view: Mark) {
    const model = view.model;
    const scale_models = model.get('scales');

    this.update_padding_dict(
      this.x_pad_dict,
      view,
      scale_models[model.get_key_for_orientation('horizontal')],
      view.xPadding
    );
    this.update_padding_dict(
      this.y_pad_dict,
      view,
      scale_models[model.get_key_for_orientation('vertical')],
      view.yPadding
    );

    this.update_paddings();
  }

  update_marks(mark_views) {
    this.update_paddings();
  }

  remove_mark(view: Mark) {
    // Called when a mark is removed from the mark list.
    const model = view.model;
    model.off('redraw_legend', null, this);
    model.off('data_updated', null, this);
    model.off('scales_updated', null, this);
    model.off('mark_padding_updated', null, this);

    const scale_models = model.get('scales');
    this.remove_from_padding_dict(
      this.x_pad_dict,
      view,
      scale_models[model.get_key_for_orientation('horizontal')]
    );
    this.remove_from_padding_dict(
      this.y_pad_dict,
      view,
      scale_models[model.get_key_for_orientation('vertical')]
    );
    view.remove();
  }

  async add_mark(model: MarkModel) {
    model.state_change.then(() => {
      model.on('data_updated redraw_legend', this.update_legend, this);
    });

    const dummy_node = this.fig_marks
      .node()
      .appendChild(document.createElementNS(d3.namespaces.svg, 'g'));

    // @ts-ignore: We should use the type argument: this.create_child_view<Mark>
    const view: Mark = await this.create_child_view(model, {
      clip_id: this.clip_id,
    });

    this.dummyNodes[view.cid] = dummy_node;

    view.on(
      'mark_padding_updated',
      () => {
        this.mark_padding_updated(view);
      },
      this
    );
    view.on(
      'mark_scales_updated',
      () => {
        this.mark_scales_updated(view);
      },
      this
    );

    let child_x_scale =
      view.model.get('scales')[view.model.get_key_for_dimension('x')];
    let child_y_scale =
      view.model.get('scales')[view.model.get_key_for_dimension('y')];
    if (child_x_scale === undefined) {
      child_x_scale = this.scale_x.model;
    }
    if (child_y_scale === undefined) {
      child_y_scale = this.scale_y.model;
    }
    this.update_padding_dict(
      this.x_pad_dict,
      view,
      child_x_scale,
      view.xPadding
    );
    this.update_padding_dict(
      this.y_pad_dict,
      view,
      child_y_scale,
      view.yPadding
    );

    // If the mark needs a WebGL renderer, we create it
    if (view['render_gl']) {
      this.createWebGLRenderer();
    }
    // If the marks list changes before replace_dummy_nodes is called, we are not DOM
    // attached, and view.remove() in Figure.remove_mark will not remove this view from the DOM
    // but a later call to Figure.replace_dummy_nodes will attach it to the DOM again, leading
    // to a 'ghost' mark, originally reported in https://github.com/spacetelescope/jdaviz/issues/270
    view.on('remove', () => {
      if (dummy_node.parentNode) {
        dummy_node.remove();
      }
    });

    return view;
  }

  update_paddings() {
    // Iterate over the paddings of the marks for each scale and store
    // the maximum padding for each scale on the X and Y in
    // xPaddingArr and yPaddingArr

    this.xPaddingArr = {};
    this.yPaddingArr = {};

    _.forEach(this.x_pad_dict, (dict: any, scale_id) => {
      let max = 0;
      _.forEach(dict, (value: number, key) => {
        max = Math.max(max, value);
      });
      this.xPaddingArr[scale_id] = max;
    });

    _.forEach(this.y_pad_dict, (dict: any, scale_id) => {
      let max = 0;
      _.forEach(dict, (value: number, key) => {
        max = Math.max(max, value);
      });
      this.yPaddingArr[scale_id] = max;
    });
    // This is for the figure to relayout everything to account for the
    // updated margins.
    this.trigger('margin_updated');
  }

  update_plotarea_dimensions() {
    this.plotarea_width = this.width - this.margin.left - this.margin.right;
    this.plotarea_height = this.height - this.margin.top - this.margin.bottom;
  }

  processPhosphorMessage(msg) {
    super.processPhosphorMessage.apply(this, arguments);

    switch (msg.type) {
      case 'resize':
      case 'after-show':
      case 'after-attach':
        if (this.pWidget.isVisible) {
          const figureSize = this.getFigureSize();
          if (
            this.width !== figureSize.width ||
            this.height !== figureSize.height
          ) {
            this.debouncedRelayout();
          }
        }
        break;
    }
  }

  relayout() {
    const relayoutImpl = () => {
      this.relayoutRequested = false; // reset relayout request
      const figureSize = this.getFigureSize();
      this.width = figureSize.width;
      this.height = figureSize.height;
      // update ranges
      this.margin = this.model.get('fig_margin');
      this.update_plotarea_dimensions();
      // we hide it when the plot area is too small
      if (this.plotarea_width < 1 || this.plotarea_width < 1) {
        this.el.style.visibility = 'hidden';
        return; // no need to continue setting properties, which can only produce errors in the js console
      } else {
        this.el.style.visibility = '';
      }

      if (this.scale_x !== undefined && this.scale_x !== null) {
        this.scale_x.set_range([0, this.plotarea_width]);
      }

      if (this.scale_y !== undefined && this.scale_y !== null) {
        this.scale_y.set_range([this.plotarea_height, 0]);
      }

      // transform figure
      this.fig.attr(
        'transform',
        'translate(' + this.margin.left + ',' + this.margin.top + ')'
      );
      this.fig_background.attr(
        'transform',
        'translate(' + this.margin.left + ',' + this.margin.top + ')'
      );
      applyAttrs(this.title, {
        x: 0.5 * this.plotarea_width,
        y: -(this.margin.top / 2.0),
        dy: '1em',
      });

      this.bg
        .attr('width', this.plotarea_width)
        .attr('height', this.plotarea_height);
      this.bg_events
        .attr('width', this.plotarea_width)
        .attr('height', this.plotarea_height);

      this.clip_path
        .attr('width', this.plotarea_width)
        .attr('height', this.plotarea_height);

      this.trigger('margin_updated');
      this.update_legend();
      this.layout_webgl_canvas();
    };

    if (!this.relayoutRequested) {
      this.relayoutRequested = true; // avoid scheduling a relayout twice
      requestAnimationFrame(relayoutImpl.bind(this));
    }
  }

  layout_webgl_canvas() {
    if (this.renderer) {
      this.renderer.domElement.style =
        'left: ' +
        this.margin.left +
        'px; ' +
        'top: ' +
        this.margin.top +
        'px;';
      this.renderer.setSize(this.plotarea_width, this.plotarea_height);
      this.update_gl();
    }
  }

  update_legend() {
    this.fig_marks.selectAll('.g_legend').remove();

    const legend_height = 14;
    const legend_width = 24;
    const legend_location = this.model.get('legend_location');

    const legend_g = this.fig_marks.append('g').attr('class', 'g_legend');

    let count = 1;
    let max_label_len = 1;

    if (this.mark_views !== undefined && this.mark_views !== null) {
      Promise.all(this.mark_views.views).then((views) => {
        views.forEach((mark_view: any) => {
          if (mark_view.model.get('display_legend')) {
            const child_count = mark_view.draw_legend(
              legend_g,
              0,
              count * (legend_height + 2),
              0,
              legend_height + 2
            );
            count = count + child_count[0];
            max_label_len = child_count[1]
              ? Math.max(max_label_len, child_count[1])
              : max_label_len;
          }
        });

        const coords = this.get_legend_coords(
          legend_location,
          legend_width,
          (count + 1) * (legend_height + 2),
          0
        );
        if (count !== 1) {
          legend_g
            .insert('g', ':first-child')
            .attr('class', 'axis')
            .append('rect')
            .attr('y', (legend_height + 2) / 2.0)
            .attr('x', -0.5 * (legend_height + 2))
            .attr('width', max_label_len + 2 + 'em')
            .attr('height', count * (legend_height + 2));
        }
        max_label_len =
          legend_location === 'top-right' ||
          legend_location === 'right' ||
          legend_location === 'bottom-right'
            ? -(max_label_len + 2)
            : 1;
        const em = 16;
        legend_g.attr(
          'transform',
          'translate(' +
            String(coords[0] + max_label_len * em) +
            ' ' +
            String(coords[1]) +
            ') '
        );

        applyStyles(
          legend_g.selectAll('text.legendtext'),
          this.model.get('legend_text')
        );

        applyStyles(
          legend_g.selectAll('.axis').selectAll('rect'),
          this.model.get('legend_style')
        );
      });
    }
  }

  get_legend_coords(
    legend_location:
      | 'top'
      | 'top-right'
      | 'right'
      | 'bottom-right'
      | 'bottom'
      | 'bottom-left'
      | 'left',
    width: number,
    height: number,
    disp: number
  ) {
    let x_start = 0;
    let y_start = 0;
    const fig_width = this.plotarea_width;
    const fig_height = this.plotarea_height;

    switch (legend_location) {
      case 'top':
        x_start = fig_width * 0.5 - width;
        y_start = 0;
        break;
      case 'top-right':
        x_start = fig_width - disp;
        y_start = 0;
        break;
      case 'right':
        x_start = fig_width - disp;
        y_start = fig_height * 0.5 - height;
        break;
      case 'bottom-right':
        x_start = fig_width - disp;
        y_start = fig_height - height;
        break;
      case 'bottom':
        x_start = fig_width * 0.5 - width;
        y_start = fig_height - height;
        break;
      case 'bottom-left':
        x_start = 0;
        y_start = fig_height - height;
        break;
      case 'left':
        x_start = 0;
        y_start = fig_height * 0.5 - height;
        break;
      default:
        x_start = 0;
        y_start = 0;
    }
    return [x_start, y_start];
  }

  async set_interaction(model: WidgetModel | null): Promise<WidgetView> {
    if (model) {
      // Sets the child interaction
      await model.state_change;

      // Sets the child interaction
      // @ts-ignore: We should use the type argument: this.create_child_view<Interaction>
      const view: Interaction = await this.create_child_view(model);

      if (this.interaction_view) {
        this.interaction_view.remove();
      }
      this.interaction_view = view;
      this.interaction.node().appendChild(view.el);
      this.displayed.then(() => {
        view.trigger('displayed');
      });
      return view;
    } else {
      if (this.interaction_view) {
        this.interaction_view.remove();
        this.interaction_view = null;
      }
      return Promise.resolve(null);
    }
  }

  update_title(model, title) {
    this.title.text(this.model.get('title'));
  }

  remove() {
    if (this.mark_views !== undefined && this.mark_views !== null) {
      this.mark_views.remove();
    }
    if (this.axis_views !== undefined && this.axis_views !== null) {
      this.axis_views.remove();
    }
    if (this.tooltip_div !== undefined) {
      this.tooltip_div.remove();
    }
    return super.remove.apply(this, arguments);
  }

  get_svg() {
    // Returns the outer html of the figure svg

    const replaceAll = (find, replace, str) => {
      return str.replace(new RegExp(find, 'g'), replace);
    };

    const get_css = (node, regs) => {
      /**
       * Gathers all the css rules applied to elements of the svg
       * node. Removes the parent element selectors specified in
       * argument `regs`.
       */
      let css = '';
      const sheets = document.styleSheets;
      let selector;
      for (let i = 0; i < sheets.length; i++) {
        let rules: any = null;
        // due to CORS we may have some sheets we cannot access, instead of checking we always try
        try {
          rules = (sheets[i] as CSSStyleSheet).cssRules;
        } catch (e) {
          // ignore CORS errors
        }
        if (rules) {
          for (let j = 0; j < rules.length; j++) {
            const rule = rules[j];
            if (typeof rule.style !== 'undefined') {
              let match = null;
              try {
                match = node.querySelectorAll(rule.selectorText);
              } catch (err) {
                console.warn(
                  "Invalid CSS selector '" + rule.selectorText + "'",
                  err
                );
              }
              if (match) {
                const elems = node.querySelectorAll(rule.selectorText);
                if (elems.length > 0) {
                  selector = rule.selectorText;
                  for (let r = 0; r < regs.length; r++) {
                    selector = replaceAll(regs[r], '', selector);
                  }
                  css += `${selector} { ${rule.style.cssText} }
                                    `;
                }
              } else if (rule.cssText.match(/^@font-face/)) {
                css += rule.cssText + '\n';
              }
            }
          }
        }
      }
      // TODO: this is terrible. The previous loop over style sheets
      // does not catch document's top-level properties.
      css += 'svg { font-size: 10px; }\n';
      return css;
    };

    // Even though the canvas may display the rendering already, it is not guaranteed it can be read of the canvas
    // or we have to set preserveDrawingBuffer to true, which may impact performance.
    // Instead, we render again, and directly afterwards we do get the pixel data using canvas.toDataURL
    return this.render_gl().then(async () => {
      // Create standalone SVG string
      const node_background: any = this.svg_background.node();
      const node_foreground: any = this.svg.node();
      const width = this.plotarea_width;
      const height = this.plotarea_height;

      // Creates a standalone SVG string from an inline SVG element
      // containing all the computed style attributes.
      const svg = node_foreground.cloneNode(true);
      // images can contain blob urls, we transform those to data urls
      const blobToDataUrl = async (el) => {
        const blob = await (await fetch(el.getAttribute('href'))).blob();
        const reader = new FileReader();
        const readerPromise = new Promise((resolve, reject) => {
          reader.onloadend = resolve;
          reader.onerror = reject;
          reader.abort = reject;
        });
        reader.readAsDataURL(blob);
        await readerPromise;
        el.setAttribute('href', reader.result);
      };
      const images = [...svg.querySelectorAll('image')];
      await Promise.all(images.map(blobToDataUrl));
      svg.setAttribute('version', '1.1');
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      svg.setAttribute('width', this.width);
      svg.setAttribute('height', this.height);
      svg.style.background = window.getComputedStyle(document.body).background;

      const computedStyle = window.getComputedStyle(this.el);
      const cssCode =
        get_css(this.el, [
          '.theme-dark',
          '.theme-light',
          '.bqplot > ',
          ':root',
        ]) + '\n';
      // extract all CSS variables, and generate a piece of css to define the variables
      const cssVariables = cssCode.match(/(--\w[\w-]*)/g) || [];
      const cssVariableCode =
        cssVariables.reduce((cssCode, variable) => {
          const value = computedStyle.getPropertyValue(variable);
          return `${cssCode}\n\t${variable}: ${value};`;
        }, ':root {') + '\n}\n';

      // and put the CSS in a style element
      const styleElement = document.createElement('style');
      styleElement.setAttribute('type', 'text/css');
      styleElement.innerHTML =
        '<![CDATA[\n' + cssVariableCode + cssCode + ']]>';

      const defs = document.createElement('defs');
      defs.appendChild(styleElement);
      // we put the svg background part before the marks
      const g_root = svg.children[0];
      const svg_background = node_background.cloneNode(true);
      // first the axes
      g_root.insertBefore(
        svg_background.children[0].children[1],
        g_root.children[0]
      );
      // and the background as first element
      g_root.insertBefore(
        svg_background.children[0].children[0],
        g_root.children[0]
      );

      // and add the webgl canvas as an image
      if (this.renderer) {
        const data_url = this.renderer.domElement.toDataURL('image/png');
        const marks = d3.select(g_root.children[3]);
        marks
          .insert('image', ':first-child')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 1)
          .attr('height', 1)
          .attr('preserveAspectRatio', 'none')
          .attr('transform', 'scale(' + width + ', ' + height + ')')
          .attr('href', data_url);
      }

      svg.insertBefore(defs, svg.firstChild);
      // Getting the outer HTML
      return svg.outerHTML;
    });
  }

  async get_rendered_canvas(scale): Promise<HTMLCanvasElement> {
    // scale up the underlying canvas for high dpi screens
    // such that image is of the same quality
    scale = scale || window.devicePixelRatio;
    // Render a SVG data into a canvas and
    const xml = await this.get_svg();

    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.classList.add('bqplot');
        canvas.width = this.width * scale;
        canvas.height = this.height * scale;
        canvas.style.width = this.width.toString();
        canvas.style.height = this.height.toString();
        const context = canvas.getContext('2d');
        context.scale(scale, scale);
        context.drawImage(image, 0, 0);
        resolve(canvas);
      };
      image.src =
        'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
    });
  }

  save_png(filename, scale) {
    // Render a SVG data into a canvas and download as PNG.

    this.get_rendered_canvas(scale).then((canvas: any) => {
      const a = document.createElement('a');
      a.download = filename || 'image.png';
      a.href = canvas.toDataURL('image/png');
      document.body.appendChild(a);
      a.click();
    });
  }

  save_svg(filename: string) {
    this.get_svg().then((xml) => {
      const a = document.createElement('a');
      a.download = filename || 'bqplot.svg';
      a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(xml);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  async getPixel(x, y) {
    const canvas = await this.get_rendered_canvas(window.devicePixelRatio);
    const context = canvas.getContext('2d');
    const pixel = context.getImageData(
      x * window.devicePixelRatio,
      y * window.devicePixelRatio,
      1,
      1
    );
    return pixel.data;
  }

  update_gl() {
    if (!this._update_requested) {
      this._update_requested = true;
      requestAnimationFrame(this._update_gl.bind(this));
    }
  }

  _update_gl() {
    this.render_gl();
    this._update_requested = false;
  }

  async render_gl(): Promise<void> {
    // Nothing to render using a WebGL context
    if (!this.renderer) {
      return Promise.resolve();
    }

    const views = await Promise.all(this.mark_views.views);

    // render all marks that have a render_gl method
    this.renderer.autoClear = false;
    this.renderer.autoClearColor = new (THREE.Color as (x) => void)(0x000000);
    this.renderer.clear();
    const marks_gl = _.filter(views, (view: Mark) => view['render_gl']);

    for (const mark of marks_gl) {
      mark['render_gl']();
    }
  }

  change_theme() {
    this.el.classList.remove(this.model.previous('theme'));
    this.el.classList.add(this.model.get('theme'));
  }

  axis_views: widgets.ViewList<widgets.DOMWidgetView>;
  bg: d3.Selection<SVGRectElement, any, any, any>;
  bg_events: d3.Selection<SVGRectElement, any, any, any>;
  change_layout: () => void;
  clip_id: string;
  clip_path: d3.Selection<SVGRectElement, any, any, any>;
  debouncedRelayout: () => void;
  fig_axes: d3.Selection<SVGGraphicsElement, any, any, any>;
  fig_marks: d3.Selection<SVGGraphicsElement, any, any, any>;
  fig_background: d3.Selection<SVGGraphicsElement, any, any, any>;
  fig: d3.Selection<SVGGraphicsElement, any, any, any>;
  figure_padding_x: number;
  figure_padding_y: number;
  height: number;
  interaction_view: Interaction;
  interaction: d3.Selection<SVGGElement, any, any, any>;
  margin: { top: number; bottom: number; left: number; right: number };
  mark_views: widgets.ViewList<Mark>;
  plotarea_height: number;
  plotarea_width: number;
  popper_reference: popper.ReferenceObject;
  popper: popper;
  renderer: THREE.WebGLRenderer | null;
  scale_x: Scale;
  scale_y: Scale;
  svg: d3.Selection<SVGElement, any, any, any>;
  svg_background: d3.Selection<SVGElement, any, any, any>;
  title: d3.Selection<SVGTextElement, any, any, any>;
  tooltip_div: d3.Selection<HTMLDivElement, any, any, any>;
  width: number;
  x_pad_dict: { [id: string]: number };
  xPaddingArr: { [id: string]: number };
  y_pad_dict: { [id: string]: number };
  yPaddingArr: { [id: string]: number };

  private dummyNodes: Dict<any> = {};

  private _update_requested: boolean;
  private relayoutRequested: boolean = false;

  // this is public for the test framework, but considered a private API
  public _initial_marks_created: Promise<any>;
  private _initial_marks_created_resolve: Function;
}
