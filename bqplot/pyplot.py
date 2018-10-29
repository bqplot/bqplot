# Copyright 2015 Bloomberg Finance L.P.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

r"""

======
Pyplot
======

.. currentmodule:: bqplot.pyplot

.. autosummary::
   :toctree: _generate/

   figure
   show
   axes

   plot
   scatter
   hist
   bar
   ohlc
   geo

   clear
   close
   current_figure

   scales
   xlim
   ylim

   axes
   xlabel
   ylabel

"""
import sys
from collections import OrderedDict
from IPython.display import display
from ipywidgets import VBox
from ipywidgets import Image as ipyImage
from numpy import arange, issubdtype, array, column_stack, shape
from .figure import Figure
from .scales import Scale, LinearScale, Mercator
from .axes import Axis
from .marks import (Lines, Scatter, Hist, Bars, OHLC, Pie, Map, Image,
                    Label, HeatMap, GridHeatMap, topo_load, Boxplot, Bins)
from .toolbar import Toolbar
from .interacts import (BrushIntervalSelector, FastIntervalSelector,
                        BrushSelector, IndexSelector, MultiSelector,
                        LassoSelector)
from traitlets.utils.sentinel import Sentinel
import functools

Keep = Sentinel('Keep', 'bqplot.pyplot', '''
        Used in bqplot.pyplot to specify that the same scale should be used for
        a certain dimension.
        ''')
# `_context` object contains the global information for pyplot.
# `figure`: refers to the current figure to which marks will be added.
# `scales`: The current set of scales which will be used for drawing a mark. if
# the scale for an attribute is not present, it is created based on the range
# type.
# `scale_registry`: This is a dictionary where the keys are the context
# names and the values are the set of scales which were used on the last plot
# in that context. This is useful when switching context.
# `last_mark`: refers to the last mark that has been plotted.
# `current_key`: The key for the current context figure. If there is no key,
# then the value is `None`.
_context = {
    'figure': None,
    'figure_registry': {},
    'scales': {},
    'scale_registry': {},
    'last_mark': None,
    'current_key': None
}

LINE_STYLE_CODES = OrderedDict([(':', 'dotted'), ('-.', 'dash_dotted'),
                                ('--', 'dashed'), ('-', 'solid')])

COLOR_CODES = {'b': 'blue', 'g': 'green', 'r': 'red', 'c': 'cyan',
               'm': 'magenta', 'y': 'yellow', 'k': 'black'}

MARKER_CODES = {'o': 'circle', 'v': 'triangle-down', '^': 'triangle-up',
                's': 'square', 'd': 'diamond', '+': 'cross'}


PY2 = sys.version_info[0] == 2

if PY2:
    string_types = basestring,
else:
    string_types = str,


def hashable(data, v):
    """Determine whether `v` can be hashed."""
    try:
        data[v]
    except (TypeError, KeyError, IndexError):
        return False
    return True


def show(key=None, display_toolbar=True):
    """Shows the current context figure in the output area.

    Parameters
    ----------

    key : hashable, optional
        Any variable that can be used as a key for a dictionary.
    display_toolbar: bool (default: True)
        If True, a toolbar for different mouse interaction is displayed with
        the figure.

    Raises
    ------

    KeyError
        When no context figure is associated with the provided key.

    Examples
    --------

        >>> import numpy as np
        >>> import pyplot as plt
        >>> n = 100
        >>> x = np.arange(n)
        >>> y = np.cumsum(np.random.randn(n))
        >>> plt.plot(x,y)
        >>> plt.show()

    """
    if key is None:
        figure = current_figure()
    else:
        figure = _context['figure_registry'][key]
    if display_toolbar:
        if not hasattr(figure, 'pyplot'):
            figure.pyplot = Toolbar(figure=figure)
        display(VBox([figure, figure.pyplot]))
    else:
        display(figure)


def figure(key=None, fig=None, **kwargs):
    """Creates figures and switches between figures.

    If a ``bqplot.Figure`` object is provided via the fig optional argument,
    this figure becomes the current context figure.

    Otherwise:

    - If no key is provided, a new empty context figure is created.
    - If a key is provided for which a context already exists, the
      corresponding context becomes current.
    - If a key is provided and no corresponding context exists, a new context
      is reated for that key and becomes current.

    Besides, optional arguments allow to set or modify Attributes
    of the selected context figure.

    Parameters
    ----------
    key: hashable, optional
        Any variable that can be used as a key for a dictionary
    fig: Figure, optional
        A bqplot Figure

    """
    scales_arg = kwargs.pop('scales', {})
    _context['current_key'] = key
    if fig is not None:                                     # fig provided
        _context['figure'] = fig
        if key is not None:
            _context['figure_registry'][key] = fig
        for arg in kwargs:
            setattr(_context['figure'], arg, kwargs[arg])
    else:                                                   # no fig provided
        if key is None:                                     # no key provided
            _context['figure'] = Figure(**kwargs)
        else:                                               # a key is provided
            if key not in _context['figure_registry']:
                if 'title' not in kwargs:
                    kwargs['title'] = 'Figure' + ' ' + str(key)
                _context['figure_registry'][key] = Figure(**kwargs)
            _context['figure'] = _context['figure_registry'][key]
            for arg in kwargs:
                setattr(_context['figure'], arg, kwargs[arg])
    scales(key, scales=scales_arg)
    # Set the axis reference dictionary. This dictionary contains the mapping
    # from the possible dimensions in the figure to the list of scales with
    # respect to which axes have been drawn for this figure.
    # Used to automatically generate axis.
    if(getattr(_context['figure'], 'axis_registry', None) is None):
        setattr(_context['figure'], 'axis_registry', {})
    return _context['figure']


