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

from traitlets import observe, Int, Unicode, Instance, Enum, Dict, Bool
from traittypes import Array
from ipywidgets import Widget, Color, widget_serialization

from bqscales import Scale, ColorScale
from .traits import array_serialization, array_dimension_bounds
from ._version import __frontend_version__


# Returns a decorator registering an axis class in the axis type registry.
# If no key is provided, the class name is used as a key. A key is provided
# for each core bqplot axis so that the frontend can use this key regardless
# of the kernel language.
def register_axis(key=None):
    def wrap(axis):
        name = key if key is not None else axis.__module__ + axis.__name__
        BaseAxis.axis_types[name] = axis
        return axis
    return wrap


class BaseAxis(Widget):
    axis_types = {}
    _view_module = Unicode('bqplot').tag(sync=True)
    _model_module = Unicode('bqplot').tag(sync=True)
    _view_module_version = Unicode(__frontend_version__).tag(sync=True)
    _model_module_version = Unicode(__frontend_version__).tag(sync=True)


@register_axis('bqplot.Axis')
class Axis(BaseAxis):

    """A line axis.

    A line axis is the visual representation of a **numerical** or **date scale**.

    Attributes
    ----------
    icon: string (class-level attribute)
        The font-awesome icon name for this object.
    axis_types: dict (class-level attribute)
        A registry of existing axis types.
    orientation: {'horizontal', 'vertical'}
        The orientation of the axis, either vertical or horizontal
    side: {'bottom', 'top', 'left', 'right'} or None (default: None)
        The side of the axis, either bottom, top, left or right.
    label: string (default: '')
        The axis label
    tick_format: string or None (default: '')
        The tick format for the axis, for dates use d3 string formatting.
    scale: Scale
        The scale represented by the axis
    num_ticks: int or None (default: None)
        If tick_values is None, number of ticks
    tick_values: numpy.ndarray or None (default: None)
        Tick values for the axis
    tick_labels: dict (default: None)
        Override the tick labels with a dictionary of {value: label}.
        Entries are optional, and if not provided, the default tick labels
        will be used.
    offset: dict (default: {})
        Contains a scale and a value {'scale': scale or None,
        'value': value of the offset}
        If offset['scale'] is None, the corresponding figure scale is used
        instead.
    label_location: {'middle', 'start', 'end'}
        The location of the label along the axis, one of 'start', 'end' or
        'middle'
    label_color: Color or None (default: None)
        The color of the axis label
    grid_lines: {'none', 'solid', 'dashed'}
        The display of the grid lines
    grid_color: Color or None (default: None)
        The color of the grid lines
    color: Color or None (default: None)
        The color of the line
    label_offset: string or None (default: None)
        Label displacement from the axis line. Units allowed are 'em', 'px'
        and 'ex'. Positive values are away from the figure and negative
        values are towards the figure with respect to the axis line.
    visible: bool (default: True)
        A visibility toggle for the axis
    tick_style: Dict (default: {})
        Dictionary containing the CSS-style of the text for the ticks.
        For example: font-size of the text can be changed by passing
        `{'font-size': 14}`
    tick_rotate: int (default: 0)
        Degrees to rotate tick labels by.
    """
    icon = 'fa-arrows'
    side = Enum(['bottom', 'top', 'left', 'right'], default_value='bottom').tag(sync=True)
    label = Unicode().tag(sync=True)
    grid_lines = Enum(['none', 'solid', 'dashed'], default_value='solid')\
        .tag(sync=True)
    tick_format = Unicode(None, allow_none=True).tag(sync=True)
    scale = Instance(Scale).tag(sync=True, **widget_serialization)
    num_ticks = Int(default_value=None, allow_none=True).tag(sync=True)
    tick_values = Array(None, allow_none=True)\
        .tag(sync=True, **array_serialization)\
        .valid(array_dimension_bounds(1, 1))
    tick_labels = Dict(None, allow_none=True).tag(sync=True)
    offset = Dict().tag(sync=True, **widget_serialization)
    label_location = Enum(['middle', 'start', 'end'],
                          default_value='middle').tag(sync=True)
    label_color = Color(None, allow_none=True).tag(sync=True)
    grid_color = Color(None, allow_none=True).tag(sync=True)
    color = Color(None, allow_none=True).tag(sync=True)
    label_offset = Unicode(default_value=None, allow_none=True).tag(sync=True)

    visible = Bool(True).tag(sync=True)
    tick_style = Dict().tag(sync=True)
    tick_rotate = Int(0).tag(sync=True)

    _view_name = Unicode('Axis').tag(sync=True)
    _model_name = Unicode('AxisModel').tag(sync=True)
    _ipython_display_ = None  # We cannot display an axis outside of a figure.

    def __init__(self, *args, **kwargs):
        super(Axis, self).__init__(**kwargs)

        if kwargs.get('orientation') is not None:
            self.orientation = kwargs.get('orientation')

    @property
    def orientation(self):
        return 'vertical' if self.side in ['right', 'left'] else 'horizontal'

    @orientation.setter
    def orientation(self, orientation):
        if orientation not in ['horizontal', 'vertical']:
            raise ValueError('orientation must be "horizontal" or "vertical"')

        if orientation == 'horizontal' and self.side not in ['bottom', 'top']:
            self.side = 'bottom'

        if orientation == 'vertical' and self.side not in ['right', 'left']:
            self.side = 'left'

    @observe('side')
    def _observe_side(self, change):
        side = change['new']

        if side in ['left', 'right'] and self.orientation != 'vertical':
            self.orientation = 'vertical'

        if side in ['bottom', 'top'] and self.orientation != 'horizontal':
            self.orientation = 'horizontal'


@register_axis('bqplot.ColorAxis')
class ColorAxis(Axis):

    """A colorbar axis.

    A color axis is the visual representation of a **color scale**.

    Attributes
    ----------
    scale: ColorScale
        The scale represented by the axis
    """
    scale = Instance(ColorScale).tag(sync=True, **widget_serialization)
    _view_name = Unicode('ColorAxis').tag(sync=True)
    _model_name = Unicode('ColorAxisModel').tag(sync=True)
