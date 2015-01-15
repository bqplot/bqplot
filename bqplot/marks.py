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


def register_mark(key=None):
    """Returns a decorator registering a mark class in the mark type registry.
    If no key is provided, the class name is used as a key. A key is
    provided for each core bqplot mark so that the frontend can use
    this key regardless of the kernel language."""
    def wrap(mark):
        l = key if key is not None else mark.__module__ + mark.__name__
        Mark.mark_types[l] = mark
        return mark
    return wrap


class Mark(Widget):

    """The base mark class.

    Traitlet mark attributes may be decorated with metadata, at the mark type level.

    Data Attribute Decoration
    -------------------------
    Data attributes are decorated with the following values:

    scaled: bool
        Indicates whether the considered attribute is a data attribute which
        must be associated with a scale in order to be taken into account.
    rtype: string
        Range type of the associated scale.

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
    mark_types: dict
        A registry of existing mark types.
    scales: Dict
        A dictionary of scales holding scales for each data attribute.
        - If a mark holds a scaled attribute named 'x', the scales dictionary
        must have a corresponding scale for the key 'x'.
        - The scale's range type should be equal to the scaled attribute's range type (rtype).
    preserve_domain: dict
        Indicates if this mark affects the domain(s) of the specified scale(s). The keys of this
        dictionary are the same as the ones of the "scales" attribute, and values are boolean.
        If a key is missing, it is considered as False.
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
    mark_types = {}
    scales = Dict(sync=True)
    preserve_domain = Dict(allow_none=False, sync=True)
    display_legend = Bool(False, sync=True, exposed=True, display_index=1, display_name='Display legend')
    animate_dur = Int(0, sync=True, exposed=True, display_index=2, display_name='Animation duration')
    labels = UnicodeList(sync=True, exposed=True, display_index=3, display_name='Labels')
    apply_clip = Bool(True, sync=True)  # If set to true, the mark is clipped by the parent to fit in its area.
    visible = Bool(True, sync=True)
    selected_style = Dict({}, sync=True)  # Style to be applied to the selected items of a mark
    unselected_style = Dict({}, sync=True)  # Style to be applied to the items which are not selected in a mark
    idx_selected = List(sync=True, allow_none=True)
    _model_name = Unicode('bqplot.MarkModel', sync=True)
    _ipython_display_ = None  # We cannot display a mark outside of a figure.

    def _idx_selected_default(self):
        return None


@register_mark('bqplot.Lines')
class Lines(Mark):

    """Lines mark.

    In the case of the Lines mark, scales for "x" and "y" MUST be provided.

    Attributes
    ----------
    icon: string
        font-awesome icon for that mark
    name: string
        user-friendly name of the mark
    colors: list of colors
        list of colors of the lines
    stroke_width: float
        stroke width of the lines
    labels_visibility: {'none', 'label'}
        visibility of the curve labels
    curve_subset: list of integers or None
        if st to None, all the lines are displayed. Otherwise, only the items
        in the list will have full opacity, while others will be faded.
    line_style: {'solid', 'dashed', 'dotted'}
        Line style.

    Data Attributes
    ---------------
    x: numpy.ndarray
        abscissas of the data points (1d or 2d array)
    y: numpy.ndarray
        ordinates of the data points (1d or 2d array)
    """
    icon = 'fa-line-chart'
    name = 'Lines'
    x = NdArray(sync=True, display_index=1, scaled=True, rtype='Number', min_dim=1, max_dim=2)
    y = NdArray(sync=True, display_index=2, scaled=True, rtype='Number', min_dim=1, max_dim=2)
    colors = ColorList(CATEGORY10, sync=True, exposed=True, display_index=3, display_name='Colors')
    stroke_width = Float(1.5, sync=True, exposed=True, display_index=4, display_name='Stroke width')
    labels_visibility = Enum(['none', 'label'], default_value='none', sync=True, exposed=True, display_index=5, display_name='Labels visibility')
    curves_subset = List([], sync=True)
    line_style = Enum(['solid', 'dashed', 'dotted'], default_value='solid', sync=True, exposed=True, display_index=6, display_name='Line style')
    _view_name = Unicode('bqplot.Lines', sync=True)
    _model_name = Unicode('bqplot.LinesModel', sync=True)


@register_mark('bqplot.FlexLine')
class FlexLine(Lines):

    """Flexible Lines mark.

    In the case of the FlexLines mark, scales for "x" and "y" MUST be provided.
    Scales for color and width data attributes are optional. In the case where another
    data attribute than "x" or "y" is provided but the corresponding scale is
    missing, the data attribute is ignored.

    Attributes
    ----------
    name: string
        user-friendly name of the mark
    colors: list

    Data Attributes
    ---------------
    color: numpy.ndarray
    width: numpy.ndarray
    """
    name = 'Flexible lines'
    colors = List(CATEGORY10, sync=True)
    color = NdArray(sync=True, display_index=5, scaled=True, rtype='Number')
    width = NdArray(sync=True, display_index=6, scaled=True, rtype='Number')
    _view_name = Unicode('bqplot.FlexLine', sync=True)
    _model_name = Unicode('bqplot.FlexLineModel', sync=True)


@register_mark('bqplot.Scatter')
class Scatter(Mark):

    """Scatter mark.

    In the case of the Scatter mark, scales for "x" and "y" MUST be provided.
    The scales of other data attributes are optional. In the case where another
    data attribute than "x" or "y" is provided but the corresponding scale is
    missing, the data attribute is ignored.

    Attributes
    ----------
    icon: string
        font-awesome icon for that mark
    name: string
        user-friendly name of the mark
    marker: {'circle', 'cross', 'diamond', 'square', 'triangle-down', 'triangle-up'}
        marker shape
    default_color: color
        default color of the marker
    stroke: color
        stroke color of the marker
    default_opacity: float
        This number is validated to be between 0 and 1.
    default_size: int
        Default marker size in pixel.
        If size data is provided with a scale, default_size stands for the
        maximal marker size (i.e. the maximum value for the 'size' scale range)

    Data Attributes
    ---------------
    x: numpy.ndarray
        abscissas of the data points (1d array)
    y: numpy.ndarray
        ordinates of the data points (1d array)
    color: numpy.ndarray
        color of the data points (1d array). Defaults to default_color when not
        privided or when a value is NaN
    opacity: numpy.ndarray
        opacity of the data points (1d array). Defaults to default_opacity when
        not provided or when a value is NaN
    size: numpy.ndarray
        size of the data points. Defaults to default_size when not provided or
        when a value is NaN
    """
    icon = 'fa-cloud'
    name = 'Scatter'
    x = NdArray(sync=True, display_index=1, scaled=True, rtype='Number', min_dim=1, max_dim=1)
    y = NdArray(sync=True, display_index=2, scaled=True, rtype='Number', min_dim=1, max_dim=1)
    marker = Enum(['circle', 'cross', 'diamond', 'square', 'triangle-down', 'triangle-up'], sync=True, default_value='circle', exposed=True, display_index=3, display_name='Marker')
    default_color = Color('green', sync=True, exposed=True, display_index=4, display_name='Default color')
    stroke = Color(None, allow_none=True, sync=True, exposed=True, display_index=5, display_name='Stroke color')
    color = NdArray(sync=True, display_index=6, scaled=True, rtype='Color', min_dim=1, max_dim=1)
    default_opacity = BoundedFloat(default_value=1.0, min=0, max=1, sync=True, exposed=True, display_index=7, display_name='Default opacity')
    opacity = NdArray(sync=True, display_index=8, scaled=True, rtype='Number', min_dim=1, max_dim=1)
    default_size = Int(64, sync=True, exposed=True, display_index=9, display_name='Default size')  # dot size in square pixels
    size = NdArray(sync=True, display_index=10, scaled=True, rtype='Number', min_dim=1, max_dim=1)
    names = NdArray(sync=True)  # names either has to be of length 0 or of the length of the data. Intermediate values will result in undefined behavior.
    display_names = Bool(True, sync=True, exposed=True, display_index=11, display_name='Display names')
    fill = Bool(True, sync=True)
    drag_color = Color('DodgerBlue', sync=True)
    names_unique = Bool(True, sync=True)  # Boolean to indicate if the attribute 'names' should be the primary key or not

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


@register_mark('bqplot.Hist')
class Hist(Mark):

    """Histogram mark.

    In the case of the Hist mark, scales for "sample" and "counts" MUST be provided.

    Attributes
    ----------
    icon: string
        font-awesome icon for that mark
    name: string
        user-friendly name of the mark
    bins: int
        number of bins in the histogram
    midpoints: list
        midpoints of the bins of the histogram. It is a read-only attribute.
    yticks: bool

    Data Attributes
    ---------------
    sample: numpy.ndarray
        sample of which the histogram must be computed.
    counts: list of ints (read-only)
        number of sample points per bin. It is a read-only attribute.
    """
    icon = 'fa-signal'
    name = 'Histogram'
    # Attributes 'midpoints' and 'counts' are read-only attributes which are
    # set when the histogram is drawn
    sample = NdArray(sync=True, display_index=1, display_name='Sample', scaled=True, rtype='Number', min_dim=1, max_dim=1)
    bins = Int(10, sync=True, exposed=True, display_index=2, display_name='Number of bins')
    midpoints = List(sync=True, display_index=3, display_name='Mid points')
    counts = List(sync=True, display_index=4, scaled=True, rtype='Number', read_only=True, display_name='Counts')
    colors = ColorList(CATEGORY10, sync=True, exposed=True, display_index=5, display_name='Colors')
    stroke = Color('white', allow_none=True, sync=True)
    opacity = BoundedFloat(default_value=1.0, min=0.2, max=1, sync=True, exposed=True, display_index=7, display_name='Opacity')
    _view_name = Unicode('bqplot.Hist', sync=True)
    _model_name = Unicode('bqplot.HistModel', sync=True)


@register_mark('bqplot.Bars')
class Bars(Mark):

    """Bar mark.

    In the case of the Bars mark, scales for "x" and "y"  MUST be provided.
    The scales of other data attributes are optional. In the case where another
    data attribute than "x" or "y" is provided but the corresponding scale is
    missing, the data attribute is ignored.

    Attributes
    ----------
    icon: string
        font-awesome icon for that mark
    name: string
        user-friendly name of the mark
    color_mode: {'auto', 'group', 'element'}
        enum attribute to specify if color should be the same for all bars with
        the same x or for all bars which belong to the same array in Y
        'group' means for every x all bars have same color.
        'element' means for every dimension of y, all bars have same color.
        'auto' picks 'group' and 'element' for 1-d and 2-d values of
        Y respectively.
    type: {'stacked', 'grouped'}
    colors: list of colors
        list of colors for the bars.
    padding: float
        attribute to control the spacing between the bars
        value is specified as a percentage of the width of the bar
    select_bars: bool
    stroke: color
    opacity: float
    base: float
        reference value from which the bars are drawn. defaults to 0.0

    Data Attributes
    ---------------
    x: numpy.ndarray
    y: numpy.ndarray
    color: numpy.ndarray
        color of the data points (1d array). Defaults to default_color when not
        privided or when a value is NaN
    """
    icon = 'fa-bar-chart'
    name = 'Bar chart'
    x = NdArray(sync=True, display_index=1, scaled=True, rtype='Number', min_dim=1, max_dim=1)
    y = NdArray(sync=True, display_index=2, scaled=True, rtype='Number', min_dim=1, max_dim=2)
    # Same as color attribute for the scatter
    color = NdArray(sync=True, display_index=8, scaled=True, rtype='Color', min_dim=1, max_dim=1)
    color_mode = Enum(['auto', 'group', 'element'], default_value='auto', sync=True)  # No change handler for this attribute now
    type = Enum(['stacked', 'grouped'], default_value='stacked', sync=True, exposed=True, display_index=3, display_name='Type')
    colors = ColorList(CATEGORY10, sync=True, exposed=True, display_index=4, display_name='Colors')
    padding = Float(0.05, sync=True)  # Attribute to control the spacing between the bars.
    # Value is specified as a percentage of the width of the bar.
    select_bars = Bool(False, sync=True)
    stroke = Color('white', allow_none=True, sync=True)
    base = Float(default_value=0.0, sync=True)
    opacity = BoundedFloat(default_value=1.0, min=0.2, max=1, sync=True, exposed=True, display_index=7, display_name='Opacity')
    _view_name = Unicode('bqplot.Bars', sync=True)
    _model_name = Unicode('bqplot.BarsModel', sync=True)


@register_mark('bqplot.Label')
class Label(Mark):

    """Label mark.

    Attributes
    ----------
    x: float
        horisontal position of the label, in data coordinates or in figure coordinates
    y: float
        vertical y position of the label, in data coordinates or in figure coordinates
    x_offset: int
        horizontal offset in pixels from the stated x location
    y_offset: int
        vertical offset in pixels from the stated y location
    color: color
        label color
    rotate_angle: float
        angle by which the text is to be rotated
    text: string
        text to be displayed
    font_size: string
        front size in px, em or ex
    font_weight: {'bold', 'normal', 'bolder'}
        font weight of the caption
    align: {'start', 'middle', 'end'}
        alignment of the text with respect to the provided location
    """
    # TODO: x = Float(sync=True) | Date(sync=True)
    x = Float(sync=True)  # The x co-ordinate of the location of the label. Can be in terms of data or a value between [0, 1]
    # which is interpreted in the figure scale.
    y = Float(allow_none=True, default_value=None, sync=True)  # Same as the x attribute
    x_offset = Int(sync=True)  # Offset from the stated x location in pixels
    y_offset = Int(sync=True)  # Offset from the stated y location in pixels

    color = Color(None, allow_none=True, sync=True)  # Color of the text
    rotate_angle = Float(sync=True)  # Angle by which the text is to be rotated
    text = Unicode(sync=True)  # Text to be displayed
    font_size = Unicode(default_value='14px', sync=True)  # Font size in px em or ex
    font_weight = Enum(['bold', 'normal', 'bolder'], default_value='bold', sync=True)
    align = Enum(['start', 'middle', 'end'], default_value='start', sync=True)  # Alignment of the text with respect to the provided location
    _view_name = Unicode('bqplot.Label', sync=True)