def close(key):
    """Closes and unregister the context figure corresponding to the key.

    Parameters
    ----------

    key: hashable
        Any variable that can be used as a key for a dictionary

    """
    figure_registry = _context['figure_registry']
    if key not in figure_registry:
        return
    if _context['figure'] == figure_registry[key]:
        figure()
    fig = figure_registry[key]
    if hasattr(fig, 'pyplot'):
        fig.pyplot.close()
    fig.close()
    del figure_registry[key]
    del _context['scale_registry'][key]


def _process_data(*kwarg_names):
    """Helper function to handle data keyword argument
    """
    def _data_decorator(func):
        @functools.wraps(func)
        def _mark_with_data(*args, **kwargs):
            data = kwargs.pop('data', None)
            if data is None:
                return func(*args, **kwargs)
            else:
                data_args = [data[i] if hashable(data, i) else i for i in args]
                data_kwargs = {
                   kw: data[kwargs[kw]] if hashable(data, kwargs[kw]) else kwargs[kw] for kw in set(kwarg_names).intersection(list(kwargs.keys()))
                }
                try:
                    # if any of the plots want to use the index_data, they can
                    # use it by referring to this attribute.
                    data_kwargs['index_data'] = data.index
                except AttributeError as e:
                    pass
                kwargs_update = kwargs.copy()
                kwargs_update.update(data_kwargs)
                return func(*data_args, **kwargs_update)

        return _mark_with_data
    return _data_decorator


def scales(key=None, scales={}):
    """Creates and switches between context scales.

    If no key is provided, a new blank context is created.

    If a key is provided for which a context already exists, the existing
    context is set as the current context.

    If a key is provided and no corresponding context exists, a new context is
    created for that key and set as the current context.

    Parameters
    ----------
    key: hashable, optional
        Any variable that can be used as a key for a dictionary
    scales: dictionary
        Dictionary of scales to be used in the new context

    Example
    -------

        >>> scales(scales={
        >>>    'x': Keep,
        >>>    'color': ColorScale(min=0, max=1)
        >>> })

    This creates a new scales context, where the 'x' scale is kept from the
    previous context, the 'color' scale is an instance of ColorScale
    provided by the user. Other scales, potentially needed such as the 'y'
    scale in the case of a line chart will be created on the fly when
    needed.

    Notes
    -----
    Every call to the function figure triggers a call to scales.

    The `scales` parameter is ignored if the `key` argument is not Keep and
    context scales already exist for that key.
    """
    old_ctxt = _context['scales']
    if key is None:  # No key provided
        _context['scales'] = {_get_attribute_dimension(k): scales[k] if scales[k] is not Keep
                              else old_ctxt[_get_attribute_dimension(k)] for k in scales}
    else:  # A key is provided
        if key not in _context['scale_registry']:
            _context['scale_registry'][key] = {
                _get_attribute_dimension(k): scales[k]
                if scales[k] is not Keep
                else old_ctxt[_get_attribute_dimension(k)]
                for k in scales
            }
        _context['scales'] = _context['scale_registry'][key]


def xlim(min, max):
    """Set the domain bounds of the current 'x' scale.
    """
    return set_lim(min, max, 'x')


def ylim(min, max):
    """Set the domain bounds of the current 'y' scale.
    """
    return set_lim(min, max, 'y')


def set_lim(min, max, name):
    """Set the domain bounds of the scale associated with the provided key.

    Parameters
    ----------
    name: hashable
        Any variable that can be used as a key for a dictionary

    Raises
    ------
    KeyError
        When no context figure is associated with the provided key.

    """
    scale = _context['scales'][_get_attribute_dimension(name)]
    scale.min = min
    scale.max = max
    return scale


def axes(mark=None, options={}, **kwargs):
    """Draws axes corresponding to the scales of a given mark.

    It also returns a dictionary of drawn axes. If the mark is not provided,
    the last drawn mark is used.

    Parameters
    ----------
    mark: Mark or None (default: None)
        The mark to inspect to create axes. If None, the last mark drawn is
        used instead.
    options: dict (default: {})
        Options for the axes to be created. If a scale labeled 'x' is required
        for that mark, options['x'] contains optional keyword arguments for the
        constructor of the corresponding axis type.
    """
    if mark is None:
        mark = _context['last_mark']
    if mark is None:
        return {}
    fig = kwargs.get('figure', current_figure())
    scales = mark.scales
    fig_axes = [axis for axis in fig.axes]
    axes = {}
    for name in scales:
        if name not in mark.class_trait_names(scaled=True):
            # The scale is not needed.
            continue
        scale_metadata = mark.scales_metadata.get(name, {})
        dimension = scale_metadata.get('dimension', scales[name])
        axis_args = dict(scale_metadata,
                         **(options.get(name, {})))

        axis = _fetch_axis(fig, dimension, scales[name])
        if axis is not None:
            # For this figure, an axis exists for the scale in the given
            # dimension. Apply the properties and return back the object.
            _apply_properties(axis, options.get(name, {}))
            axes[name] = axis
            continue

        # An axis must be created. We fetch the type from the registry
        # the key being provided in the scaled attribute decoration
        key = mark.class_traits()[name].get_metadata('atype')
        if(key is not None):
            axis_type = Axis.axis_types[key]
            axis = axis_type(scale=scales[name], **axis_args)
            axes[name] = axis
            fig_axes.append(axis)
            # Update the axis registry of the figure once the axis is added
            _update_fig_axis_registry(fig, dimension, scales[name], axis)
    fig.axes = fig_axes
    return axes


