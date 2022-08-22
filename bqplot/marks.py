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

=====
Marks
=====

.. currentmodule:: bqplot.marks

.. autosummary::
   :toctree: _generate/

   Mark
   Lines
   FlexLine
   Scatter
   Hist
   Bars
   Graph
   GridHeatMap
   HeatMap
   Label
   OHLC
   Pie
   Map
"""
import os
import json

from warnings import warn
import ipywidgets as widgets
from ipywidgets import (Widget, DOMWidget, CallbackDispatcher,
                        Color, widget_serialization)
from traitlets import (Int, Unicode, List, Enum, Dict, Bool, Float,
                       Instance, TraitError, validate)
from traittypes import Array

from numpy import histogram
import numpy as np

from .scales import Scale, OrdinalScale, LinearScale
from .traits import (Date, array_serialization,
                     array_squeeze, array_dimension_bounds, array_supported_kinds)
from ._version import __frontend_version__
from .colorschemes import CATEGORY10


def register_mark(key=None):
    """Returns a decorator registering a mark class in the mark type registry.

    If no key is provided, the class name is used as a key. A key is provided
    for each core bqplot mark so that the frontend can use
    this key regardless of the kernel language.
    """
    def wrap(mark):
        name = key if key is not None else mark.__module__ + mark.__name__
        Mark.mark_types[name] = mark
        return mark
    return wrap


# Shape constraint for array-types
def shape(*dimensions):
    def validator(trait, value):
        err_msg_tmpl = 'Expected an array of shape {} ' + \
                       'but got an array of shape {}'
        if value.shape != dimensions:
            raise TraitError(err_msg_tmpl.format(dimensions, value.shape))
        else:
            return value
    return validator


class Mark(Widget):

    """The base mark class.

    Traitlet mark attributes may be decorated with metadata.

    **Data Attribute Decoration**

    Data attributes are decorated with the following values:

    scaled: bool
        Indicates whether the considered attribute is a data attribute which
        must be associated with a scale in order to be taken into account.
    rtype: string
        Range type of the associated scale.
    atype: string
        Key in bqplot's axis registry of the recommended axis type to represent
        this scale. When not specified, the default is 'bqplot.Axis'.

    Attributes
    ----------
    display_name: string
        Holds a user-friendly name for the trait attribute.
    mark_types: dict (class-level attribute)
        A registry of existing mark types.
    scales: Dict of scales (default: {})
        A dictionary of scales holding scales for each data attribute.
        - If a mark holds a scaled attribute named 'x', the scales dictionary
        must have a corresponding scale for the key 'x'.
        - The scale's range type should be equal to the scaled attribute's
        range type (rtype).
    scales_metadata: Dict (default: {})
        A dictionary of dictionaries holding metadata on the way scales are
        used by the mark. For example, a linear scale may be used to count
        pixels horizontally or vertically. The content of this dictionary
        may change dynamically. It is an instance-level attribute.
    preserve_domain: dict (default: {})
        Indicates if this mark affects the domain(s) of the specified scale(s).
        The keys of this dictionary are the same as the ones of the "scales"
        attribute, and values are boolean. If a key is missing, it is
        considered as False.
    display_legend: bool (default: False)
        Display toggle for the mark legend in the general figure legend
    labels: list of unicode strings (default: [])
        Labels of the items of the mark. This attribute has different meanings
        depending on the type of mark.
    apply_clip: bool (default: True)
        Indicates whether the items that are beyond the limits of the chart
        should be clipped.
    visible: bool (default: True)
        Visibility toggle for the mark.
    selected_style: dict (default: {})
        CSS style to be applied to selected items in the mark.
    unselected_style: dict (default: {})
        CSS style to be applied to items that are not selected in the mark,
        when a selection exists.
    selected: list of integers or None (default: None)
        Indices of the selected items in the mark.
    tooltip: DOMWidget or None (default: None)
        Widget to be displayed as tooltip when elements of the scatter are
        hovered on
    tooltip_style: Dictionary (default: {'opacity': 0.9})
        Styles to be applied to the tooltip widget
    enable_hover: Bool (default: True)
        Boolean attribute to control the hover interaction for the scatter. If
        this is false, the on_hover custom mssg is not sent back to the python
        side
    interactions: Dictionary (default: {'hover': 'tooltip'})
        Dictionary listing the different interactions for each mark. The key is
        the event which triggers the interaction and the value is the kind of
        interactions. Keys and values can only take strings from separate enums
        for each mark.
    tooltip_location : {'mouse', 'center'} (default: 'mouse')
        Enum specifying the location of the tooltip. 'mouse' places the tooltip
        at the location of the mouse when the tooltip is activated and 'center'
        places the tooltip at the center of the figure. If tooltip is linked to
        a click event, 'mouse' places the tooltip at the location of the click
        that triggered the tooltip to be visible.
    """
    mark_types = {}
    scales = Dict(value_trait=Instance(Scale)).tag(sync=True, **widget_serialization)
    scales_metadata = Dict().tag(sync=True)
    preserve_domain = Dict().tag(sync=True)
    display_legend = Bool().tag(sync=True, display_name='Display legend')
    labels = List(trait=Unicode()).tag(sync=True, display_name='Labels')
    apply_clip = Bool(True).tag(sync=True)
    visible = Bool(True).tag(sync=True)
    selected_style = Dict().tag(sync=True)
    unselected_style = Dict().tag(sync=True)
    selected = Array(None, allow_none=True).tag(sync=True, **array_serialization)

    enable_hover = Bool(True).tag(sync=True)
    tooltip = Instance(DOMWidget, allow_none=True, default_value=None)\
        .tag(sync=True, **widget_serialization)
    tooltip_style = Dict({'opacity': 0.9}).tag(sync=True)
    interactions = Dict({'hover': 'tooltip'}).tag(sync=True)
    tooltip_location = Enum(['mouse', 'center'], default_value='mouse')\
        .tag(sync=True)

    _model_name = Unicode('MarkModel').tag(sync=True)
    _model_module = Unicode('bqplot').tag(sync=True)
    _view_module = Unicode('bqplot').tag(sync=True)
    _view_module_version = Unicode(__frontend_version__).tag(sync=True)
    _model_module_version = Unicode(__frontend_version__).tag(sync=True)
    _ipython_display_ = None

    def _get_dimension_scales(self, dimension, preserve_domain=False):
        """
        Return the list of scales corresponding to a given dimension.

        The preserve_domain optional argument specifies whether one should
        filter out the scales for which preserve_domain is set to True.
        """
        if preserve_domain:
            return [
                self.scales[k] for k in self.scales if (
                    k in self.scales_metadata and
                    self.scales_metadata[k].get('dimension') == dimension and
                    not self.preserve_domain.get(k)
                )
            ]
        else:
            return [
                self.scales[k] for k in self.scales if (
                    k in self.scales_metadata and
                    self.scales_metadata[k].get('dimension') == dimension
                )
            ]

    @validate('scales')
    def _validate_scales(self, proposal):
        """
        Validates the `scales` based on the mark's scaled attributes metadata.

        First checks for missing scale and then for 'rtype' compatibility.
        """
        # Validate scales' 'rtype' versus data attribute 'rtype' decoration
        # At this stage it is already validated that all values in self.scales
        # are instances of Scale.
        scales = proposal.value
        for name in self.trait_names(scaled=True):
            trait = self.traits()[name]
            if name not in scales:
                # Check for missing scale
                if not trait.allow_none:
                    raise TraitError("Missing scale for data attribute %s." %
                                     name)
            else:
                # Check scale range type compatibility
                if scales[name].rtype != trait.metadata['rtype']:
                    raise TraitError("Range type mismatch for scale %s." %
                                     name)
        return scales

    def __init__(self, **kwargs):
        super(Mark, self).__init__(**kwargs)
        self._hover_handlers = CallbackDispatcher()
        self._click_handlers = CallbackDispatcher()
        self._legend_click_handlers = CallbackDispatcher()
        self._legend_hover_handlers = CallbackDispatcher()
        self._element_click_handlers = CallbackDispatcher()
        self._bg_click_handlers = CallbackDispatcher()

        self._name_to_handler = {
            'hover': self._hover_handlers,
            'click': self._click_handlers,
            'legend_click': self._legend_click_handlers,
            'legend_hover': self._legend_hover_handlers,
            'element_click': self._element_click_handlers,
            'background_click': self._bg_click_handlers
        }

        self.on_msg(self._handle_custom_msgs)

    def on_hover(self, callback, remove=False):
        self._hover_handlers.register_callback(callback, remove=remove)

    def on_click(self, callback, remove=False):
        self._click_handlers.register_callback(callback, remove=remove)

    def on_legend_click(self, callback, remove=False):
        self._legend_click_handlers.register_callback(callback, remove=remove)

    def on_legend_hover(self, callback, remove=False):
        self._legend_hover_handlers.register_callback(callback, remove=remove)

    def on_element_click(self, callback, remove=False):
        self._element_click_handlers.register_callback(callback, remove=remove)

    def on_background_click(self, callback, remove=False):
        self._bg_click_handlers.register_callback(callback, remove=remove)

    def _handle_custom_msgs(self, _, content, buffers=None):
        try:
            handler = self._name_to_handler[content['event']]
        except KeyError:
            return

        handler(self, content)


@register_mark('bqplot.Lines')
class Lines(Mark):

    """Lines mark.

    In the case of the Lines mark, scales for 'x' and 'y' MUST be provided.

    Attributes
    ----------
    icon: string (class-level attribute)
        Font-awesome icon for the respective mark
    name: string (class-level attribute)
        User-friendly name of the mark
    colors: list of colors (default: CATEGORY10)
        List of colors of the Lines. If the list is shorter than the number
        of lines, the colors are reused.
    close_path: bool (default: False)
        Whether to close the paths or not.
    fill: {'none', 'bottom', 'top', 'inside', 'between'}
        Fill in the area defined by the curves
    fill_colors: list of colors (default: [])
        Fill colors for the areas. Defaults to stroke-colors when no
        color provided
    opacities: list of floats (default: [])
        Opacity for the  lines and patches. Defaults to 1 when the list is too
        short, or the element of the list is set to None.
    fill_opacities: list of floats (default: [])
        Opacity for the areas. Defaults to 1 when the list is too
        short, or the element of the list is set to None.
    stroke_width: float (default: 2)
        Stroke width of the Lines
    labels_visibility: {'none', 'label'}
        Visibility of the curve labels
    curves_subset: list of integers or None (default: [])
        If set to None, all the lines are displayed. Otherwise, only the items
        in the list will have full opacity, while others will be faded.
    line_style: {'solid', 'dashed', 'dotted', 'dash_dotted'}
        Line style.
    interpolation: {'linear', 'basis', 'cardinal', 'monotone'}
        Interpolation scheme used for interpolation between the data points
        provided. Please refer to the svg interpolate documentation for details
        about the different interpolation schemes.
    marker: {'circle', 'cross', 'diamond', 'square', 'triangle-down', 'triangle-up', 'arrow', 'rectangle', 'ellipse'}
        Marker shape
    marker_size: nonnegative int (default: 64)
        Default marker size in pixels

    Data Attributes

    x: numpy.ndarray (default: [])
        abscissas of the data points (1d or 2d array)
    y: numpy.ndarray (default: [])
        ordinates of the data points (1d or 2d array)
    color: numpy.ndarray (default: None)
        colors of the different lines based on data. If it is [], then the
        colors from the colors attribute are used. Each line has a single color
        and if the size of colors is less than the number of lines, the
        remaining lines are given the default colors.

    Notes
    -----
    The fields which can be passed to the default tooltip are:
        name: label of the line
        index: index of the line being hovered on
        color: data attribute for the color of the line
    The following are the events which can trigger interactions:
        click: left click of the mouse
        hover: mouse-over an element
    The following are the interactions which can be linked to the above events:
        tooltip: display tooltip
    """
    # Mark decoration
    icon = 'fa-line-chart'
    name = 'Lines'

    # Scaled attributes
    x = Array([]).tag(sync=True, scaled=True,
                      rtype='Number', atype='bqplot.Axis',
                      **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 2), array_supported_kinds())
    y = Array([]).tag(sync=True, scaled=True,
                      rtype='Number', atype='bqplot.Axis',
                      **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 2), array_supported_kinds())
    color = Array(None, allow_none=True).tag(sync=True,
                                             scaled=True,
                                             rtype='Color',
                                             atype='bqplot.ColorAxis',
                                             **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))

    # Other attributes
    scales_metadata = Dict({
        'x': {'orientation': 'horizontal', 'dimension': 'x'},
        'y': {'orientation': 'vertical', 'dimension': 'y'},
        'color': {'dimension': 'color'}
    }).tag(sync=True)
    colors = List(trait=Color(default_value=None, allow_none=True),
                  default_value=CATEGORY10)\
        .tag(sync=True, display_name='Colors')
    fill_colors = List(trait=Color(default_value=None, allow_none=True))\
        .tag(sync=True, display_name='Fill colors')
    stroke_width = Float(2.0).tag(sync=True, display_name='Stroke width')
    labels_visibility = Enum(['none', 'label'], default_value='none')\
        .tag(sync=True, display_name='Labels visibility')
    curves_subset = List().tag(sync=True)
    line_style = Enum(['solid', 'dashed', 'dotted', 'dash_dotted'],
                      default_value='solid')\
        .tag(sync=True, display_name='Line style')
    # TODO: Only Lines have interpolatoin but we can extend for other types of graphs
    interpolation = Enum(['linear', 'basis', 'basis-open',
                          'basis-closed', 'bundle',
                          'cardinal', 'cardinal-open',
                          'cardinal-closed', 'monotone', 'step-before',
                          'step-after'],
                         default_value='linear')\
        .tag(sync=True, display_name='Interpolation')
    close_path = Bool().tag(sync=True, display_name='Close path')
    fill = Enum(['none', 'bottom', 'top', 'inside', 'between'],
                default_value='none')\
        .tag(sync=True, display_name='Fill')
    marker = Enum(['circle', 'cross', 'diamond', 'square', 'triangle-down',
                   'triangle-up', 'arrow', 'rectangle', 'ellipse'],
                  default_value=None, allow_none=True)\
        .tag(sync=True, display_name='Marker')
    marker_size = Int(64).tag(sync=True, display_name='Default size')

    opacities = List().tag(sync=True, display_name='Opacity')
    fill_opacities = List().tag(sync=True, display_name='Fill Opacity')
    _view_name = Unicode('Lines').tag(sync=True)
    _model_name = Unicode('LinesModel').tag(sync=True)


@register_mark('bqplot.FlexLine')
class FlexLine(Mark):

    """Flexible Lines mark.

    In the case of the FlexLines mark, scales for 'x' and 'y' MUST be provided.
    Scales for the color and width data attributes are optional. In the case
    where another data attribute than 'x' or 'y' is provided but the
    corresponding scale is missing, the data attribute is ignored.

    Attributes
    ----------
    name: string (class-level attributes)
        user-friendly name of the mark
    colors: list of colors (default: CATEGORY10)
        List of colors for the Lines
    stroke_width: float (default: 1.5)
        Default stroke width of the Lines

    Data Attributes

    x: numpy.ndarray (default: [])
        abscissas of the data points (1d array)
    y: numpy.ndarray (default: [])
        ordinates of the data points (1d array)
    color: numpy.ndarray or None (default: None)
        Array controlling the color of the data points
    width: numpy.ndarray or None (default: None)
        Array controlling the widths of the Lines.
    """
    # Mark decoration
    icon = 'fa-line-chart'
    name = 'Flexible lines'

    # Scaled attributes
    x = Array([]).tag(sync=True, scaled=True, rtype='Number',
                      atype='bqplot.Axis',
                      **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))
    y = Array([]).tag(sync=True, scaled=True,
                      rtype='Number',
                      atype='bqplot.Axis',
                      **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))
    color = Array(None, allow_none=True)\
        .tag(sync=True, scaled=True, rtype='Color',
             atype='bqplot.ColorAxis',
             **array_serialization).valid(array_squeeze)
    width = Array(None, allow_none=True)\
        .tag(sync=True, scaled=True, rtype='Number',
             **array_serialization).valid(array_squeeze)

    # Other attributes
    scales_metadata = Dict({
        'x': {'orientation': 'horizontal', 'dimension': 'x'},
        'y': {'orientation': 'vertical', 'dimension': 'y'},
        'color': {'dimension': 'color'}
    }).tag(sync=True)
    stroke_width = Float(1.5).tag(sync=True, display_name='Stroke width')
    colors = List(trait=Color(default_value=None, allow_none=True),
                  default_value=CATEGORY10).tag(sync=True)
    _view_name = Unicode('FlexLine').tag(sync=True)
    _model_name = Unicode('FlexLineModel').tag(sync=True)


class _ScatterBase(Mark):
    """
    Base Mark for Label and Scatter
    """
    # Scaled attributes
    x = Array([], allow_none=True).tag(sync=True, scaled=True,
                                       rtype='Number',
                                       atype='bqplot.Axis',
                                       **array_serialization)\
        .valid(array_dimension_bounds(1, 1))
    y = Array([], allow_none=True).tag(sync=True, scaled=True,
                                       rtype='Number',
                                       atype='bqplot.Axis',
                                       **array_serialization)\
        .valid(array_dimension_bounds(1, 1))
    color = Array(None, allow_none=True).tag(sync=True,
                                             scaled=True,
                                             rtype='Color',
                                             atype='bqplot.ColorAxis',
                                             **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))
    opacity = Array(None, allow_none=True).tag(sync=True,
                                               scaled=True,
                                               rtype='Number',
                                               **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))
    size = Array(None, allow_none=True).tag(sync=True, scaled=True,
                                            rtype='Number',
                                            **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))
    rotation = Array(None, allow_none=True).tag(sync=True, scaled=True,
                                                rtype='Number',
                                                **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))

    # Other attributes
    scales_metadata = Dict({
        'x': {'orientation': 'horizontal', 'dimension': 'x'},
        'y': {'orientation': 'vertical', 'dimension': 'y'},
        'color': {'dimension': 'color'},
        'size': {'dimension': 'size'},
        'opacity': {'dimension': 'opacity'},
        'rotation': {'dimension': 'rotation'}
    }).tag(sync=True)
    opacities = Array([1.0])\
        .tag(sync=True, display_name='Opacities', **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))
    hovered_style = Dict().tag(sync=True)
    unhovered_style = Dict().tag(sync=True)
    hovered_point = Int(None, allow_none=True).tag(sync=True)

    enable_move = Bool().tag(sync=True)
    enable_delete = Bool().tag(sync=True)
    restrict_x = Bool().tag(sync=True)
    restrict_y = Bool().tag(sync=True)
    update_on_move = Bool().tag(sync=True)

    def __init__(self, **kwargs):
        self._drag_start_handlers = CallbackDispatcher()
        self._drag_handlers = CallbackDispatcher()
        self._drag_end_handlers = CallbackDispatcher()
        super(_ScatterBase, self).__init__(**kwargs)

        self._name_to_handler.update({
            'drag_start': self._drag_start_handlers,
            'drag_end': self._drag_end_handlers,
            'drag': self._drag_handlers
        })

    def on_drag_start(self, callback, remove=False):
        self._drag_start_handlers.register_callback(callback, remove=remove)

    def on_drag(self, callback, remove=False):
        self._drag_handlers.register_callback(callback, remove=remove)

    def on_drag_end(self, callback, remove=False):
        self._drag_end_handlers.register_callback(callback, remove=remove)


@register_mark('bqplot.Scatter')
class Scatter(_ScatterBase):

    """Scatter mark.

    In the case of the Scatter mark, scales for 'x' and 'y' MUST be provided.
    The scales of other data attributes are optional. In the case where another
    data attribute than 'x' or 'y' is provided but the corresponding scale is
    missing, the data attribute is ignored.

    Attributes
    ----------
    icon: string (class-level attribute)
        Font-awesome icon for that mark
    name: string (class-level attribute)
        User-friendly name of the mark
    marker: {'circle', 'cross', 'diamond', 'square', 'triangle-down', 'triangle-up', 'arrow', 'rectangle', 'ellipse'}
        Marker shape
    colors: list of colors (default: ['steelblue'])
        List of colors of the markers. If the list is shorter than the number
        of points, the colors are reused.
    default_colors: Deprecated
        Same as `colors`, deprecated as of version 0.8.4
    fill: Bool (default: True)
        Whether to fill the markers or not
    stroke: Color or None (default: None)
        Stroke color of the marker
    stroke_width: Float (default: 1.5)
        Stroke width of the marker
    opacities: list of floats (default: [1.0])
        Default opacities of the markers. If the list is shorter than
        the number
        of points, the opacities are reused.
    default_skew: float (default: 0.5)
        Default skew of the marker.
        This number is validated to be between 0 and 1.
    default_size: nonnegative int (default: 64)
        Default marker size in pixel.
        If size data is provided with a scale, default_size stands for the
        maximal marker size (i.e. the maximum value for the 'size' scale range)
    drag_size: nonnegative float (default: 5.)
        Ratio of the size of the dragged scatter size to the default
        scatter size.
    names: numpy.ndarray (default: None)
        Labels for the points of the chart
    display_names: bool (default: True)
        Controls whether names are displayed for points in the scatter
    label_display_horizontal_offset: float (default: None)
        Adds an offset, in pixels, to the horizontal positioning of the 'names'
        label above each data point
    label_display_vertical_offset: float (default: None)
        Adds an offset, in pixels, to the vertical positioning of the 'names'
        label above each data point
    enable_move: bool (default: False)
        Controls whether points can be moved by dragging. Refer to restrict_x,
        restrict_y for more options.
    restrict_x: bool (default: False)
        Restricts movement of the point to only along the x axis. This is valid
        only when enable_move is set to True. If both restrict_x and restrict_y
        are set to True, the point cannot be moved.
    restrict_y: bool (default: False)
        Restricts movement of the point to only along the y axis. This is valid
        only when enable_move is set to True. If both restrict_x and restrict_y
        are set to True, the point cannot be moved.


    Data Attributes

    x: numpy.ndarray (default: [])
        abscissas of the data points (1d array)
    y: numpy.ndarray (default: [])
        ordinates of the data points (1d array)
    color: numpy.ndarray or None (default: None)
        color of the data points (1d array). Defaults to default_color when not
        provided or when a value is NaN
    opacity: numpy.ndarray or None (default: None)
        opacity of the data points (1d array). Defaults to default_opacity when
        not provided or when a value is NaN
    size: numpy.ndarray or None (default: None)
        size of the data points. Defaults to default_size when not provided or
        when a value is NaN
    skew: numpy.ndarray or None (default: None)
        skewness of the markers representing the data points. Defaults to
        default_skew when not provided or when a value is NaN
    rotation: numpy.ndarray or None (default: None)
        orientation of the markers representing the data points.
        The rotation scale's range is [0, 180]
        Defaults to 0 when not provided or when a value is NaN.

    Notes
    -----
    The fields which can be passed to the default tooltip are:
        All the data attributes
        index: index of the marker being hovered on
    The following are the events which can trigger interactions:
        click: left click of the mouse
        hover: mouse-over an element
    The following are the interactions which can be linked to the above events:
        tooltip: display tooltip
        add: add new points to the scatter (can only linked to click)
    """
    # Mark decoration
    icon = 'fa-cloud'
    name = 'Scatter'

    # Scaled attributes
    skew = Array(None, allow_none=True).tag(sync=True, scaled=True,
                                            rtype='Number',
                                            **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))

    # Other attributes
    marker = Enum(['circle', 'cross', 'diamond', 'square', 'triangle-down',
                   'triangle-up', 'arrow', 'rectangle', 'ellipse'],
                  default_value='circle').tag(sync=True, display_name='Marker')
    colors = List(trait=Color(default_value=None, allow_none=True),
                  default_value=['steelblue'])\
        .tag(sync=True, display_name='Colors')
    scales_metadata = Dict({
        'x': {'orientation': 'horizontal', 'dimension': 'x'},
        'y': {'orientation': 'vertical', 'dimension': 'y'},
        'color': {'dimension': 'color'},
        'size': {'dimension': 'size'},
        'opacity': {'dimension': 'opacity'},
        'rotation': {'dimension': 'rotation'},
        'skew': {'dimension': 'skew'}
    }).tag(sync=True)

    @property
    def default_colors(self):
        return self.colors

    @default_colors.setter
    def default_colors(self, value):
        warn("default_colors is deprecated, use colors instead.",
             DeprecationWarning)
        self.colors = value

    @property
    def default_opacities(self):
        return self.opacities

    @default_opacities.setter
    def default_opacities(self, value):
        warn("default_opacities is deprecated, use opacities instead.",
             DeprecationWarning)
        self.opacities = value

    stroke = Color(None, allow_none=True).tag(sync=True,
                                              display_name='Stroke color')
    stroke_width = Float(1.5).tag(sync=True, display_name='Stroke width')
    default_skew = Float(0.5, min=0, max=1).tag(sync=True)
    default_size = Int(64).tag(sync=True, display_name='Default size')

    names = Array(None, allow_none=True)\
        .tag(sync=True, **array_serialization).valid(array_squeeze)
    display_names = Bool(True).tag(sync=True, display_name='Display names')
    label_display_horizontal_offset = Float(allow_none=True).tag(sync=True)
    label_display_vertical_offset = Float(allow_none=True).tag(sync=True)
    fill = Bool(True).tag(sync=True)
    drag_color = Color(None, allow_none=True).tag(sync=True)
    drag_size = Float(5.).tag(sync=True)
    names_unique = Bool(True).tag(sync=True)

    _view_name = Unicode('Scatter').tag(sync=True)
    _model_name = Unicode('ScatterModel').tag(sync=True)


@register_mark('bqplot.ScatterGL')
class ScatterGL(Scatter):
    _view_name = Unicode('ScatterGL').tag(sync=True)
    _model_name = Unicode('ScatterGLModel').tag(sync=True)


@register_mark('bqplot.Label')
class Label(_ScatterBase):

    """Label mark.

    Attributes
    ----------
    x_offset: int (default: 0)
        horizontal offset in pixels from the stated x location
    y_offset: int (default: 0)
        vertical offset in pixels from the stated y location
    text: string (default: '')
        text to be displayed
    default_size: string (default: '14px')
        font size in px, em or ex
    font_weight: {'bold', 'normal', 'bolder'}
        font weight of the caption
    drag_size: nonnegative float (default: 1.)
        Ratio of the size of the dragged label font size to the default
        label font size.
    align: {'start', 'middle', 'end'}
        alignment of the text with respect to the provided location
        enable_move: Bool (default: False)
        Enable the label to be moved by dragging. Refer to restrict_x,
        restrict_y for more options.
    restrict_x: bool (default: False)
        Restricts movement of the label to only along the x axis. This is valid
        only when enable_move is set to True. If both restrict_x and restrict_y
        are set to True, the label cannot be moved.
    restrict_y: bool (default: False)
        Restricts movement of the label to only along the y axis. This is valid
        only when enable_move is set to True. If both restrict_x and restrict_y
        are set to True, the label cannot be moved.

    Data Attributes

    x: numpy.ndarray (default: [])
        horizontal position of the labels, in data coordinates or in
        figure coordinates
    y: numpy.ndarray (default: [])
        vertical position of the labels, in data coordinates or in
        figure coordinates
    color: numpy.ndarray or None (default: None)
        label colors
    size: numpy.ndarray or None (default: None)
        label sizes
    rotation: numpy.ndarray or None (default: None)
        label rotations
    opacity: numpy.ndarray or None (default: None)
        label opacities

    """
    # Mark decoration
    icon = 'fa-font'
    name = 'Labels'

    # Other attributes
    x_offset = Int(0).tag(sync=True)
    y_offset = Int(0).tag(sync=True)

    colors = List(trait=Color(default_value=None,
                              allow_none=True),
                  default_value=CATEGORY10)\
        .tag(sync=True, display_name='Colors')
    rotate_angle = Float(0.0).tag(sync=True)
    text = Array(None, allow_none=True)\
        .tag(sync=True, **array_serialization).valid(array_squeeze)
    default_size = Float(16.).tag(sync=True)
    drag_size = Float(1.).tag(sync=True)
    font_unit = Enum(['px', 'em', 'pt', '%'],
                     default_value='px').tag(sync=True)
    font_weight = Enum(['bold', 'normal', 'bolder'],
                       default_value='bold').tag(sync=True)
    align = Enum(['start', 'middle', 'end'],
                 default_value='start').tag(sync=True)

    _view_name = Unicode('Label').tag(sync=True)
    _model_name = Unicode('LabelModel').tag(sync=True)


@register_mark('bqplot.Hist')
class Hist(Mark):

    """Histogram mark.

    In the case of the Hist mark, scales for 'sample' and 'count' MUST be
    provided.

    Attributes
    ----------
    icon: string (class-level attribute)
        font-awesome icon for that mark
    name: string (class-level attribute)
        user-friendly name of the mark
    bins: nonnegative int (default: 10)
        number of bins in the histogram
    normalized: bool (default: False)
        Boolean attribute to return normalized values which
        sum to 1 or direct counts for the `count` attribute. The scale of
        `count` attribute is determined by the value of this flag.
    colors: list of colors (default: ['steelblue'])
        List of colors of the Histogram. If the list is shorter than the number
        of bins, the colors are reused.
    stroke: Color or None (default: None)
        Stroke color of the histogram
    opacities: list of floats (default: [])
        Opacity for the bins of the histogram. Defaults to 1 when the list
        is too short, or the element of the list is set to None.
    midpoints: list (default: [])
        midpoints of the bins of the histogram. It is a read-only attribute.

    Data Attributes

    sample: numpy.ndarray (default: [])
        sample of which the histogram must be computed.
    count: numpy.ndarray (read-only)
        number of sample points per bin. It is a read-only attribute.

    Notes
    -----
    The fields which can be passed to the default tooltip are:
        midpoint: mid-point of the bin related to the rectangle hovered on
        count: number of elements in the bin hovered on
        bin_start: start point of the bin
        bin-end: end point of the bin
        index: index of the bin
    """
    # Mark decoration
    icon = 'fa-signal'
    name = 'Histogram'

    # Scaled attributes
    sample = Array([]).tag(sync=True, display_name='Sample',
                           scaled=True, rtype='Number',
                           atype='bqplot.Axis',
                           **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))
    count = Array([], read_only=True).tag(sync=True,
                                          display_name='Count',
                                          scaled=True,
                                          rtype='Number',
                                          atype='bqplot.Axis',
                                          **array_serialization)\
        .valid(array_squeeze)
    normalized = Bool().tag(sync=True)

    # Other attributes
    scales_metadata = Dict({
        'sample': {'orientation': 'horizontal', 'dimension': 'x'},
        'count': {'orientation': 'vertical', 'dimension': 'y'}
    }).tag(sync=True)

    bins = Int(10).tag(sync=True, display_name='Number of bins')
    midpoints = List(read_only=True).tag(sync=True, display_name='Mid points')
    # midpoints is a read-only attribute that is set when the mark is drawn
    colors = List(trait=Color(default_value=None, allow_none=True),
                  default_value=['steelblue'])\
        .tag(sync=True, display_name='Colors')
    stroke = Color(None, allow_none=True).tag(sync=True)
    opacities = List(trait=Float(1.0, min=0, max=1, allow_none=True))\
        .tag(sync=True, display_name='Opacities')

    _view_name = Unicode('Hist').tag(sync=True)
    _model_name = Unicode('HistModel').tag(sync=True)


@register_mark('bqplot.Boxplot')
class Boxplot(Mark):

    """Boxplot marks.

    Attributes
    ----------
    stroke: Color or None
        stroke color of the marker
    color: Color
        fill color of the box
    opacities: list of floats (default: [])
        Opacities for the markers of the boxplot. Defaults to 1 when the
        list is too short, or the element of the list is set to None.
    outlier-color: color
        color for the outlier
    box_width: int (default: None)
        width of the box in pixels. The minimum value is 5.
        If set to None, box_with is auto calculated
    auto_detect_outliers: bool (default: True)
        Flag to toggle outlier auto-detection

    Data Attributes

    x: numpy.ndarray (default: [])
        abscissas of the data points (1d array)
    y: numpy.ndarray (default: [[]])
        Sample data points (2d array)
    """

    # Mark decoration
    icon = 'fa-birthday-cake'
    name = 'Boxplot chart'

    # Scaled attributes
    x = Array([]).tag(sync=True, scaled=True, rtype='Number',
                      atype='bqplot.Axis', **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))

    # Second dimension must contain OHLC data, otherwise the behavior
    # is undefined.
    y = Array([[]]).tag(sync=True, scaled=True, rtype='Number',
                        atype='bqplot.Axis', **array_serialization)\
        .valid(array_dimension_bounds(1, 2), array_supported_kinds())

    # Other attributes
    scales_metadata = Dict({
        'x': {'orientation': 'horizontal', 'dimension': 'x'},
        'y': {'orientation': 'vertical', 'dimension': 'y'}
    }).tag(sync=True)

    stroke = Color(None, allow_none=True)\
        .tag(sync=True, display_name='Stroke color')
    box_fill_color = Color('steelblue')\
        .tag(sync=True, display_name='Fill color for the box')
    outlier_fill_color = Color('gray').tag(sync=True,
                                           display_name='Outlier fill color')
    opacities = List(trait=Float(1.0, min=0, max=1, allow_none=True))\
        .tag(sync=True, display_name='Opacities')
    box_width = Int(None, min=5, allow_none=True).tag(sync=True, display_name='Box Width')
    auto_detect_outliers = Bool(True).tag(sync=True, display_name='Auto-detect Outliers')

    _view_name = Unicode('Boxplot').tag(sync=True)
    _model_name = Unicode('BoxplotModel').tag(sync=True)


@register_mark('bqplot.Bars')
class Bars(Mark):

    """Bar mark.

    In the case of the Bars mark, scales for 'x' and 'y'  MUST be provided.
    The scales of other data attributes are optional. In the case where another
    data attribute than 'x' or 'y' is provided but the corresponding scale is
    missing, the data attribute is ignored.

    Attributes
    ----------
    icon: string (class-level attribute)
        font-awesome icon for that mark
    name: string (class-level attribute)
        user-friendly name of the mark
    color_mode: {'auto', 'group', 'element', 'no_group'}
        Specify how default colors are applied to bars.
        The 'group' mode means colors are assigned per group. If the list
        of colors is shorter than the number of groups, colors are reused.
        The 'element' mode means colors are assigned per group element. If the list
        of colors is shorter than the number of bars in a group, colors are reused.
        The 'no_group' mode means colors are assigned per bar, discarding the fact
        that there are groups or stacks. If the list of colors is shorter than the
        total number of bars, colors are reused.
    opacity_mode: {'auto', 'group', 'element', 'no_group'}
        Same as the `color_mode` attribute, but for the opacity.
    type: {'stacked', 'grouped'}
        whether 2-dimensional bar charts should appear grouped or stacked.
    colors: list of colors (default: ['steelblue'])
        list of colors for the bars.
    orientation: {'horizontal', 'vertical'}
        Specifies whether the bar chart is drawn horizontally or vertically.
        If a horizontal bar chart is drawn, the x data is drawn vertically.
    padding: float (default: 0.05)
        Attribute to control the spacing between the bars value is specified
        as a percentage of the width of the bar
    fill: Bool (default: True)
        Whether to fill the bars or not
    stroke: Color or None (default: None)
        Stroke color for the bars
    stroke_width: Float (default: 0.)
        Stroke width of the bars
    opacities: list of floats (default: [])
        Opacities for the bars. Defaults to 1 when the list is too
        short, or the element of the list is set to None.
    base: float (default: 0.0)
        reference value from which the bars are drawn. defaults to 0.0
    align: {'center', 'left', 'right'}
        alignment of bars with respect to the tick value
    label_display: bool (default: False)
        whether or not to display bar data labels
    label_display_format: string (default: .2f)
        format for displaying values.
    label_font_style: dict
        CSS style for the text of each cell
    label_display_vertical_offset: float
        vertical offset value for the label display
    label_display_horizontal_offset: float
        horizontal offset value for the label display

    Data Attributes

    x: numpy.ndarray (default: [])
        abscissas of the data points (1d array)
    y: numpy.ndarray (default: [])
        ordinates of the values for the data points
    color: numpy.ndarray or None (default: None)
        color of the data points (1d array). Defaults to default_color when not
        provided or when a value is NaN

    Notes
    -----
    The fields which can be passed to the default tooltip are:
        All the data attributes
        index: index of the bar being hovered on
        sub_index: if data is two dimensional, this is the minor index
    """
    # Mark decoration
    icon = 'fa-bar-chart'
    name = 'Bar chart'

    # Scaled attributes
    x = Array([]).tag(sync=True, scaled=True, rtype='Number',
                      atype='bqplot.Axis',
                      **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))
    y = Array([]).tag(sync=True, scaled=True, rtype='Number',
                      atype='bqplot.Axis',
                      **array_serialization)\
        .valid(array_dimension_bounds(1, 2), array_supported_kinds())
    color = Array(None, allow_none=True)\
        .tag(sync=True, scaled=True, rtype='Color',
             atype='bqplot.ColorAxis', **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))

    # Bar text labels attributes -- add default values.
    # Add bool for displaying a label or not. Add d3 formatting in docstring
    label_display = Bool(default_value=False).tag(sync=True)
    label_display_format = Unicode(default_value=".2f",
                                   allow_none=False).tag(sync=True)
    label_font_style = Dict().tag(sync=True)
    label_display_vertical_offset = Float(default_value=0.0,
                                          allow_none=False).tag(sync=True)
    label_display_horizontal_offset = Float(default_value=0.0,
                                            allow_none=False).tag(sync=True)

    # Other attributes
    scales_metadata = Dict({
        'x': {'orientation': 'horizontal', 'dimension': 'x'},
        'y': {'orientation': 'vertical', 'dimension': 'y'},
        'color': {'dimension': 'color'}
    }).tag(sync=True)
    color_mode = Enum(['auto', 'group', 'element', 'no_group'], default_value='auto')\
        .tag(sync=True)
    opacity_mode = Enum(['auto', 'group', 'element', 'no_group'], default_value='auto')\
        .tag(sync=True)
    type = Enum(['stacked', 'grouped'], default_value='stacked')\
        .tag(sync=True, display_name='Type')
    colors = List(trait=Color(default_value=None,
                              allow_none=True),
                  default_value=['steelblue'])\
        .tag(sync=True, display_name='Colors')
    padding = Float(0.05).tag(sync=True)
    fill = Bool(True).tag(sync=True)
    stroke = Color(None, allow_none=True).tag(sync=True)
    stroke_width = Float(1.).tag(sync=True, display_name='Stroke width')
    base = Float().tag(sync=True)
    opacities = List(trait=Float(1.0, min=0, max=1, allow_none=True))\
        .tag(sync=True, display_name='Opacities')
    align = Enum(['center', 'left', 'right'], default_value='center')\
        .tag(sync=True)
    orientation = Enum(['vertical', 'horizontal'], default_value='vertical')\
        .tag(sync=True)

    @validate('orientation')
    def _validate_orientation(self, proposal):
        value = proposal['value']
        x_orient = "horizontal" if value == "vertical" else "vertical"
        self.scales_metadata = {'x': {'orientation': x_orient,
                                      'dimension': 'x'},
                                'y': {'orientation': value, 'dimension': 'y'}}
        return value

    _view_name = Unicode('Bars').tag(sync=True)
    _model_name = Unicode('BarsModel').tag(sync=True)


@register_mark('bqplot.Bins')
class Bins(Bars):

    """Backend histogram mark.

    A `Bars` instance that bins sample data.

    It is very similar in purpose to the `Hist` mark, the difference being that
    the binning is done in the backend (python), which avoids large amounts of
    data being shipped back and forth to the frontend. It should therefore be
    preferred for large data.
    The binning method is the numpy `histogram` method.

    The following  documentation is in part taken from the numpy documentation.

    Attributes
    ----------
    icon: string (class-level attribute)
        font-awesome icon for that mark
    name: string (class-level attribute)
        user-friendly name of the mark
    bins: nonnegative int (default: 10)
          or {'auto', 'fd', 'doane', 'scott', 'rice', 'sturges', 'sqrt'}
        If `bins` is an int, it defines the number of equal-width
        bins in the given range (10, by default).
        If `bins` is a string (method name), `histogram` will use
        the method chosen to calculate the optimal bin width and
        consequently the number of bins (see `Notes` for more detail on
        the estimators) from the data that falls within the requested
        range.
    density : bool (default: `False`)
        If `False`, the height of each bin is the number of samples in it.
        If `True`, the height of each bin is the value of the
        probability *density* function at the bin, normalized such that
        the *integral* over the range is 1. Note that the sum of the
        histogram values will not be equal to 1 unless bins of unity
        width are chosen; it is not a probability *mass* function.
    min : float (default: None)
        The lower range of the bins.  If not provided, lower range
        is simply `x.min()`.
    max : float (default: None)
        The upper range of the bins.  If not provided, lower range
        is simply `x.max()`.
    Data Attributes
    sample: numpy.ndarray (default: [])
        sample of which the histogram must be computed.
    Notes
    -----
    The fields which can be passed to the default tooltip are:
        All the `Bars` data attributes (`x`, `y`, `color`)
        index: index of the bin
    """
    # Mark decoration
    icon = 'fa-signal'
    name = 'Backend Histogram'

    # Scaled Attributes
    sample = Array([]).tag(
        sync=False, display_name='Sample', rtype='Number',
        atype='bqplot.Axis', **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))

    # Binning options
    min = Float(None, allow_none=True).tag(sync=True)
    max = Float(None, allow_none=True).tag(sync=True)
    density = Bool().tag(sync=True)
    bins = (Int(10) | List() | Enum(['auto', 'fd', 'doane',
                                     'scott', 'rice', 'sturges', 'sqrt']))\
        .tag(sync=True, display_name='Number of bins')

    def __init__(self, **kwargs):
        '''
        Sets listeners on the data and the binning parameters.
        Adjusts `Bars` defaults to suit a histogram better.
        '''
        self.observe(self.bin_data,
                     names=['sample', 'bins', 'density', 'min', 'max'])
        # One unique color by default
        kwargs.setdefault('colors', [CATEGORY10[0]])
        # No spacing between bars
        kwargs.setdefault('padding', 0.)

        super(Bins, self).__init__(**kwargs)

    def bin_data(self, *args):
        '''
        Performs the binning of `sample` data, and draws the corresponding bars
        '''
        # Get range
        _min = self.sample.min() if self.min is None else self.min
        _max = self.sample.max() if self.max is None else self.max
        _range = (min(_min, _max), max(_min, _max))
        # Bin the samples
        counts, bin_edges = histogram(self.sample, bins=self.bins,
                                      range=_range, density=self.density)
        midpoints = (bin_edges[:-1] + bin_edges[1:]) / 2
        # Redraw the underlying Bars
        with self.hold_sync():
            self.x, self.y = midpoints, counts


@register_mark('bqplot.OHLC')
class OHLC(Mark):

    """Open/High/Low/Close marks.

    Attributes
    ----------
    icon: string (class-level attribute)
        font-awesome icon for that mark
    name: string (class-level attribute)
        user-friendly name of the mark
    marker: {'candle', 'bar'}
        marker type
    stroke: color (default: None)
        stroke color of the marker
    stroke_width: float (default: 1.0)
        stroke width of the marker
    colors: List of colors (default: ['limegreen', 'red'])
        fill colors for the markers (up/down)
    opacities: list of floats (default: [])
        Opacities for the markers of the OHLC mark. Defaults to 1 when
        the list is too short, or the element of the list is set to None.
    format: string (default: 'ohlc')
        description of y data being passed
        supports all permutations of the strings 'ohlc', 'oc', and 'hl'

    Data Attributes

    x: numpy.ndarray
        abscissas of the data points (1d array)
    y: numpy.ndarrays
        Open/High/Low/Close ordinates of the data points (2d array)

    Notes
    -----
    The fields which can be passed to the default tooltip are:
        x: the x value associated with the bar/candle
        open: open value for the bar/candle
        high: high value for the bar/candle
        low: low value for the bar/candle
        close: close value for the bar/candle
        index: index of the bar/candle being hovered on
    """

    # Mark decoration
    icon = 'fa-birthday-cake'
    name = 'OHLC chart'

    # Scaled attributes
    x = Array([]).tag(sync=True, scaled=True,
                      rtype='Number', atype='bqplot.Axis',
                      **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))
    y = Array([[]]).tag(sync=True, scaled=True,
                        rtype='Number', atype='bqplot.Axis',
                        **array_serialization)\
        .valid(array_dimension_bounds(1, 2))

    # Other attributes
    scales_metadata = Dict({
        'x': {'orientation': 'horizontal', 'dimension': 'x'},
        'y': {'orientation': 'vertical', 'dimension': 'y'}
    }).tag(sync=True)
    marker = Enum(['candle', 'bar'], default_value='candle')\
        .tag(sync=True, display_name='Marker')
    stroke = Color(None, allow_none=True)\
        .tag(sync=True, display_name='Stroke color')
    stroke_width = Float(1.0).tag(sync=True, display_name='Stroke Width')
    colors = List(trait=Color(default_value=None, allow_none=True),
                  default_value=['green', 'red'])\
        .tag(sync=True, display_name='Colors')
    opacities = List(trait=Float(1.0, min=0, max=1, allow_none=True))\
        .tag(sync=True, display_name='Opacities')
    format = Unicode('ohlc').tag(sync=True, display_name='Format')

    _view_name = Unicode('OHLC').tag(sync=True)
    _model_name = Unicode('OHLCModel').tag(sync=True)


@register_mark('bqplot.Pie')
class Pie(Mark):

    """Piechart mark.

    Attributes
    ----------
    colors: list of colors (default: CATEGORY10)
        list of colors for the slices.
    stroke: color (default: 'white')
        stroke color for the marker
    opacities: list of floats (default: [])
        Opacities for the slices of the Pie mark. Defaults to 1 when the list
        is too short, or the element of the list is set to None.
    sort: bool (default: False)
        sort the pie slices by descending sizes
    x: Float (default: 0.5) or Date
        horizontal position of the pie center, in data coordinates or in figure
        coordinates
    y: Float (default: 0.5)
        vertical y position of the pie center, in data coordinates or in figure
        coordinates
    radius: Float
        radius of the pie, in pixels
    inner_radius: Float
        inner radius of the pie, in pixels
    start_angle: Float (default: 0.0)
        start angle of the pie (from top), in degrees
    end_angle: Float (default: 360.0)
        end angle of the pie (from top), in degrees
    display_labels: {'none', 'inside', 'outside'} (default: 'inside')
        label display options
    display_values: bool (default: False)
        if True show values along with labels
    values_format: string (default: '.2f')
        format for displaying values
    label_color: Color or None (default: None)
        color of the labels
    font_size: string (default: '14px')
        label font size in px, em or ex
    font_weight: {'bold', 'normal', 'bolder'} (default: 'normal')
        label font weight

    Data Attributes

    sizes: numpy.ndarray (default: [])
        proportions of the pie slices
    color: numpy.ndarray or None (default: None)
        color of the data points. Defaults to colors when not provided.

    Notes
    -----
    The fields which can be passed to the default tooltip are:
        : the x value associated with the bar/candle
        open: open value for the bar/candle
        high: high value for the bar/candle
        low: low value for the bar/candle
        close: close value for the bar/candle
        index: index of the bar/candle being hovered on
    """
    # Mark decoration
    icon = 'fa-pie-chart'
    name = 'Pie chart'

    # Scaled attributes
    sizes = Array([]).tag(sync=True, rtype='Number', **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))
    color = Array(None, allow_none=True).tag(sync=True,
                                             scaled=True,
                                             rtype='Color',
                                             atype='bqplot.ColorAxis',
                                             **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))

    # Other attributes
    x = (Float(0.5) | Date() | Unicode()).tag(sync=True)
    y = (Float(0.5) | Date() | Unicode()).tag(sync=True)

    scales_metadata = Dict({'color': {'dimension': 'color'}}).tag(sync=True)
    sort = Bool().tag(sync=True)
    colors = List(trait=Color(default_value=None, allow_none=True),
                  default_value=CATEGORY10).tag(sync=True,
                                                display_name='Colors')
    stroke = Color(None, allow_none=True).tag(sync=True)
    opacities = List(trait=Float(1.0, min=0, max=1, allow_none=True))\
        .tag(sync=True, display_name='Opacities')
    radius = Float(180.0, min=0.0, max=float('inf')).tag(sync=True)
    inner_radius = Float(0.1, min=0.0, max=float('inf')).tag(sync=True)
    start_angle = Float().tag(sync=True)
    end_angle = Float(360.0).tag(sync=True)
    display_labels = Enum(['none', 'inside', 'outside'],
                          default_value='inside').tag(sync=True)
    display_values = Bool(False).tag(sync=True)
    values_format = Unicode(default_value='.1f').tag(sync=True)
    label_color = Color(None, allow_none=True).tag(sync=True)
    font_size = Unicode(default_value='12px').tag(sync=True)
    font_weight = Enum(['bold', 'normal', 'bolder'],
                       default_value='normal').tag(sync=True)

    _view_name = Unicode('Pie').tag(sync=True)
    _model_name = Unicode('PieModel').tag(sync=True)


def topo_load(name):
    with open(os.path.join(os.path.split(os.path.realpath(__file__))[0],
                           name)) as data_file:
        data = json.load(data_file)
    return data


@register_mark('bqplot.Map')
class Map(Mark):

    """Map mark.

    Attributes
    ----------
    colors: Dict (default: {})
        default colors for items of the map when no color data is passed.
        The dictionary should be indexed by the id of the element and have
        the corresponding colors as values. The key `default_color`
        controls the items for which no color is specified.
    selected_styles: Dict (default: {'selected_fill': 'Red',
    'selected_stroke': None, 'selected_stroke_width': 2.0})
        Dictionary containing the styles for selected subunits
    hovered_styles: Dict (default: {'hovered_fill': 'Orange',
    'hovered_stroke': None, 'hovered_stroke_width': 2.0})
        Dictionary containing the styles for hovered subunits
    hover_highlight: bool (default: True)
        boolean to control if the map should be aware of which country is being
        hovered on.
    map_data: dict (default: topo_load("map_data/WorldMap.json"))
        a topojson-formatted dictionary with the objects to map under the key
        'subunits'.

    Data Attributes

    color: Dict or None (default: None)
        dictionary containing the data associated with every country for the
        color scale
    """

    # Mark decoration
    icon = 'fa-globe'
    name = 'Map'

    # Scaled attributes
    color = Dict(allow_none=True).tag(sync=True, scaled=True, rtype='Color',
                                      atype='bqplot.ColorAxis')

    # Other attributes
    scales_metadata = Dict({'color': {'dimension': 'color'}}).tag(sync=True)
    hover_highlight = Bool(True).tag(sync=True)
    hovered_styles = Dict({
        'hovered_fill': 'Orange',
        'hovered_stroke': None,
        'hovered_stroke_width': 2.0}, allow_none=True).tag(sync=True)

    stroke_color = Color(default_value=None, allow_none=True).tag(sync=True)
    colors = Dict().tag(sync=True, display_name='Colors')
    scales_metadata = Dict({'color': {'dimension': 'color'},
                            'projection': {'dimension': 'geo'}}).tag(sync=True)
    selected_styles = Dict({
        'selected_fill': 'Red',
        'selected_stroke': None,
        'selected_stroke_width': 2.0
    }).tag(sync=True)

    map_data = Dict(topo_load('map_data/WorldMap.json')).tag(sync=True)

    _view_name = Unicode('Map').tag(sync=True)
    _model_name = Unicode('MapModel').tag(sync=True)


@register_mark('bqplot.GridHeatMap')
class GridHeatMap(Mark):

    """GridHeatMap mark.

    Alignment: The tiles can be aligned so that the data matches either the
    start, the end or the midpoints of the tiles. This is controlled by the
    align attribute.

    Suppose the data passed is a m-by-n matrix. If the scale for the rows is
    Ordinal, then alignment is by default the mid points. For a non-ordinal
    scale, the data cannot be aligned to the mid points of the rectangles.

    If it is not ordinal, then two cases arise. If the number of rows passed
    is m, then align attribute can be used. If the number of rows passed
    is m+1, then the data are the boundaries of the m rectangles.

    If rows and columns are not passed, and scales for them are also
    not passed, then ordinal scales are generated for the rows and columns.

    Attributes
    ----------
    row_align: Enum(['start', 'end'])
        This is only valid if the number of entries in `row` exactly match the
        number of rows in `color` and the `row_scale` is not `OrdinalScale`.
        `start` aligns the row values passed to be aligned with the start
        of the tiles and `end` aligns the row values to the end of the tiles.
    column_align: Enum(['start', end'])
        This is only valid if the number of entries in `column` exactly
        match the number of columns in `color` and the `column_scale` is
        not `OrdinalScale`. `start` aligns the column values passed to
        be aligned with the start of the tiles and `end` aligns the
        column values to the end of the tiles.
    anchor_style: dict (default: {})
        Controls the style for the element which serves as the anchor during
        selection.
    display_format: string (default: None)
        format for displaying values. If None, then values are not displayed
    font_style: dict
        CSS style for the text of each cell

    Data Attributes

    color: numpy.ndarray or None (default: None)
        color of the data points (2d array). The number of elements in
        this array correspond to the number of cells created in the heatmap.
    row: numpy.ndarray or None (default: None)
        labels for the rows of the `color` array passed. The length of
        this can be no more than 1 away from the number of rows in `color`.
        This is a scaled attribute and can be used to affect the height of the
        cells as the entries of `row` can indicate the start or the end points
        of the cells. Refer to the property `row_align`.
        If this property is None, then a uniformly spaced grid is generated in
        the row direction.
    column: numpy.ndarray or None (default: None)
        labels for the columns of the `color` array passed. The length of
        this can be no more than 1 away from the number of columns in `color`
        This is a scaled attribute and can be used to affect the width of the
        cells as the entries of `column` can indicate the start or the
        end points of the cells. Refer to the property `column_align`.
        If this property is None, then a uniformly spaced grid is generated in
        the column direction.
    """
    # Scaled attributes
    row = Array(None, allow_none=True).tag(sync=True, scaled=True,
                                           rtype='Number',
                                           atype='bqplot.Axis',
                                           **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))
    column = Array(None, allow_none=True).tag(sync=True, scaled=True,
                                              rtype='Number',
                                              atype='bqplot.Axis',
                                              **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))
    color = Array(None, allow_none=True).tag(sync=True, scaled=True,
                                             rtype='Color',
                                             atype='bqplot.ColorAxis',
                                             **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 2))

    # Other attributes
    scales_metadata = Dict({
        'row': {'orientation': 'vertical', 'dimension': 'y'},
        'column': {'orientation': 'horizontal', 'dimension': 'x'},
        'color': {'dimension': 'color'}
    }).tag(sync=True)

    row_align = Enum(['start', 'end'], default_value='start').tag(sync=True)
    column_align = Enum(['start', 'end'], default_value='start').tag(sync=True)
    null_color = Color('black', allow_none=True).tag(sync=True)
    stroke = Color('black', allow_none=True).tag(sync=True)
    opacity = Float(1.0, min=0.2, max=1).tag(sync=True, display_name='Opacity')
    anchor_style = Dict().tag(sync=True)
    display_format = Unicode(default_value=None, allow_none=True)\
        .tag(sync=True)
    font_style = Dict().tag(sync=True)

    def __init__(self, **kwargs):
        # Adding scales in case they are not passed too.
        scales = kwargs.pop('scales', {})

        if scales.get('row', None) is None:
            row_scale = OrdinalScale(reverse=True)
            scales['row'] = row_scale

        if scales.get('column', None) is None:
            column_scale = OrdinalScale()
            scales['column'] = column_scale
        kwargs['scales'] = scales
        super(GridHeatMap, self).__init__(**kwargs)

    @validate('row')
    def _validate_row(self, proposal):
        row = proposal.value

        if row is None:
            return row

        color = np.asarray(self.color)
        n_rows = color.shape[0]
        if len(row) != n_rows and len(row) != n_rows + 1 and len(row) != n_rows - 1:
            raise TraitError('row must be an array of size color.shape[0]')

        return row

    @validate('column')
    def _validate_column(self, proposal):
        column = proposal.value

        if column is None:
            return column

        color = np.asarray(self.color)
        n_columns = color.shape[1]
        if len(column) != n_columns and len(column) != n_columns + 1 and len(column) != n_columns - 1:
            raise TraitError('column must be an array of size color.shape[1]')

        return column

    _view_name = Unicode('GridHeatMap').tag(sync=True)
    _model_name = Unicode('GridHeatMapModel').tag(sync=True)


@register_mark('bqplot.HeatMap')
class HeatMap(Mark):

    """HeatMap mark.


    Attributes
    ----------

    Data Attributes

    color: numpy.ndarray or None (default: None)
        color of the data points (2d array).
    x: numpy.ndarray or None (default: None)
        labels for the columns of the `color` array passed. The length of
        this has to be the number of columns in `color`.
        This is a scaled attribute.
    y: numpy.ndarray or None (default: None)
        labels for the rows of the `color` array passed. The length of this has
        to be the number of rows in `color`.
        This is a scaled attribute.
    """
    # Scaled attributes
    x = Array(None, allow_none=True).tag(sync=True, scaled=True,
                                         rtype='Number',
                                         atype='bqplot.Axis',
                                         **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))
    y = Array(None, allow_none=True).tag(sync=True, scaled=True,
                                         rtype='Number',
                                         atype='bqplot.Axis',
                                         **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))
    color = Array(None, allow_none=True).tag(sync=True, scaled=True,
                                             rtype='Color',
                                             atype='bqplot.ColorAxis',
                                             **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(2, 2))

    # Other attributes
    scales_metadata = Dict({
        'x': {'orientation': 'horizontal', 'dimension': 'x'},
        'y': {'orientation': 'vertical', 'dimension': 'y'},
        'color': {'dimension': 'color'}
    }).tag(sync=True)

    null_color = Color('black', allow_none=True).tag(sync=True)

    def __init__(self, **kwargs):
        data = kwargs['color']
        kwargs.setdefault('x', range(data.shape[1]))
        kwargs.setdefault('y', range(data.shape[0]))
        scales = kwargs.pop('scales', {})
        # Adding default x and y data if they are not passed.
        # Adding scales in case they are not passed too.

        if scales.get('x', None) is None:
            x_scale = LinearScale()
            scales['x'] = x_scale

        if scales.get('y', None) is None:
            y_scale = LinearScale()
            scales['y'] = y_scale
        kwargs['scales'] = scales
        super(HeatMap, self).__init__(**kwargs)

    _view_name = Unicode('HeatMap').tag(sync=True)
    _model_name = Unicode('HeatMapModel').tag(sync=True)


@register_mark('bqplot.Graph')
class Graph(Mark):
    """Graph with nodes and links.

    Attributes
    ----------
    node_data: List
        list of node attributes for the graph
    link_matrix: numpy.ndarray of shape(len(nodes), len(nodes))
        link data passed as 2d matrix
    link_data: List
        list of link attributes for the graph
    charge: int (default: -600)
        charge of force layout. Will be ignored when x and y data attributes
        are set
    static: bool (default: False)
        whether the graph is static or not
    link_distance: float (default: 100)
        link distance in pixels between nodes. Will be ignored when x and y
        data attributes are set
    link_type: {'arc', 'line', 'slant_line'} (default: 'arc')
        Enum representing link type
    directed: bool (default: True)
        directed or undirected graph
    highlight_links: bool (default: True)
        highlights incoming and outgoing links when hovered on a node
    colors: list (default: CATEGORY10)
        list of node colors

    Data Attributes

    x: numpy.ndarray (default: [])
        abscissas of the node data points (1d array)
    y: numpy.ndarray (default: [])
        ordinates of the node data points (1d array)
    color: numpy.ndarray or None (default: None)
        color of the node data points (1d array).
    link_color: numpy.ndarray of shape(len(nodes), len(nodes))
        link data passed as 2d matrix
    """
    charge = Int(-600).tag(sync=True)
    static = Bool(False).tag(sync=True)
    link_distance = Float(100).tag(sync=True)
    node_data = List().tag(sync=True)
    link_data = List().tag(sync=True)
    link_matrix = Array([]).tag(sync=True, rtype='Number',
                                **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 2))
    link_type = Enum(['arc', 'line', 'slant_line'],
                     default_value='arc').tag(sync=True)
    directed = Bool(True).tag(sync=True)
    colors = List(trait=Color(default_value=None, allow_none=True),
                  default_value=CATEGORY10).tag(sync=True,
                                                display_name='Colors')
    interactions = Dict({'hover': 'tooltip', 'click': 'select'}).tag(sync=True)
    highlight_links = Bool(True).tag(sync=True)

    # Scaled attributes
    x = Array([], allow_none=True).tag(sync=True,
                                       scaled=True,
                                       rtype='Number',
                                       atype='bqplot.Axis',
                                       **array_serialization)\
        .valid(array_dimension_bounds(1, 1))
    y = Array([], allow_none=True).tag(sync=True,
                                       scaled=True,
                                       rtype='Number',
                                       atype='bqplot.Axis',
                                       **array_serialization)\
        .valid(array_dimension_bounds(1, 1))
    color = Array(None, allow_none=True).tag(sync=True,
                                             scaled=True,
                                             rtype='Color',
                                             atype='bqplot.ColorAxis',
                                             **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 1))

    link_color = Array([]).tag(sync=True, rtype='Color',
                               atype='bqplot.ColorAxis',
                               **array_serialization)\
        .valid(array_squeeze, array_dimension_bounds(1, 2))

    hovered_style = Dict().tag(sync=True)
    unhovered_style = Dict().tag(sync=True)
    hovered_point = Int(None, allow_none=True).tag(sync=True)

    # Other attributes
    scales_metadata = Dict({
        'x': {'orientation': 'horizontal', 'dimension': 'x'},
        'y': {'orientation': 'vertical', 'dimension': 'y'},
        'color': {'dimension': 'color'},
        'link_color': {'dimension': 'link_color'}
    }).tag(sync=True)

    _model_name = Unicode('GraphModel').tag(sync=True)
    _view_name = Unicode('Graph').tag(sync=True)


@register_mark('bqplot.Image')
class Image(Mark):
    """Image mark, based on the ipywidgets image

    If no scales are passed, uses the parent Figure scales.

    Attributes
    ----------
    image: Instance of ipywidgets.Image
        Image to be displayed

    Data Attributes

    x: tuple (default: (0, 1))
        abscissas of the left and right-hand side of the image
        in the format (x0, x1)
    y: tuple (default: (0, 1))
        ordinates of the bottom and top side of the image
        in the format (y0, y1)
    """
    _view_name = Unicode('Image').tag(sync=True)
    _model_name = Unicode('ImageModel').tag(sync=True)
    image = Instance(widgets.Image).tag(sync=True, **widget_serialization)
    pixelated = Bool(True).tag(sync=True)
    x = Array(default_value=(0, 1)).tag(sync=True, scaled=True,
                                        rtype='Number',
                                        atype='bqplot.Axis',
                                        **array_serialization)\
        .valid(array_squeeze, shape(2))
    y = Array(default_value=(0, 1)).tag(sync=True, scaled=True,
                                        rtype='Number',
                                        atype='bqplot.Axis',
                                        **array_serialization)\
        .valid(array_squeeze, shape(2))
    scales_metadata = Dict({
        'x': {'orientation': 'horizontal', 'dimension': 'x'},
        'y': {'orientation': 'vertical', 'dimension': 'y'},
    }).tag(sync=True)
