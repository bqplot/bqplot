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

.. currentmodule:: bqplot.pyplot.pyplot

.. autosummary::
   :toctree: generate/

   figure
   show
   axes

   plot
   scatter
   hist
   bar

   clear
   close
   current_figure

   scales
   xlim
   ylim

"""

from IPython.display import display
import numpy as np
from ..figure import Figure
from ..scales import Scale, LinearScale
from ..axes import Axis
from ..marks import Lines, Scatter, Hist, Bars, OHLC
from ..overlays import panzoom
from IPython.html.widgets import VBox, HBox as ButtonGroup
from IPython.html.widgets import Button as FaButton, ToggleButton as FaToggleButton

_context = {
    'figure': None,
    'figure_registry': {},
    'scales': {},
    'scale_registry': {},
    'last_mark': None
}


def _default_toolbar(figure):
    pz = panzoom(figure.marks)
    normal_btn = FaToggleButton('fa-circle-o', tooltip='Normal', value=True)
    pz_btn = FaToggleButton('fa-arrows', tooltip='Pan and Zoom', value=False)
    snapshot_btn = FaButton('fa-camera', tooltip='Snapshot View')
    reset_btn = FaButton('fa-refresh', tooltip='Reset View')

    def tog(btn, *args):
        # Traitlets closure
        def cb():
            for other in args:
                other.value = not btn.value
        return cb

    def overl(btn, value):
        # Traitlets closure
        def cb():
            if btn.value:
                figure.overlay = value
        return cb

    def snapshot(_):
        pz.snapshot()

    def reset(_):
        pz.reset()

    pz_btn.on_trait_change(tog(pz_btn, normal_btn))
    pz_btn.on_trait_change(overl(pz_btn, pz))

    normal_btn.on_trait_change(tog(normal_btn, pz_btn))
    normal_btn.on_trait_change(overl(normal_btn, None))

    snapshot_btn.on_click(snapshot)
    reset_btn.on_click(reset)
    figure.overlay = None

    return ButtonGroup([normal_btn, pz_btn, snapshot_btn, reset_btn])


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
        >>> x = np.linspace(0.0, 100.0, n)
        >>> y = np.cumsum(np.random.randn(n))
        >>> plt.plot(x,y)
        >>> plt.show()

    """
    if key is None:
        figure = current_figure()
    else:
        figure = _context['figure_registry'][key]
    if display_toolbar:
        toolbar = _default_toolbar(figure)
        display(VBox([figure, toolbar]))
    else:
        display(figure)


def figure(key=None, fig=None, **kwargs):
    """Creates and switches between context figures.

    If a bqplot.Figure object is provided via the fig optional argument, this
    figure becomes the current context figure.

    Otherwise:

    If no key is provided, a new empty context figure is created.

    If a key is provided for which a context already exists, the corresponding
    context becomes current.

    If a key is provided and no corresponding context exists, a new context is
    created for that key and becomes current.

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


def close(key):
    """Closes and unregister the context figure corresponding to the key

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
    figure_registry[key].close()
    del figure_registry[key]


Keep = Ellipsis


def scales(key=None, scales={}):
    """Creates and switches between context scales

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
        Dictionary of scales to be used in the new context.

        This parameter is ignored if the `key` argument is not Keep and context
        scales already exist for that key.

        For example:

        scales(scales={
                          'x': Keep,
                          'color': ColorScale(min=0, max=1)
                      })
        Creates a new scales context, where the 'x' scale is kept from the
        previous context, the 'color' scale is an instance of ColorScale
        provided by the user. Other scales, potentially needed such as the 'y'
        scale in the case of a line chart will be created on the fly when
        needed.

    Notes
    -----
    Every call to the function figure triggers a call to scales.

    """
    old_ctxt = _context['scales']
    if key is None:  # No key provided
        _context['scales'] = {k: scales[k] if scales[k] is not Ellipsis
                              else old_ctxt[k] for k in scales}
    else:  # A key is provided
        if key not in _context['scale_registry']:
            _context['scale_registry'][key] = {k: scales[k] if scales[k]
                                               is not Ellipsis else old_ctxt[k]
                                               for k in scales}
        _context['scales'] = _context['scale_registry'][key]


def xlim(min, max):
    """Sets the domain bounds of the current 'x' scale.
    """
    return set_lim(min, max, 'x')