def _set_label(label, mark, dim, **kwargs):
    """Helper function to set labels for an axis
    """
    if mark is None:
        mark = _context['last_mark']
    if mark is None:
        return {}
    fig = kwargs.get('figure', current_figure())
    scales = mark.scales
    scale_metadata = mark.scales_metadata.get(dim, {})
    scale = scales.get(dim, None)
    if scale is None:
        return
    dimension = scale_metadata.get('dimension', scales[dim])
    axis = _fetch_axis(fig, dimension, scales[dim])

    if axis is not None:
        _apply_properties(axis, {'label': label})


def xlabel(label=None, mark=None, **kwargs):
    """Sets the value of label for an axis whose associated scale has the
    dimension `x`.

    Parameters
    ----------
    label: Unicode or None (default: None)
        The label for x axis
    """
    _set_label(label, mark, 'x', **kwargs)


def ylabel(label=None, mark=None, **kwargs):
    """Sets the value of label for an axis whose associated scale has the
    dimension `y`.

    Parameters
    ----------
    label: Unicode or None (default: None)
        The label for y axis
    """
    _set_label(label, mark, 'y', **kwargs)


def grids(fig=None, value='solid'):
    """Sets the value of the grid_lines for the axis to the passed value.
    The default value is `solid`.

    Parameters
    ----------
    fig: Figure or None(default: None)
        The figure for which the axes should be edited. If the value is None,
        the current figure is used.
    value: {'none', 'solid', 'dashed'}
        The display of the grid_lines
    """

    if fig is None:
        fig = current_figure()
    for a in fig.axes:
        a.grid_lines = value


def title(label, style=None):
    """Sets the title for the current figure.

    Parameters
    ----------
    label : str
        The new title for the current figure.
    style: dict
        The CSS style to be applied to the figure title
    """
    fig = current_figure()
    fig.title = label
    if style is not None:
        fig.title_style = style


def legend():
    """Places legend in the current figure."""
    for m in current_figure().marks:
        m.display_legend = True


def hline(level, **kwargs):
    """Draws a horizontal line at the given level.

    Parameters
    ----------
    level: float
        The level at which to draw the horizontal line.
    preserve_domain: boolean (default: False)
        If true, the line does not affect the domain of the 'y' scale.
    """
    kwargs.setdefault('colors', ['dodgerblue'])
    kwargs.setdefault('stroke_width', 1)
    scales = kwargs.pop('scales', {})
    fig = kwargs.get('figure', current_figure())
    scales['x'] = fig.scale_x

    level = array(level)
    if len(level.shape) == 0:
        x = [0, 1]
        y = [level, level]
    else:
        x = [0, 1]
        y = column_stack([level, level])
    return plot(x, y, scales=scales, preserve_domain={
        'x': True,
        'y': kwargs.get('preserve_domain', False)
    }, axes=False, update_context=False, **kwargs)


def vline(level, **kwargs):
    """Draws a vertical line at the given level.

    Parameters
    ----------
    level: float
        The level at which to draw the vertical line.
    preserve_domain: boolean (default: False)
        If true, the line does not affect the domain of the 'x' scale.
    """
    kwargs.setdefault('colors', ['dodgerblue'])
    kwargs.setdefault('stroke_width', 1)
    scales = kwargs.pop('scales', {})
    fig = kwargs.get('figure', current_figure())
    scales['y'] = fig.scale_y

    level = array(level)
    if len(level.shape) == 0:
        x = [level, level]
        y = [0, 1]
    else:
        x = column_stack([level, level])
        # TODO: repeating [0, 1] should not be required once we allow for
        # 2-D x and 1-D y
        y = [[0, 1]] * len(level)
    return plot(x, y, scales=scales, preserve_domain={
        'x': kwargs.get('preserve_domain', False),
        'y': True
    }, axes=False, update_context=False, **kwargs)


def _process_cmap(cmap):
    '''
    Returns a kwarg dict suitable for a ColorScale
    '''
    option = {}
    if isinstance(cmap, str):
        option['scheme'] = cmap
    elif isinstance(cmap, list):
        option['colors'] = cmap
    else:
        raise ValueError('''`cmap` must be a string (name of a color scheme)
                         or a list of colors, but a value of {} was given
                         '''.format(cmap))
    return option


