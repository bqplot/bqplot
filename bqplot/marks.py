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
   :toctree: generate/

   Mark
   Lines
   Scatter
   Hist
   Bars
"""
from IPython.html.widgets import Widget, CallbackDispatcher
from IPython.utils.traitlets import Int, Unicode, List, Enum, Dict, Bool, Float

from .traits import Color, ColorList, UnicodeList, NdArray, BoundedFloat

from .colorschemes import CATEGORY10, CATEGORY20, CATEGORY20b, CATEGORY20c


class Mark(Widget):

    """The base mark class.

    Traitlet mark attributes may be decorated with metadata, at the mark type level.

    Data Attribute Decoration
    -------------------------
    Data attributes are decorated with the following values:

    scaled: bool
        Indicates whether the considered attribute is a data attribute which
        must be associated with a scale in order to be taken into account.
    scale_range_type: string
        A condition on the range type of the associated scale.

    GUI Generation Decoration
    -------------------------
    More decoration is added for automatic GUI generation purpose:

    exposed: bool
        Indicates whether a mark attribute must be exposed in the generated GUI.
    display_index:
        In the case a mark attribute is exposed, the display_index is a hint on
        the display order of mark attributes.
    display_name:
        In the case a mark attribute is exposed, the display_name string holds
        a user-friendly name for the exposed attribute.

    Attributes
    ----------
    scales: Dict
        A dictionary of scales holding scales for each data attribute.
        - If a mark holds a "scaled" attribute named 'x', the scales dictionary
        must have a corresponding scale for the key 'x'.
        - The scale's range type must be compatible with the decoration
        "scale_range_type" of the scaled attribute.
    children: list
    display_legend: bool
        Display toggle for the mark legend in the general figure legend
    animate_dur: int
        Duration of transition on change of data attributes, in milliseconds.
    labels: list of unicode strings.
        Labels of the items of the mark. This attribute has different meanings
        depending on the type of mark.
    apply_clip: bool
        Indicates whether the items that are beyond the limits of the chart
        should be clipped.
    set_x_domain: bool
        Indicates whether this mark can impact the domain of the 'x' scale.
    set_y_domain: bool
        Indicates whether this mark can impact the domain of the 'y' scale.
    visible: bool
        Visibility toggle for the mark.
    selected_style: dict
        CSS style to be applied to selected items in the mark.
    unselected_style: dict
        CSS style to be applied to items that are not selected in the mark, when
        a selection exists.
    idx_selected: list
        Indices of the selected items in the mark.
    """
    scales = Dict(sync=True)
    children = List([], sync=True)
    display_legend = Bool(False, sync=True, exposed=True, display_index=1, display_name='Display legend')
    animate_dur = Int(0, sync=True, exposed=True, display_index=2, display_name='Animation duration')
    labels = UnicodeList(sync=True, exposed=True, display_index=3, display_name='Labels')
    apply_clip = Bool(True, sync=True)  # If set to true, the mark is clipped by the parent to fit in its area.
    set_x_domain = Bool(True, sync=True)  # Boolean to indicate if the marks affects the domain of the X scale
    set_y_domain = Bool(True, sync=True)  # Similar attribute as above for the Y scale
    visible = Bool(True, sync=True)
    selected_style = Dict({}, sync=True)  # Style to be applied to the selected items of a mark
    unselected_style = Dict({}, sync=True)  # Style to be applied to the items which are not selected in a mark
    idx_selected = List(sync=True, allow_none=True)
    _model_name = Unicode('bqplot.MarkModel', sync=True)
    _ipython_display_ = None  # We cannot display a mark outside of a figure.

    def _idx_selected_default(self):
        return None


class Lines(Mark):

    """Lines mark.

    Attributes
    ----------
    """
    icon = 'fa-line-chart'
    name = 'Lines'
    x = NdArray(sync=True, display_index=1, scaled=True, scale_range_type='numeric', min_dim=1, max_dim=2)
    y = NdArray(sync=True, display_index=2, scaled=True, scale_range_type='numeric', min_dim=1, max_dim=2)
    colors = ColorList(CATEGORY10, sync=True, exposed=True, display_index=3, display_name='Colors')
    stroke_width = Float(1.5, sync=True, exposed=True, display_index=4, display_name='Stroke width')
    curve_display = Enum(['label', 'none'], default_value='none', sync=True, exposed=True, display_index=5, display_name='Curve display')
    curves_subset = List([], sync=True)
    line_style = Enum(['solid', 'dashed', 'dotted'], default_value='solid', sync=True, exposed=True, display_index=6, display_name='Line style')
    _view_name = Unicode('bqplot.Lines', sync=True)
    _model_name = Unicode('bqplot.LinesModel', sync=True)


class FlexLine(Lines):

    """Flexible Lines mark.

    Attributes
    ----------
    """
    colors = List(CATEGORY10, sync=True)
    color = NdArray(sync=True, display_index=5, scaled=True, scale_range_type='numeric')
    width = NdArray(sync=True, display_index=6, scaled=True, scale_range_type='numeric')
    _view_name = Unicode('bqplot.FlexLine', sync=True)
    _model_name = Unicode('bqplot.FlexLineModel', sync=True)


class Scatter(Mark):

    """Scatter mark.

    Attributes
    ----------

    """
    icon = 'fa-cloud'
    name = 'Scatter'
    x = NdArray(sync=True, display_index=1, scaled=True, scale_range_type='numeric', min_dim=1, max_dim=1)
    y = NdArray(sync=True, display_index=2, scaled=True, scale_range_type='numeric', min_dim=1, max_dim=1)
    marker = Enum(['circle', 'cross', 'diamond', 'square', 'triangle-down', 'triangle-up'], sync=True, default_value='circle', exposed=True, display_index=3, display_name='Marker')
    default_color = Color('green', sync=True, exposed=True, display_index=4, display_name='Default color')
    stroke = Color(None, allow_none=True, sync=True, exposed=True, display_index=5, display_name='Stroke color')
    color = NdArray(sync=True, display_index=6, scaled=True, scale_range_type='color', min_dim=1, max_dim=1)
    default_opacity = BoundedFloat(default_value=1.0, min=0, max=1, sync=True, exposed=True, display_index=7, display_name='Default opacity')
    opacity = NdArray(sync=True, display_index=8, scaled=True, scale_range_type='numeric', min_dim=1, max_dim=1)
    default_size = Int(64, sync=True, exposed=True, display_index=9, display_name='Default size')  # dot size in square pixels
    size = NdArray(sync=True, display_index=10, scaled=True, scale_range_type='numeric', min_dim=1, max_dim=1)
    names = NdArray(sync=True)  # names either has to be of length 0 or of the length of the data. Intermediate values will result in undefined behavior.
    display_names = Bool(True, sync=True, exposed=True, display_index=11, display_name='Display names')
    fill = Bool(True, sync=True)
    drag_color = Color('DodgerBlue', sync=True)

    enable_move = Bool(False, sync=True)
    enable_add = Bool(False, sync=True)
    enable_delete = Bool(False, sync=True)
    restrict_x = Bool(False, sync=True)  # Boolean indicates if the "move" is restricted to only X
    restrict_y = Bool(False, sync=True)  # Boolean indicates if the "move" is restricted to only Y
    update_on_move = Bool(False, sync=True)  # Boolean to control if the data should be updated while moving itself. False means data update waits for release

    _view_name = Unicode('bqplot.Scatter', sync=True)
    _model_name = Unicode('bqplot.ScatterModel', sync=True)

    def __init__(self, **kwargs):
        super(Scatter, self).__init__(**kwargs)
        self._drag_end_handlers = CallbackDispatcher()
        self.on_msg(self._handle_custom_msgs)

    def on_drag_end(self, callback, remove=False):
        self._drag_end_handlers.register_callback(callback, remove=remove)

    def _handle_custom_msgs(self, _, content):
        if content.get('event', '') == 'drag_end':
            self._drag_end_handlers(self, content)


class Hist(Mark):

    """Histogram marks.

    Attributes
    ----------

    """
    icon = 'fa-signal'
    name = 'Histogram'
    # Attributes 'midpoints' and 'counts' are read-only attributes which are
    # set when the histogram is drawn
    x = NdArray(sync=True, display_index=1, scaled=True, scale_range_type='numeric', min_dim=1, max_dim=1)
    bins = Int(10, sync=True, exposed=True, display_index=2, display_name='Number of bins')
    midpoints = List(sync=True, display_index=3, display_name='Mid points')
    counts = List(sync=True, display_index=4, display_name='Counts')
    colors = ColorList(CATEGORY10, sync=True, exposed=True, display_index=5, display_name='Colors')
    yticks = Bool(True, sync=True, exposed=True, display_index=5, display_name='Y ticks')
    _view_name = Unicode('bqplot.Hist', sync=True)
    _model_name = Unicode('bqplot.HistModel', sync=True)


class Bars(Mark):

    """Bar marks.

    Attributes
    ----------

    """
    icon = 'fa-bar-chart'
    name = 'Bar chart'
    x = NdArray(sync=True, display_index=1, scaled=True, scale_range_type='numeric', min_dim=1, max_dim=1)
    y = NdArray(sync=True, display_index=2, scaled=True, scale_range_type='numeric', min_dim=1, max_dim=2)
    # Same as color attribute for the scatter
    color = NdArray(sync=True, display_index=8, scaled=True, scale_range_type='numeric', min_dim=1, max_dim=1)
    # Enum attribute to specify if color should be the same for all bars with
    # the same x or for all bars which belong to the same array in Y
    color_mode = Enum(['auto', 'group', 'element'], default_value='auto', sync=True)  # No change handler for this attribute now
    type = Enum(['stacked', 'grouped'], default_value='stacked', sync=True, exposed=True, display_index=3, display_name='Type')
    colors = ColorList(CATEGORY10, sync=True, exposed=True, display_index=4, display_name='Colors')
    padding = Float(0.05, sync=True)
    select_bars = Bool(False, sync=True)
    curve_display = Enum(['none', 'legend'], default_value='none', sync=True, exposed=True, display_index=5, display_name='Curve display')
    xgrids = Enum(['off', 'line', 'dashed'], default_value='off', sync=True, exposed=True, display_index=6, display_name='X grids')
    ygrids = Enum(['off', 'line', 'dashed'], default_value='off', sync=True, exposed=True, display_index=7, display_name='Y grids')
    stroke = Color('white', allow_none=True, sync=True)
    opacity = BoundedFloat(default_value=1.0, min=0.2, max=1, sync=True, exposed=True, display_index=7, display_name='Opacity')
    _view_name = Unicode('bqplot.Bars', sync=True)
    _model_name = Unicode('bqplot.BarsModel', sync=True)


class Label(Mark):

    """Label mark.

    Attributes
    ----------
    """
    # x = Float(sync=True) | Date(sync=True)
    x = Float(sync=True)  # The x co-ordinate of the location of the label. Can be in terms of data or a value between [0, 1]
    # which is interpreted in the figure scale.
    y = Float(allow_none=True, default_value=None, sync=True)  # Same as the x attribute
    x_offset = Int(sync=True)  # Offset from the stated x location in pixels
    y_offset = Int(sync=True)  # Offset from the stated y location in pixels

    color = Color(None, allow_none=True, sync=True)  # Color of the text
    rotate_angle = Float(sync=True)  # Angle by which the text is to be rotated
    text = Unicode(sync=True)  # Text to be displayed
    font_size = Unicode(default_value='14px', sync=True)  # Font size in px em or ex
    font_weight = Enum(['normal', 'bold', 'bolder'], default_value='bold', sync=True)
    align = Enum(['middle', 'start', 'end'], default_value='start', sync=True)  # Alignment of the text with respect to the location provided
    _view_name = Unicode('bqplot.Label', sync=True)