def ylim(min, max):
    """Sets the domain bounds of the current 'y' scale.
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
    scale = _context['scales'][name]
    scale.min = min
    scale.max = max
    return scale


def axes(mark=None, options={}, **kwargs):
    """Draws axes corresponding to the scales of a given mark and returns a
    dictionary of drawn axes. If not mark is provided, the last drawn mark
    is used.

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
    if not hasattr(mark, 'pyplot_axes'):
        mark.pyplot_axes = {}
    axes = mark.pyplot_axes.get(fig.model_id, {})
    fig_axes = [axis for axis in fig.axes]
    for name in scales:
        if name not in mark.class_trait_names(scaled=True):
            # Pass if the scale is not needed.
            continue
        if name in axes:
            # Pass if there is already an axis for this scaled attribute.
            continue
        key = mark.class_traits()[name].get_metadata('atype', 'bqplot.Axis')
        axis_type = Axis.axis_types[key]
        axis_args = dict(mark.scales_metadata.get(name, {}),
                         **(options.get(name, {})))
        axis = axis_type(scale=scales[name], **axis_args)
        fig_axes.append(axis)
        axes[name] = axis
    mark.pyplot_axes[fig.model_id] = axes
    fig.axes = fig_axes
    return axes


def _draw_mark(mark_type, options={}, axes_options={}, **kwargs):
    """Draws the mark of type mark_type.

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
    """
    fig = kwargs.pop('figure', current_figure())
    scales = kwargs.pop('scales', _context['scales'])
    # Going through the list of data attributes
    for name in mark_type.class_trait_names(scaled=True):
        # TODO: the following should also happen if name in kwargs and
        # scales[name] is incompatible.
        if name in kwargs and name not in scales:
            traitlet = mark_type.class_traits()[name]
            rtype = traitlet.get_metadata('rtype')
            dtype = traitlet.validate(None, kwargs[name]).dtype
            compat_scale_types = [Scale.scale_types[key]
                                  for key in Scale.scale_types
                                  if Scale.scale_types[key].rtype == rtype
                                  and np.issubdtype(dtype,
                                                    Scale.scale_types[key].dtype)]
            # TODO: something better than taking the FIRST compatible
            # scale type.
            scales[name] = compat_scale_types[0](**options.get(name, {}))
    mark = mark_type(scales=scales, **kwargs)
    _context['last_mark'] = mark
    fig.marks = [m for m in fig.marks] + [mark]
    if kwargs.get('axes', True):
        axes(mark, options=axes_options)
    return mark


def plot(*args, **kwargs):
    """Draws lines in the current context figure.

    Signature: plot(x, y, **kwargs) or plot(y, **kwargs), depending of the
    length of the list of positional arguments. In the case where the `x` array
    is not provided

    Parameters
    ----------
    x: numpy.ndarray or list, 1d or 2d (optional)
        The x-coordinates of the plotted line. When not provided, the function
        defaults to numpy.linspace(0.0, len(y)-1, len(y))
        x can be 1-dimensional or 2-dimensional.
    y: numpy.ndarray or list, 1d or 2d
        The y-coordinates of the plotted line. If argument `x` is 2-dimensional
        it must also be 2-dimensional.
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
        kwargs['x'] = np.linspace(0.0, length - 1, length)
    return _draw_mark(Lines, **kwargs)


def ohlc(*args, **kwargs):
    """Draws ohlc bars or candle bars in the current context figure.

    Signature: ohlc(x, y, **kwargs) or ohlc(y, **kwargs), depending of the
    length of the list of positional arguments. In the case where the `x` array
    is not provided

    Parameters
    ----------
    x: numpy.ndarray or list, 1d (optional)
        The x-coordinates of the plotted line. When not provided, the function
        defaults to numpy.linspace(0.0, len(y)-1, len(y)).
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
        kwargs['x'] = np.linspace(0.0, length - 1, length)
    return _draw_mark(OHLC, **kwargs)


def scatter(x, y, **kwargs):
    """Draws a scatter in the current context figure.

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


def hist(sample, options={}, **kwargs):
    """Draws a histogram in the current context figure.

    Parameters
    ----------
    sample: numpy.ndarray, 1d
        The sample for which the histogram must be generated
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
    scales = kwargs.pop('scales', _context['scales'])
    if 'counts' not in scales:
        scales['counts'] = LinearScale(**options.get('counts', {}))
    kwargs['scales'] = scales
    return _draw_mark(Hist, options=options, **kwargs)


def bar(x, y, **kwargs):
    """Draws a BarChart in the current context figure.

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


def clear():
    """Clears the current context figure of all marks axes and grid lines"""
    fig = _context['figure']
    if fig is not None:
        fig.marks = []
        fig.axes = []


def current_figure():
    """Returns the current context figure"""
    if _context['figure'] is None:
        figure()
    return _context['figure']

# FOR DEBUG ONLY


def get_context():
    """Used for debug only. Return the current global context dictionary"""
    return _context