def set_cmap(cmap):
    '''
    Set the color map of the current 'color' scale.
    '''
    scale = _context['scales']['color']
    for k, v in _process_cmap(cmap).items():
        setattr(scale, k, v)
    return scale


def _draw_mark(mark_type, options={}, axes_options={}, **kwargs):
    """Draw the mark of specified mark type.

    Parameters
    ----------
    mark_type: type
        The type of mark to be drawn
    options: dict (default: {})
        Options for the scales to be created. If a scale labeled 'x' is
        required for that mark, options['x'] contains optional keyword
        arguments for the constructor of the corresponding scale type.
    axes_options: dict (default: {})
        Options for the axes to be created. If an axis labeled 'x' is required
        for that mark, axes_options['x'] contains optional keyword arguments
        for the constructor of the corresponding axis type.
    figure: Figure or None
        The figure to which the mark is to be added.
        If the value is None, the current figure is used.
    cmap: list or string
        List of css colors, or name of bqplot color scheme
    """
    fig = kwargs.pop('figure', current_figure())
    scales = kwargs.pop('scales', {})
    update_context = kwargs.pop('update_context', True)

    # Set the color map of the color scale
    cmap = kwargs.pop('cmap', None)
    if cmap is not None:
        # Add the colors or scheme to the color scale options
        options['color'] = dict(options.get('color', {}),
                                **_process_cmap(cmap))

    # Going through the list of data attributes
    for name in mark_type.class_trait_names(scaled=True):
        dimension = _get_attribute_dimension(name, mark_type)
        # TODO: the following should also happen if name in kwargs and
        # scales[name] is incompatible.
        if name not in kwargs:
            # The scaled attribute is not being passed to the mark. So no need
            # create a scale for this.
            continue
        elif name in scales:
            if update_context:
                _context['scales'][dimension] = scales[name]
        # Scale has to be fetched from the context or created as it has not
        # been passed.
        elif dimension not in _context['scales']:
            # Creating a scale for the dimension if a matching scale is not
            # present in _context['scales']
            traitlet = mark_type.class_traits()[name]
            rtype = traitlet.get_metadata('rtype')
            dtype = traitlet.validate(None, kwargs[name]).dtype
            # Fetching the first matching scale for the rtype and dtype of the
            # scaled attributes of the mark.
            compat_scale_types = [
                    Scale.scale_types[key]
                    for key in Scale.scale_types
                    if Scale.scale_types[key].rtype == rtype and
                    issubdtype(dtype, Scale.scale_types[key].dtype)
                ]
            sorted_scales = sorted(compat_scale_types,
                                   key=lambda x: x.precedence)
            scales[name] = sorted_scales[-1](**options.get(name, {}))
            # Adding the scale to the context scales
            if update_context:
                _context['scales'][dimension] = scales[name]
        else:
            scales[name] = _context['scales'][dimension]

    mark = mark_type(scales=scales, **kwargs)
    _context['last_mark'] = mark
    fig.marks = [m for m in fig.marks] + [mark]
    if kwargs.get('axes', True):
        axes(mark, options=axes_options)
    return mark


def _infer_x_for_line(y):
    """
    Infers the x for a line if no x is provided.
    """
    array_shape = shape(y)

    if len(array_shape) == 0:
        return []
    if len(array_shape) == 1:
        return arange(array_shape[0])
    if len(array_shape) > 1:
        return arange(array_shape[1])


@_process_data('color')
def plot(*args, **kwargs):
    """Draw lines in the current context figure.

    Signature: `plot(x, y, **kwargs)` or `plot(y, **kwargs)`, depending of the
    length of the list of positional arguments. In the case where the `x` array
    is not provided.

    Parameters
    ----------
    x: numpy.ndarray or list, 1d or 2d (optional)
        The x-coordinates of the plotted line. When not provided, the function
        defaults to `numpy.arange(len(y))`
        x can be 1-dimensional or 2-dimensional.
    y: numpy.ndarray or list, 1d or 2d
        The y-coordinates of the plotted line. If argument `x` is 2-dimensional
        it must also be 2-dimensional.
    marker_str: string
        string representing line_style, marker and color.
        For e.g. 'g--o', 'sr' etc
    options: dict (default: {})
        Options for the scales to be created. If a scale labeled 'x' is
        required for that mark, options['x'] contains optional keyword
        arguments for the constructor of the corresponding scale type.
    axes_options: dict (default: {})
        Options for the axes to be created. If an axis labeled 'x' is required
        for that mark, axes_options['x'] contains optional keyword arguments
        for the constructor of the corresponding axis type.
    figure: Figure or None
        The figure to which the line is to be added.
        If the value is None, the current figure is used.
    """
    marker_str = None
    if len(args) == 1:
        kwargs['y'] = args[0]
        if kwargs.get('index_data', None) is not None:
            kwargs['x'] = kwargs['index_data']
        else:
            kwargs['x'] = _infer_x_for_line(args[0])
    elif len(args) == 2:
        if type(args[1]) == str:
            kwargs['y'] = args[0]
            kwargs['x'] = _infer_x_for_line(args[0])
            marker_str = args[1].strip()
        else:
            kwargs['x'] = args[0]
            kwargs['y'] = args[1]
    elif len(args) == 3:
        kwargs['x'] = args[0]
        kwargs['y'] = args[1]
        if type(args[2]) == str:
            marker_str = args[2].strip()

    if marker_str:
        line_style, color, marker = _get_line_styles(marker_str)

        # only marker specified => draw scatter
        if marker and not line_style:
            kwargs['marker'] = marker
            if color:
                kwargs['colors'] = [color]
            return _draw_mark(Scatter, **kwargs)
        else:  # draw lines in all other cases
            kwargs['line_style'] = line_style or 'solid'

            if marker:
                kwargs['marker'] = marker
            if color:
                kwargs['colors'] = [color]
            return _draw_mark(Lines, **kwargs)
    else:
        return _draw_mark(Lines, **kwargs)


