// some helper functions to quickly create widgets

export
async function create_model_bqplot(manager, name: string, id: string, args: Object) {
    return create_model(manager, 'bqplot', `${name}Model`, name, id, args);
}

export
async function create_model(manager, module: string, model: string, view: string, id: string, args = {}) {
    let model_widget = await manager.new_widget({
            model_module: module,
            model_name: model,
            model_module_version : '*',
            view_module: module,
            view_name: view,
            view_module_version: '*',
            model_id: id,
    }, args );
    return model_widget;

}

export
async function create_view(manager, model, options = {}) {
    let view = await manager.create_view(model, options);
    return view;
}

export
async function create_widget(manager, name: string, id: string, args: Object) {
    let model = await create_model_bqplot(manager, name, id, args)
    let view = await manager.create_view(model);
    await manager.display_view(undefined, view);
    return {model: model, view:view};
}

export
async function create_figure_scatter(manager, x, y, mega=false, log=false) {
    let layout = await create_model(manager, '@jupyter-widgets/base', 'LayoutModel', 'LayoutView', 'layout_figure1', {_dom_classes: '', width: '400px', height: '500px'})
    let scale_x;
    let scale_y;
    if (log) {
        scale_x = await create_model_bqplot(manager, 'LogScale', 'scale_x', {min:0.01, max:100, allow_padding: false})
        scale_y = await create_model_bqplot(manager, 'LogScale', 'scale_y',  {min:0.1, max:10, allow_padding: false})
    } else {
        scale_x = await create_model_bqplot(manager, 'LinearScale', 'scale_x', {min:0, max:1, allow_padding: false})
        scale_y = await create_model_bqplot(manager, 'LinearScale', 'scale_y', {min:2, max:3, allow_padding: false})
    }
    // TODO: the default values for the ColorScale should not be required, but defined in the defaults method
    let scale_color = await create_model_bqplot(manager, 'ColorScale', 'scale_color', {scheme: 'RdYlGn', colors: []})
    let scales = {x: scale_x.toJSON(), y: scale_y.toJSON(), color: scale_color.toJSON()}
    let color    = null;
    let size     = null;
    let opacity  = null;
    let rotation = null;
    let skew     = {type: null, values: null};

    let scatterModel = await create_model_bqplot(manager, mega ? 'ScatterGL' : 'Scatter' , 'scatter1', {scales: scales,
        x: x, y: y, color: color, size: size, opacity: opacity, rotation: rotation, skew: skew, colors: ['steelblue'],
        visible: true, default_size: 64, selected_style: {}, unselected_style: {}, hovered_style: {}, unhovered_style: {},
        preserve_domain: {}, _view_module_version: '*', _view_module: 'bqplot'})
    let figureModel;
    try {
        figureModel = await create_model_bqplot(manager, 'Figure', 'figure1', {scale_x: scales['x'], scale_y: scales['y'],
            layout: layout.toJSON(), _dom_classes: [],
            figure_padding_y: 0, fig_margin: {bottom: 0, left: 0, right: 0, top: 0},
            marks: [scatterModel.toJSON()]})
    } catch(e) {
        console.error('error', e)
    }
    let figure  = await create_view(manager, figureModel);
    await manager.display_view(undefined, figure);
    await figure._initial_marks_created;
    return {figure: figure, scatter: await figure.mark_views.views[0]}
}


