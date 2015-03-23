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

====
Axes
====

.. currentmodule:: bqplot.axes

.. autosummary::
   :toctree: generate/


   Axis
   ColorAxis
"""
from IPython.html.widgets import Widget, Color
from IPython.utils.traitlets import Int, Unicode, Instance, Enum, Dict, Bool

from .scales import Scale, ColorScale, DateScale, DateColorScale, LogScale, OrdinalScale
from .traits import NdArray


def register_axis(key=None):
    """Returns a decorator registering an axis class in the axis type registry.
    If no key is provided, the class name is used as a key. A key is provided
    for each core bqplot axis so that the frontend can use this key regardless
    of the kernel language."""
    def wrap(axis):
        l = key if key is not None else axis.__module__ + axis.__name__
        BaseAxis.axis_types[l] = axis
        return axis
    return wrap


class BaseAxis(Widget):
    axis_types = {}


@register_axis('bqplot.Axis')
class Axis(BaseAxis):

    """A line axis.

    A line axis is the visual representation of a numerical or date scale.

    Attributes
    ----------
        icon: string (class-level attribute)
            The font-awesome icon name for this object.
        axis_types: dict (class-level attribute)
            A registry of existing axis types.
        orientation: {'horizontal', 'vertical'}
            The orientation of the axis, either vertical or horizontal
        side: {'bottom', 'top', 'left', 'right'}
            The side of the axis, either bottom, top, left or right
        label: string (default: '')
            The axis label
        tick_format: string or None (default: '')
            The tick format for the axis.
        scale: Scale
            The scale represented by the axis
        num_ticks: int or None (default: None)
            If tick_values is None, number of ticks
        tick_values: numpy.ndarray or None (default: [])
            Tick values for the axis
        offset: dict (default: {})
            Containing a scale and a value {'scale': scale or None,
                                            'value': value of the offset}
            If offset['scale'] is None, the corresponding figure scale is used
            instead.
        label_location: {'middle', 'start', 'end'}
            The location of the label along the axis, one of 'start', 'end' or
            'middle'
        label_color: Color or None (default: None)
            The color of the axis label
        grid_color: Color or None (default: None)
            The color of the grid lines
        color: Color or None (default: None)
            The color of the line
        label_offset: string or None (default: None)
            Label displacement from the axis line. Units allowed are 'em', 'px'
            and 'ex'.
        visible: bool (default: True)
            A visibility toggle for the axis
    """
    icon = 'fa-arrows'
    orientation = Enum(['horizontal', 'vertical'], default_value='horizontal',
                       allow_none=False, sync=True)
    side = Enum(['bottom', 'top', 'left', 'right'], default_value='bottom',
                allow_none=False, sync=True)
    label = Unicode(sync=True)
    grid_lines = Enum(['none', 'solid', 'dashed'], default_value='none',
                      allow_none=False, sync=True)
    tick_format = Unicode(allow_none=True, sync=True)  # TODO: Default value?
    scale = Instance(Scale, sync=True)
    num_ticks = Int(default_value=None, sync=True, allow_none=True)
    tick_values = NdArray(sync=True)
    offset = Dict({}, allow_none=False, sync=True)
    label_location = Enum(['middle', 'start', 'end'], default_value='middle',
                          allow_none=False, sync=True)
    label_color = Color(None, sync=True, allow_none=True)
    grid_color = Color(None, sync=True, allow_none=True)
    color = Color(None, sync=True, allow_none=True)
    label_offset = Unicode(default_value=None, sync=True, allow_none=True)
    # Positive values are away from the figure and negative values are towards
    # the figure with resepect to the axis line.

    visible = Bool(True, sync=True)
    _view_name = Unicode('Axis', sync=True)
    _view_module = Unicode('nbextensions/bqplot/Axis', sync=True)
    _model_name = Unicode('AxisModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/AxisModel', sync=True)
    _ipython_display_ = None  # We cannot display an axis outside of a figure.

    def _tick_format_default(self):
        if isinstance(self.scale, DateScale):
            # TODO: We should probably have a DateAxis subclass instead of this
            # check at runtime.
            return None
        elif isinstance(self.scale, OrdinalScale):
            return None
        elif isinstance(self.scale, LogScale):
            return '.3g'
        else:
            return '.0f'


@register_axis('bqplot.ColorAxis')
class ColorAxis(Axis):

    """A colorbar axis.

    A color axis is the visual representation of a color scale.

    Attributes
    ----------

    orientation: {'horizontal', 'vertical'}
        Orientation of the color axis
    side: {'bottom', 'top', 'left', right}
        Position of the color axis
    label: string (default: '')
        Label of the color axis
    scale: ColorScale
        The scale represented by the axis
    tick_format: string (default: '')
        The axis tick format
    """
    orientation = Enum(['horizontal', 'vertical'], default_value='horizontal',
                       allow_none=False, sync=True)
    side = Enum(['bottom', 'top', 'left', 'right'], default_value='bottom',
                allow_none=False, sync=True)
    label = Unicode(sync=True)
    scale = Instance(ColorScale, sync=True)  # TODO: check for allow_none
    tick_format = Unicode(sync=True)
    _view_name = Unicode('ColorAxis', sync=True)
    _view_module = Unicode('nbextensions/bqplot/ColorAxis', sync=True)
    _model_name = Unicode('AxisModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/AxisModel', sync=True)

    def _tick_format_default(self):
        if isinstance(self.scale, DateColorScale):
            return '%b-%y'
        else:
            return '.0f'