def imshow(image, format, **kwargs):
    """Draw an image in the current context figure.
    Parameters
    ----------
    image: image data
        Image data, depending on the passed format, can be one of:
            - an instance of an ipywidgets Image
            - a file name
            - a raw byte string
    format: {'widget', 'filename', ...}
        Type of the input argument.
        If not 'widget' or 'filename', must be a format supported by
        the ipywidgets Image.
    options: dict (default: {})
        Options for the scales to be created. If a scale labeled 'x' is
        required for that mark, options['x'] contains optional keyword
        arguments for the constructor of the corresponding scale type.
    axes_options: dict (default: {})
        Options for the axes to be created. If an axis labeled 'x' is required
        for that mark, axes_options['x'] contains optional keyword arguments
        for the constructor of the corresponding axis type.
    """
    if format == 'widget':
        ipyimage = image
    elif format == 'filename':
        with open(image, 'rb') as f:
            data = f.read()
            ipyimage = ipyImage(value=data)
    else:
        ipyimage = ipyImage(value=image, format=format)
    kwargs['image'] = ipyimage

    kwargs.setdefault('x', [0., 1.])
    kwargs.setdefault('y', [0., 1.])

    return _draw_mark(Image, **kwargs)


def ohlc(*args, **kwargs):
    """Draw OHLC bars or candle bars in the current context figure.

    Signature: `ohlc(x, y, **kwargs)` or `ohlc(y, **kwargs)`, depending of the
    length of the list of positional arguments. In the case where the `x` array
    is not provided

    Parameters
    ----------
    x: numpy.ndarray or list, 1d (optional)
        The x-coordinates of the plotted line. When not provided, the function
        defaults to `numpy.arange(len(y))`.
    y: numpy.ndarray or list, 2d
        The ohlc (open/high/low/close) information. A two dimensional array. y
        must have the shape (n, 4).
    options: dict (default: {})
        Options for the scales to be created. If a scale labeled 'x' is
        required for that mark, options['x'] contains optional keyword
        arguments for the constructor of the corresponding scale type.
    axes_options: dict (default: {})
        Options for the axes to be created. If an axis labeled 'x' is required
        for that mark, axes_options['x'] contains optional keyword arguments
        for the constructor of the corresponding axis type.
    """
    if len(args) == 2:
        kwargs['x'] = args[0]
        kwargs['y'] = args[1]
    elif len(args) == 1:
        kwargs['y'] = args[0]
        length = len(args[0])
        kwargs['x'] = arange(length)
    return _draw_mark(OHLC, **kwargs)


@_process_data('color', 'opacity', 'size', 'skew', 'rotation')
def scatter(x, y, **kwargs):
    """Draw a scatter in the current context figure.

    Parameters
    ----------

    x: numpy.ndarray, 1d
        The x-coordinates of the data points.
    y: numpy.ndarray, 1d
        The y-coordinates of the data points.
    options: dict (default: {})
        Options for the scales to be created. If a scale labeled 'x' is
        required for that mark, options['x'] contains optional keyword
        arguments for the constructor of the corresponding scale type.
    axes_options: dict (default: {})
        Options for the axes to be created. If an axis labeled 'x' is required
        for that mark, axes_options['x'] contains optional keyword arguments
        for the constructor of the corresponding axis type.
    """
    kwargs['x'] = x
    kwargs['y'] = y
    return _draw_mark(Scatter, **kwargs)


@_process_data()
def hist(sample, options={}, **kwargs):
    """Draw a histogram in the current context figure.

    Parameters
    ----------
    sample: numpy.ndarray, 1d
        The sample for which the histogram must be generated.
    options: dict (default: {})
        Options for the scales to be created. If a scale labeled 'counts'
        is required for that mark, options['counts'] contains optional keyword
        arguments for the constructor of the corresponding scale type.
    axes_options: dict (default: {})
        Options for the axes to be created. If an axis labeled 'counts' is
        required for that mark, axes_options['counts'] contains optional
        keyword arguments for the constructor of the corresponding axis type.
    """
    kwargs['sample'] = sample
    scales = kwargs.pop('scales', {})
    if 'count' not in scales:
        dimension = _get_attribute_dimension('count', Hist)
        if dimension in _context['scales']:
            scales['count'] = _context['scales'][dimension]
        else:
            scales['count'] = LinearScale(**options.get('count', {}))
            _context['scales'][dimension] = scales['count']
    kwargs['scales'] = scales
    return _draw_mark(Hist, options=options, **kwargs)