export
async function create_figure_lines(manager, x, y, default_scales={}) {
    let layout = await create_model(manager, '@jupyter-widgets/base', 'LayoutModel', 'LayoutView', 'layout_figure1', {_dom_classes: '', width: '400px', height: '500px'})
    let scale_x = await create_model_bqplot(manager, 'LinearScale', 'scale_x', {min:0, max:1, allow_padding: false})
    let scale_y = await create_model_bqplot(manager, 'LinearScale', 'scale_y', {min:2, max:3, allow_padding: false})
    let scales = {x: scale_x.toJSON(), y: scale_y.toJSON()}
    let scales_mark = {x: default_scales['x'] || scale_x.toJSON(), y: default_scales['y'] || scale_y.toJSON()}
    let color    = null;
    let size     = {type: null, values: null};
    let opacity  = {type: null, values: null};
    let rotation = {type: null, values: null};
    let skew     = {type: null, values: null};

    let linesModel = await create_model_bqplot(manager, 'Lines', 'lines1', {scales: scales_mark,
        x: x, y: y, color: color, size: size, opacity: opacity, rotation: rotation, skew: skew,
        visible: true, default_size: 64,
        preserve_domain: {}, _view_module_version: '*', _view_module: 'bqplot'})
    let figureModel;
    try {
        figureModel = await create_model_bqplot(manager, 'Figure', 'figure1', {scale_x: scales['x'], scale_y: scales['y'],
            layout: layout.toJSON(), _dom_classes: [],
            figure_padding_y: 0, fig_margin: {bottom: 0, left: 0, right: 0, top: 0},
            marks: [linesModel.toJSON()]})
    } catch(e) {
        console.error('error', e)
    }
    let figure  = await create_view(manager, figureModel);
    await manager.display_view(undefined, figure);
    await figure._initial_marks_created;
    return {figure: figure, lines: await figure.mark_views.views[0]}
}

export
async function create_figure_pie(manager, sizes, labels) {
    let layout = await create_model(manager, '@jupyter-widgets/base', 'LayoutModel', 'LayoutView', 'layout_figure1', {_dom_classes: '', width: '400px', height: '500px'})

    let scale_x = await create_model_bqplot(manager, 'LinearScale', 'scale_x', {allow_padding: false})
    let scale_y = await create_model_bqplot(manager, 'LinearScale', 'scale_y', {allow_padding: false})

    let pieModel = await create_model_bqplot(manager, 'Pie', 'pie1', {
        sizes: sizes, labels: labels,
        visible: true, default_size: 64,
        preserve_domain: {}, _view_module_version: '*', _view_module: 'bqplot'})
    let figureModel;
    try {
        figureModel = await create_model_bqplot(manager, 'Figure', 'figure1', {scale_x: scale_x.toJSON(), scale_y: scale_y.toJSON(),
            layout: layout.toJSON(), _dom_classes: [],
            figure_padding_y: 0, fig_margin: {bottom: 0, left: 0, right: 0, top: 0},
            marks: [pieModel.toJSON()]})
    } catch(e) {
        console.error('error', e)
    }
    let figure  = await create_view(manager, figureModel);
    await manager.display_view(undefined, figure);
    await figure._initial_marks_created;
    return {figure: figure, pie: await figure.mark_views.views[0]}
}

export
async function create_figure_bars(manager, x, y) {
    let layout = await create_model(manager, '@jupyter-widgets/base', 'LayoutModel', 'LayoutView', 'layout_figure1', {_dom_classes: '', width: '400px', height: '500px'})
    let scale_x = await create_model_bqplot(manager, 'LinearScale', 'scale_x', {min:0, max:1, allow_padding: false})
    let scale_y = await create_model_bqplot(manager, 'LinearScale', 'scale_y', {min:0, max:3, allow_padding: false})
    let scales = {x: scale_x.toJSON(), y: scale_y.toJSON()}
    let color    = null;
    let size     = {type: null, values: null};
    let opacity  = {type: null, values: null};
    let rotation = {type: null, values: null};
    let skew     = {type: null, values: null};

    let barsModel = await create_model_bqplot(manager, 'Bars', 'bars1', {scales: scales,
        x: x, y: y, color: color, size: size, opacity: opacity, rotation: rotation, skew: skew,
        visible: true, default_size: 64,
        preserve_domain: {}, _view_module_version: '*', _view_module: 'bqplot'})
    let figureModel;
    try {
        figureModel = await create_model_bqplot(manager, 'Figure', 'figure1', {scale_x: scales['x'], scale_y: scales['y'],
            layout: layout.toJSON(), _dom_classes: [],
            figure_padding_y: 0, fig_margin: {bottom: 0, left: 0, right: 0, top: 0},
            marks: [barsModel.toJSON()]})
    } catch(e) {
        console.error('error', e)
    }
    let figure  = await create_view(manager, figureModel);
    await manager.display_view(undefined, figure);
    await figure._initial_marks_created;
    return {figure: figure, bars: await figure.mark_views.views[0]}
}