@_process_data()
def bin(sample, options={}, **kwargs):
    """Draw a histogram in the current context figure.
    Parameters
    ----------
    sample: numpy.ndarray, 1d
        The sample for which the histogram must be generated.
    options: dict (default: {})
        Options for the scales to be created. If a scale labeled 'x'
        is required for that mark, options['x'] contains optional keyword
        arguments for the constructor of the corresponding scale type.
    axes_options: dict (default: {})
        Options for the axes to be created. If an axis labeled 'x' is
        required for that mark, axes_options['x'] contains optional
        keyword arguments for the constructor of the corresponding axis type.
    """
    kwargs['sample'] = sample
    scales = kwargs.pop('scales', {})
    for xy in ['x', 'y']:
        if xy not in scales:
            dimension = _get_attribute_dimension(xy, Bars)
            if dimension in _context['scales']:
                scales[xy] = _context['scales'][dimension]
            else:
                scales[xy] = LinearScale(**options.get(xy, {}))
                _context['scales'][dimension] = scales[xy]
    kwargs['scales'] = scales
    return _draw_mark(Bins, options=options, **kwargs)


@_process_data('color')
def bar(x, y, **kwargs):
    """Draws a bar chart in the current context figure.

    Parameters
    ----------

    x: numpy.ndarray, 1d
        The x-coordinates of the data points.
    y: numpy.ndarray, 1d
        The y-coordinates of the data pints.
    options: dict (default: {})
        Options for the scales to be created. If a scale labeled 'x' is
        required for that mark, options['x'] contains optional keyword
        arguments for the constructor of the corresponding scale type.
    axes_options: dict (default: {})
        Options for the axes to be created. If an axis labeled 'x' is required
        for that mark, axes_options['x'] contains optional keyword arguments
        for the constructor of the corresponding axis type.
    """
    kwargs['x'] = x
    kwargs['y'] = y
    return _draw_mark(Bars, **kwargs)


@_process_data()
def boxplot(x, y, **kwargs):
    """Draws a boxplot in the current context figure.

    Parameters
    ----------

    x: numpy.ndarray, 1d
        The x-coordinates of the data points.
    y: numpy.ndarray, 2d
        The data from which the boxes are to be created. Each row of the data
        corresponds to one box drawn in the plot.
    options: dict (default: {})
        Options for the scales to be created. If a scale labeled 'x' is
        required for that mark, options['x'] contains optional keyword
        arguments for the constructor of the corresponding scale type.
    axes_options: dict (default: {})
        Options for the axes to be created. If an axis labeled 'x' is required
        for that mark, axes_options['x'] contains optional keyword arguments
        for the constructor of the corresponding axis type.
    """
    kwargs['x'] = x
    kwargs['y'] = y
    return _draw_mark(Boxplot, **kwargs)


@_process_data('color')
def barh(*args, **kwargs):
    """Draws a horizontal bar chart in the current context figure.

    Parameters
    ----------

    x: numpy.ndarray, 1d
        The domain of the data points.
    y: numpy.ndarray, 1d
        The range of the data pints.
    options: dict (default: {})
        Options for the scales to be created. If a scale labeled 'x' is
        required for that mark, options['x'] contains optional keyword
        arguments for the constructor of the corresponding scale type.
    axes_options: dict (default: {})
        Options for the axes to be created. If an axis labeled 'x' is required
        for that mark, axes_options['x'] contains optional keyword arguments
        for the constructor of the corresponding axis type.
    """
    kwargs['orientation'] = "horizontal"
    return bar(*args, **kwargs)


@_process_data('color')
def pie(sizes, **kwargs):
    """Draws a Pie in the current context figure.

    Parameters
    ----------
    sizes: numpy.ndarray, 1d
        The proportions to be represented by the Pie.
    options: dict (default: {})
        Options for the scales to be created. If a scale labeled 'x' is
        required for that mark, options['x'] contains optional keyword
        arguments for the constructor of the corresponding scale type.
    axes_options: dict (default: {})
        Options for the axes to be created. If an axis labeled 'x' is required
        for that mark, axes_options['x'] contains optional keyword arguments
        for the constructor of the corresponding axis type.
    """
    kwargs['sizes'] = sizes
    return _draw_mark(Pie, **kwargs)


def label(text, **kwargs):
    """Draws a Label in the current context figure.

    Parameters
    ----------

    text: string
        The label to be displayed.
    options: dict (default: {})
        Options for the scales to be created. If a scale labeled 'x' is
        required for that mark, options['x'] contains optional keyword
        arguments for the constructor of the corresponding scale type.
    axes_options: dict (default: {})
        Options for the axes to be created. If an axis labeled 'x' is required
        for that mark, axes_options['x'] contains optional keyword arguments
        for the constructor of the corresponding axis type.
    """
    kwargs['text'] = text
    return _draw_mark(Label, **kwargs)


def geo(map_data, **kwargs):
    """Draw a map in the current context figure.

    Parameters
    ----------
    map_data: string or bqplot.map (default: WorldMap)
        Name of the map or json file required for the map data.
    options: dict (default: {})
        Options for the scales to be created. If a scale labeled 'x' is
        required for that mark, options['x'] contains optional keyword
        arguments for the constructor of the corresponding scale type.
    axes_options: dict (default: {})
        Options for the axes to be created. If an axis labeled 'x' is required
        for that mark, axes_options['x'] contains optional keyword arguments
        for the constructor of the corresponding axis type.
    """
    scales = kwargs.pop('scales', _context['scales'])
    options = kwargs.get('options', {})
    if 'projection' not in scales:
        scales['projection'] = Mercator(**options.get('projection', {}))
    kwargs['scales'] = scales
    if isinstance(map_data, string_types):
        kwargs['map_data'] = topo_load('map_data/' + map_data + '.json')
    else:
        kwargs['map_data'] = map_data
    return _draw_mark(Map, **kwargs)


def heatmap(color, **kwargs):
    """Draw a heatmap in the current context figure.

    Parameters
    ----------
    color: numpy.ndarray, 2d
        Matrix of color of the data points
    options: dict (default: {})
        Options for the scales to be created. If a scale labeled 'x' is
        required for that mark, options['x'] contains optional keyword
        arguments for the constructor of the corresponding scale type.
    axes_options: dict (default: {})
        Options for the axes to be created. If an axis labeled 'x' is required
        for that mark, axes_options['x'] contains optional keyword arguments
        for the constructor of the corresponding axis type.
    """
    kwargs['color'] = color
    return _draw_mark(HeatMap, **kwargs)


def gridheatmap(color, **kwargs):
    """Draw a GridHeatMap in the current context figure.

    Parameters
    ----------
    color: numpy.ndarray, 2d
        Matrix of color of the data points
    options: dict (default: {})
        Options for the scales to be created. If a scale labeled 'x' is
        required for that mark, options['x'] contains optional keyword
        arguments for the constructor of the corresponding scale type.
    axes_options: dict (default: {})
        Options for the axes to be created. If an axis labeled 'x' is required
        for that mark, axes_options['x'] contains optional keyword arguments
        for the constructor of the corresponding axis type.
    """
    kwargs['color'] = color
    return _draw_mark(GridHeatMap, **kwargs)


def _add_interaction(int_type, **kwargs):
    """Add the interaction for the specified type.

    If a figure is passed using the key-word argument `figure` it is used. Else
    the context figure is used.
    If a list of marks are passed using the key-word argument `marks` it
    is used. Else the latest mark that is passed is used as the only mark
    associated with the selector.

    Parameters
    ----------
    int_type: type
        The type of interaction to be added.
    """

    fig = kwargs.pop('figure', current_figure())
    marks = kwargs.pop('marks', [_context['last_mark']])

    for name, traitlet in int_type.class_traits().items():
        dimension = traitlet.get_metadata('dimension')
        if dimension is not None:
            # only scales have this attribute in interactions
            kwargs[name] = _get_context_scale(dimension)
    kwargs['marks'] = marks
    interaction = int_type(**kwargs)
    if fig.interaction is not None:
        fig.interaction.close()
    fig.interaction = interaction
    return interaction


def _get_context_scale(dimension):
    """Return the scale instance in the current context for a given dimension.

    Parameters
    ----------

    dimension: string
        The dimension along which the current context scale is to be fetched.
    """
    return _context['scales'][dimension]


def _create_selector(int_type, func, trait, **kwargs):
    """Create a selector of the specified type.

    Also attaches the function `func` as an `on_trait_change` listener
    for the trait `trait` of the selector.

    This is an internal function which should not be called by the user.

    Parameters
    ----------

    int_type: type
        The type of selector to be added.
    func: function
        The call back function. It should take atleast two arguments. The name
        of the trait and the value of the trait are passed as arguments.
    trait: string
        The name of the Selector trait whose change triggers the
        call back function `func`.
    """
    interaction = _add_interaction(int_type, **kwargs)
    if func is not None:
        interaction.on_trait_change(func, trait)
    return interaction


def brush_int_selector(func=None, trait='selected', **kwargs):
    """Create a `BrushIntervalSelector` interaction for the `figure`.

    Also attaches the function `func` as an event listener for the
    specified trait.

    Parameters
    ----------

    func: function
        The call back function. It should take atleast two arguments. The name
        of the trait and the value of the trait are passed as arguments.
    trait: string
        The name of the BrushIntervalSelector trait whose change triggers the
        call back function `func`.
    """
    return _create_selector(BrushIntervalSelector, func, trait, **kwargs)


def int_selector(func=None, trait='selected', **kwargs):
    """Creates a `FastIntervalSelector` interaction for the `figure`.

    Also attaches the function `func` as an event listener for the
    trait `trait`.

    Parameters
    ----------

    func: function
        The call back function. It should take atleast two arguments. The name
        of the trait and the value of the trait are passed as arguments.
    trait: string
        The name of the IntervalSelector trait whose change triggers the
        call back function `func`.
    """
    return _create_selector(FastIntervalSelector, func, trait, **kwargs)