export
async function create_figure_hist(manager, sample, bins) {
    let layout = await create_model(manager, '@jupyter-widgets/base', 'LayoutModel', 'LayoutView', 'layout_figure1', {_dom_classes: '', width: '400px', height: '500px'})
    let scale_sample = await create_model_bqplot(manager, 'LinearScale', 'scale_sample', {allow_padding: false})
    let scale_count = await create_model_bqplot(manager, 'LinearScale', 'scale_count', {allow_padding: false})
    let scales = {sample: scale_sample.toJSON(), count: scale_count.toJSON()}

    let histModel = await create_model_bqplot(manager, 'Hist', 'hist1', {scales: scales,
        sample: sample, bins: bins,
        visible: true, default_size: 64,
        preserve_domain: {}, _view_module_version: '*', _view_module: 'bqplot'})
    let figureModel;
    try {
        figureModel = await create_model_bqplot(manager, 'Figure', 'figure1', {scale_x: scales.sample, scale_y: scales.count,
            layout: layout.toJSON(), _dom_classes: [],
            figure_padding_y: 0, fig_margin: {bottom: 0, left: 0, right: 0, top: 0},
            marks: [histModel.toJSON()]})
    } catch(e) {
        console.error('error', e)
    }
    let figure  = await create_view(manager, figureModel);
    await manager.display_view(undefined, figure);
    await figure._initial_marks_created;
    return {figure: figure, hist: await figure.mark_views.views[0]}
}

export
async function create_figure_gridheatmap(manager, color) {
    let layout = await create_model(manager, '@jupyter-widgets/base', 'LayoutModel', 'LayoutView', 'layout_figure1', {_dom_classes: '', width: '400px', height: '500px'});
    let scale_x = await create_model_bqplot(manager, 'LinearScale', 'scale_x', {min:0, max:1, allow_padding: false});
    let scale_y = await create_model_bqplot(manager, 'LinearScale', 'scale_y', {min:0, max:1, allow_padding: false});
    let scale_row = await create_model_bqplot(manager, 'OrdinalScale', 'scale_row', {reverse: true});
    let scale_column = await create_model_bqplot(manager, 'OrdinalScale', 'scale_column', {});
    let scale_color = await create_model_bqplot(manager, 'ColorScale', 'scale_color', {scheme: 'RdYlGn', colors: []});
    let scales = {color: scale_color.toJSON(), row: scale_row.toJSON(), column: scale_column.toJSON()};

    let gridModel = await create_model_bqplot(manager, 'GridHeatMap', 'gridheatmap1', {scales: scales,
        color: color,
        visible: true, default_size: 64,
        preserve_domain: {}, _view_module_version: '*', _view_module: 'bqplot'})
    let figureModel;
    try {
        figureModel = await create_model_bqplot(manager, 'Figure', 'figure1', {scale_x: scale_x.toJSON(), scale_y: scale_y.toJSON(),
            layout: layout.toJSON(), _dom_classes: [],
            padding_y: 0, fig_margin: {bottom: 0, left: 0, right: 0, top: 0},
            marks: [gridModel.toJSON()]})
    } catch(e) {
        console.error('error', e)
    }
    let figure  = await create_view(manager, figureModel);
    await manager.display_view(undefined, figure);
    await figure._initial_marks_created;
    return {figure: figure, grid: await figure.mark_views.views[0]}
}

export
function getFills (selection: any) {
    return selection.nodes().map((el) => el.style.fill);
}