def index_selector(func=None, trait='selected', **kwargs):
    """Creates an `IndexSelector` interaction for the `figure`.

    Also attaches the function `func` as an event listener for the
    trait `trait`.

    Parameters
    ----------

    func: function
        The call back function. It should take atleast two arguments. The name
        of the trait and the value of the trait are passed as arguments.
    trait: string
        The name of the IndexSelector trait whose change triggers the
        call back function `func`.
    """
    return _create_selector(IndexSelector, func, trait, **kwargs)


def brush_selector(func=None, trait='selected', **kwargs):
    """Creates a `BrushSelector` interaction for the `figure`.

    Also attaches the function `func` as an event listener for the
    trait `trait`.

    Parameters
    ----------

    func: function
        The call back function. It should take atleast two arguments. The name
        of the trait and the value of the trait are passed as arguments.
    trait: string
        The name of the BrushSelector trait whose change triggers the
        call back function `func`.
    """
    return _create_selector(BrushSelector, func, trait, **kwargs)


def multi_selector(func=None, trait='selected', **kwargs):
    """Creates a `MultiSelector` interaction for the `figure`.

    Also attaches the function `func` as an event listener for the
    trait `trait`.

    Parameters
    ----------

    func: function
        The call back function. It should take atleast two arguments. The name
        of the trait and the value of the trait are passed as arguments.
    trait: string
        The name of the MultiSelector trait whose change triggers the
        call back function `func`.
    """
    return _create_selector(MultiSelector, func, trait, **kwargs)


def lasso_selector(func=None, trait='selected', **kwargs):
    """Creates a `LassoSelector` interaction for the `figure`.

    Also attaches the function `func` as an event listener for the
    specified trait.

    Parameters
    ----------

    func: function
        The call back function. It should take atleast two arguments. The name
        of the trait and the value of the trait are passed as arguments.
    trait: string
        The name of the LassoSelector trait whose change triggers the
        call back function `func`.
    """
    return _create_selector(LassoSelector, func, trait, **kwargs)


def clear():
    """Clears the current context figure of all marks axes and grid lines."""
    fig = _context['figure']
    if fig is not None:
        fig.marks = []
        fig.axes = []
        setattr(fig, 'axis_registry', {})
        _context['scales'] = {}
        key = _context['current_key']
        if key is not None:
            _context['scale_registry'][key] = {}


def current_figure():
    """Returns the current context figure."""
    if _context['figure'] is None:
        figure()
    return _context['figure']

# FOR DEBUG ONLY


def get_context():
    """Used for debug only. Return a copy of the current global
    context dictionary."""
    return {k: v for k, v in _context.items()}


def set_context(context):
    """Sets the current global context dictionary. All the attributes to be set
    should be set. Otherwise, it will result in unpredictable behavior."""
    global _context
    _context = {k: v for k, v in context.items()}


def _fetch_axis(fig, dimension, scale):
    # Internal utility function.
    # Given a figure instance `fig`, the dimension of the scaled attribute and
    # the instance of a scale, returns the axis if an axis is present for that
    # combination. Else returns `None`
    axis_registry = getattr(fig, 'axis_registry', {})
    dimension_data = axis_registry.get(dimension, [])
    dimension_scales = [dim['scale'] for dim in dimension_data]
    dimension_axes = [dim['axis'] for dim in dimension_data]
    try:
        return dimension_axes[dimension_scales.index(scale)]
    except (ValueError, IndexError):
        return None


def _update_fig_axis_registry(fig, dimension, scale, axis):
    axis_registry = fig.axis_registry
    dimension_scales = axis_registry.get(dimension, [])
    dimension_scales.append({'scale': scale, 'axis': axis})
    axis_registry[dimension] = dimension_scales
    setattr(fig, 'axis_registry', axis_registry)


def _get_attribute_dimension(trait_name, mark_type=None):
    """Returns the dimension for the name of the trait for the specified mark.

    If `mark_type` is `None`, then the `trait_name` is returned
    as is.
    Returns `None` if the `trait_name` is not valid for `mark_type`.
    """
    if(mark_type is None):
        return trait_name
    scale_metadata = mark_type.class_traits()['scales_metadata']\
        .default_args[0]
    return scale_metadata.get(trait_name, {}).get('dimension', None)


def _apply_properties(widget, properties={}):
    """Applies the specified properties to the widget.

    `properties` is a dictionary with key value pairs corresponding
    to the properties to be applied to the widget.
    """
    with widget.hold_sync():
        for key, value in properties.items():
            setattr(widget, key, value)


def _get_line_styles(marker_str):
    """Return line style, color and marker type from specified marker string.

    For example, if ``marker_str`` is 'g-o' then the method returns
    ``('solid', 'green', 'circle')``.
    """
    def _extract_marker_value(marker_str, code_dict):
        """Extracts the marker value from a given marker string.

        Looks up the `code_dict` and returns the corresponding marker for a
        specific code.

        For example if `marker_str` is 'g-o' then the method extracts
        - 'green' if the code_dict is color_codes,
        - 'circle' if the code_dict is marker_codes etc.
        """
        val = None
        for code in code_dict:
            if code in marker_str:
                val = code_dict[code]
                break
        return val

    return [_extract_marker_value(marker_str, code_dict) for
            code_dict in [LINE_STYLE_CODES, COLOR_CODES, MARKER_CODES]]
