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

from .traits import Color, ColorList, UnicodeList, NdArray, BoundedFloat, Date

from .colorschemes import CATEGORY10, CATEGORY20, CATEGORY20b, CATEGORY20c


def register_mark(key=None):
    """Returns a decorator registering a mark class in the mark type registry.
    If no key is provided, the class name is used as a key. A key is provided
    for each core bqplot mark so that the frontend can use
    this key regardless of the kernel language."""
    def wrap(mark):
        l = key if key is not None else mark.__module__ + mark.__name__
        Mark.mark_types[l] = mark
        return mark
    return wrap


class Mark(Widget):

    """The base mark class.

    Traitlet mark attributes may be decorated with metadata.

    Data Attribute Decoration
    -------------------------
    Data attributes are decorated with the following values:

    scaled: bool
        Indicates whether the considered attribute is a data attribute which
        must be associated with a scale in order to be taken into account.
    rtype: string
        Range type of the associated scale.
    atype: string
        Key in bqplot's axis registry of the recommended axis type to represent
        this scale. When not specified, the default is 'bqplot.Axis'.

    GUI Generation Decoration
    -------------------------
    More decoration is added for automatic GUI generation purpose:

    exposed: bool
        Indicates whether a mark attribute must be exposed in the generated
        GUI.
    display_index: int
        In the case a mark attribute is exposed, the display_index is a hint on
        the display order of mark attributes.
    display_name: string
        In the case a mark attribute is exposed, the display_name string holds
        a user-friendly name for the exposed attribute.

    Attributes
    ----------
    mark_types: dict (class-level attribute)
        A registry of existing mark types.
    scales: Dict (default: {})
        A dictionary of scales holding scales for each data attribute.
        - If a mark holds a scaled attribute named 'x', the scales dictionary
        must have a corresponding scale for the key 'x'.
        - The scale's range type should be equal to the scaled attribute's
        range type (rtype).
    scales_metadata: Dict (default: {})
        A dictionary of dictionaries holding metadata on the way scales are
        used by the mark. For example, a linear scale may be used to count
        pixels horizontally or vertically. The content of this dictionnary
        may change dynamically. It is an instance-level attribute.
    preserve_domain: dict (default: {})
        Indicates if this mark affects the domain(s) of the specified scale(s).
        The keys of this dictionary are the same as the ones of the "scales"
        attribute, and values are boolean. If a key is missing, it is
        considered as False.
    display_legend: bool (default: False)
        Display toggle for the mark legend in the general figure legend
    animate_dur: nonnegative int (default: 0)
        Duration of transition on change of data attributes, in milliseconds.
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
    idx_selected: list (default: [])
        Indices of the selected items in the mark.
    """
    mark_types = {}
    scales = Dict(sync=True)  # TODO: check for allow_none
    scales_metadata = Dict(sync=True)
    preserve_domain = Dict(allow_none=False, sync=True)
    display_legend = Bool(False, sync=True, exposed=True, display_index=1,
                          display_name='Display legend')
    animate_dur = Int(0, sync=True,
                      exposed=True, display_index=2,
                      display_name='Animation duration')
    labels = UnicodeList(sync=True, exposed=True, display_index=3,
                         display_name='Labels')
    apply_clip = Bool(True, sync=True)
    visible = Bool(True, sync=True)
    selected_style = Dict({}, sync=True)
    unselected_style = Dict({}, sync=True)
    idx_selected = List(sync=True, allow_none=True)

    _model_name = Unicode('MarkModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/MarkModel', sync=True)
    _ipython_display_ = None

    def _idx_selected_default(self):
        return None


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
    fill: list of colors (default: [])
        Fill color for the patches. Defaults to no-fill when no color provided.
    opacity: list of floats (default: [])
        Opacity for the patches. Defaults to 1 when list is too short, or set
        to None.
    stroke_width: float (default: 1.5)
        Stroke width of the Lines
    labels_visibility: {'none', 'label'}
        Visibility of the curve labels
    curve_subset: list of integers or None (default: [])
        If set to None, all the lines are displayed. Otherwise, only the items
        in the list will have full opacity, while others will be faded.
    line_style: {'solid', 'dashed', 'dotted'}
        Line style.
    interpolation: {'linear', 'basis', 'cardinal', 'monotone'}
        Interpolation scheme used for interpolation between the data points
        provided. Please refer to the svg interpolate documentation for details
        about the different interpolation schemes.

    Data Attributes
    ---------------
    x: numpy.ndarray (default: [])
        abscissas of the data points (1d or 2d array)
    y: numpy.ndarray (default: [])
        ordinates of the data points (1d or 2d array)
    color: numpy.ndarray (default: [])
        colors of the different lines based on data. If it is [], then the
        colors from the colors attribute are used. Each line has a single color
        and if the size of colors is less than the number of lines, the
        remaining lines are given the default colors.
    """
    # Mark decoration
    icon = 'fa-line-chart'
    name = 'Lines'

    # Scaled attributes
    x = NdArray(sync=True, allow_none=False, min_dim=1, max_dim=2,
                display_index=1, scaled=True, rtype='Number')
    y = NdArray(sync=True, allow_none=False, min_dim=1, max_dim=2,
                display_index=2, scaled=True, rtype='Number')
    color = NdArray(sync=True, display_index=6, scaled=True, rtype='Color',
                    atype='bqplot.ColorAxis', min_dim=1, max_dim=1)

    # Other attributes
    scales_metadata = Dict({'x': {'orientation': 'horizontal'},
                            'y': {'orientation': 'vertical'}}, sync=True)
    colors = ColorList(CATEGORY10, sync=True, exposed=True, display_index=3,
                       display_name='Colors')
    stroke_width = Float(1.5, sync=True, exposed=True, display_index=4,
                         display_name='Stroke width')
    labels_visibility = Enum(['none', 'label'], default_value='none',
                             allow_none=False, sync=True, exposed=True,
                             display_index=5, display_name='Labels visibility')
    curves_subset = List([], sync=True)
    line_style = Enum(['solid', 'dashed', 'dotted'], default_value='solid',
                      allow_none=False, sync=True, exposed=True,
                      display_index=6, display_name='Line style')
    interpolation = Enum(['linear', 'basis', 'cardinal', 'monotone'],
                         default_value='linear', allow_none=False, sync=True,
                         exposed=True, display_index=7,
                         display_name='Interpolation')
    close_path = Bool(sync=True, exposed=True, display_index=8,
                      display_name='Close path')
    fill = ColorList([], sync=True, exposed=True, display_index=9,
                     display_name='Fill Color')
    opacity = List([], sync=True, display_index=10, display_name='Opacity')
    _view_name = Unicode('Lines', sync=True)
    _view_module = Unicode('nbextensions/bqplot/Lines', sync=True)
    _model_name = Unicode('LinesModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/LinesModel', sync=True)


@register_mark('bqplot.FlexLine')
class FlexLine(Lines):

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

    Data Attributes
    ---------------
    color: numpy.ndarray or None (default: [])
        Array controlling the color of the data points
    width: numpy.ndarray or None (default: [])
        Array controlling the widths of the Lines.
    """
    # Mark decoration
    name = 'Flexible lines'

    # Scaled attributes
    color = NdArray(sync=True, display_index=5, scaled=True, rtype='Number',
                    atype='bqplot.ColorAxis')
    width = NdArray(sync=True, display_index=6, scaled=True, rtype='Number')

    # Other attributes
    colors = ColorList(CATEGORY10, sync=True)
    _view_name = Unicode('FlexLine', sync=True)
    _view_module = Unicode('nbextensions/bqplot/FlexLine', sync=True)
    _model_name = Unicode('FlexLineModel', sync=True)


@register_mark('bqplot.Scatter')
class Scatter(Mark):

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
    marker: {'circle', 'cross', 'diamond', 'square', 'triangle-down',
             'triangle-up', 'arrow', 'rectangle', 'ellipse', 'smile'}
        Marker shape
    default_color: Color (default: 'green')
        Default color of the marker
    stroke: Color or None (default: None)
        Stroke color of the marker
    default_opacity: float (default: 1.0)
        This number is validated to be between 0 and 1.
    default_eccentricity: float (default: 0.5)
        Default eccentricity of the marker.
        This number is validated to be between 0 and 1.
    default_size: nonnegative int (default: 64)
        Default marker size in pixel.
        If size data is provided with a scale, default_size stands for the
        maximal marker size (i.e. the maximum value for the 'size' scale range)
    names: numpy.ndarray (default: [])
        Labels for the points of the chart
    display_names: bool (default: True)
        Controls whether names are displayed for points in the scatter
    fill, drag_color, names_unique, enable_move, enable_add,
    enable_delete, restrict_x, restrict_y, update_on_move.

    Data Attributes
    ---------------
    x: numpy.ndarray (default: [])
        abscissas of the data points (1d array)
    y: numpy.ndarray (default: [])
        ordinates of the data points (1d array)
    color: numpy.ndarray or None (default: [])
        color of the data points (1d array). Defaults to default_color when not
        provided or when a value is NaN
    opacity: numpy.ndarray or None (default: [])
        opacity of the data points (1d array). Defaults to default_opacity when
        not provided or when a value is NaN
    size: numpy.ndarray or None (default: [])
        size of the data points. Defaults to default_size when not provided or
        when a value is NaN
    """
    # Mark decoration
    icon = 'fa-cloud'
    name = 'Scatter'

    # Scaled attribtes
    x = NdArray(sync=True, allow_none=False, min_dim=1, max_dim=1,
                display_index=1, scaled=True, rtype='Number')
    y = NdArray(sync=True, allow_none=False, min_dim=1, max_dim=1,
                display_index=2, scaled=True, rtype='Number')
    color = NdArray(sync=True, display_index=6, scaled=True, rtype='Color',
                    atype='bqplot.ColorAxis', min_dim=1, max_dim=1)
    opacity = NdArray(sync=True, display_index=8, scaled=True, rtype='Number',
                      min_dim=1, max_dim=1)
    size = NdArray(sync=True, display_index=10, scaled=True, rtype='Number',
                   min_dim=1, max_dim=1)
    eccentricity = NdArray(sync=True, display_index=11, scaled=True, rtype='Number',
                           min_dim=1, max_dim=1)
    rotation = NdArray(sync=True, display_index=12, scaled=True, rtype='Number',
                       min_dim=1, max_dim=1)

    # Other attributes
    scales_metadata = Dict({'x': {'orientation': 'horizontal'},
                            'y': {'orientation': 'vertical'}}, sync=True)
    marker = Enum(['circle', 'cross', 'diamond', 'square', 'triangle-down',
                  'triangle-up', 'arrow', 'rectangle', 'ellipse', 'smile'],
                  default_value='circle', allow_none=False,
                  sync=True, exposed=True, display_index=3,
                  display_name='Marker')
    default_color = Color('green', sync=True, exposed=True, display_index=4,
                          display_name='Default color')
    stroke = Color(None, allow_none=True, sync=True, exposed=True,
                   display_index=5, display_name='Stroke color')
    default_opacity = BoundedFloat(default_value=1.0, min=0, max=1, sync=True,
                                   exposed=True, display_index=7,
                                   display_name='Default opacity')
    default_eccentricity = BoundedFloat(default_value=0.5, min=0, max=1,
                                        sync=True)
    default_size = Int(64, sync=True, exposed=True, display_index=9,
                       display_name='Default size')  # dot size in pixels
    names = NdArray(sync=True)
    display_names = Bool(True, sync=True, exposed=True, display_index=11,
                         display_name='Display names')
    fill = Bool(True, sync=True)
    drag_color = Color('DodgerBlue', sync=True)
    names_unique = Bool(True, sync=True)

    enable_move = Bool(False, sync=True)
    enable_add = Bool(False, sync=True)
    enable_delete = Bool(False, sync=True)
    restrict_x = Bool(False, sync=True)
    restrict_y = Bool(False, sync=True)
    update_on_move = Bool(False, sync=True)

    def __init__(self, **kwargs):
        super(Scatter, self).__init__(**kwargs)
        self._drag_end_handlers = CallbackDispatcher()
        self.on_msg(self._handle_custom_msgs)

    def on_drag_end(self, callback, remove=False):
        self._drag_end_handlers.register_callback(callback, remove=remove)

    def _handle_custom_msgs(self, _, content):
        if content.get('event', '') == 'drag_end':
            self._drag_end_handlers(self, content)

    _view_name = Unicode('Scatter', sync=True)
    _view_module = Unicode('nbextensions/bqplot/Scatter', sync=True)
    _model_name = Unicode('ScatterModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/ScatterModel', sync=True)


@register_mark('bqplot.Hist')
class Hist(Mark):

    """Histogram mark.

    In the case of the Hist mark, scales for 'sample' and 'counts' MUST be
    provided.

    Attributes
    ----------
    icon: string (class-level attribute)
        font-awesome icon for that mark
    name: string (class-level attribute)
        user-friendly name of the mark
    bins: nonnegative int (default: 10)
        number of bins in the histogram
    midpoints: list (default: [])
        midpoints of the bins of the histogram. It is a read-only attribute.

    Data Attributes
    ---------------
    sample: numpy.ndarray
        sample of which the histogram must be computed.
    counts: numpy.ndarray (read-only)
        number of sample points per bin. It is a read-only attribute.
    """
    # Mark decoration
    icon = 'fa-signal'
    name = 'Histogram'

    # Scaled attributes
    sample = NdArray(sync=True, allow_none=False, min_dim=1, max_dim=1,
                     display_name='Sample', scaled=True, rtype='Number')
    counts = NdArray(sync=True, display_index=4, display_name='Count',
                     scaled=True, rtype='Number', read_only=True)
    # counts is a read-only attribute that is set when the mark is drawn

    # Other attributes
    scales_metadata = Dict({'sample': {'orientation': 'horizontal'},
                            'counts': {'orientation': 'vertical'}}, sync=True)
    bins = Int(10, sync=True, exposed=True, display_index=2,
               display_name='Number of bins')
    midpoints = List(sync=True, allow_none=False, read_only=True, display_index=3,
                     display_name='Mid points')
    # midpoints is a read-only attribute that is set when the mark is drawn
    colors = ColorList(CATEGORY10, sync=True, exposed=True, display_index=5,
                       display_name='Colors')
    stroke = Color('white', allow_none=True, sync=True)
    opacity = BoundedFloat(default_value=1.0, min=0.2, max=1, sync=True,
                           exposed=True, display_index=7,
                           display_name='Opacity')

    _view_name = Unicode('Hist', sync=True)
    _view_module = Unicode('nbextensions/bqplot/Hist', sync=True)
    _model_name = Unicode('HistModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/HistModel', sync=True)


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
    color_mode: {'auto', 'group', 'element'}
        enum attribute to specify if color should be the same for all bars with
        the same x or for all bars which belong to the same array in Y
        'group' means for every x all bars have same color.
        'element' means for every dimension of y, all bars have same color.
        'auto' picks 'group' and 'element' for 1-d and 2-d values of
        Y respectively.
    type: {'stacked', 'grouped'}
    colors: list of colors (default: CATEGORY10)
        list of colors for the bars.
    padding: float (default: 0.05)
        attribute to control the spacing between the bars
        value is specified as a percentage of the width of the bar
    select_bars: bool (default: False)
        make bars selectable or otherwise
    stroke: color (default: 'white')
        stroke color for the bars
    opacity: float (default: 1.0)
        opacity of the mark. Then number must be bewteen 0 and 1
    base: float (default: 0.0)
        reference value from which the bars are drawn. defaults to 0.0

    Data Attributes
    ---------------
    x: numpy.ndarray
        abscissas of the data points (1d array)
    y: numpy.ndarray
        ordinates of the values for the data points
    color: numpy.ndarray
        color of the data points (1d array). Defaults to default_color when not
        provided or when a value is NaN
    """
    # Mark decoration
    icon = 'fa-bar-chart'
    name = 'Bar chart'

    # Scaled attributes
    x = NdArray(sync=True, display_index=1, scaled=True, rtype='Number',
                min_dim=1, max_dim=1)
    y = NdArray(sync=True, display_index=2, scaled=True, rtype='Number',
                min_dim=1, max_dim=2)
    color = NdArray(sync=True, display_index=8, scaled=True, rtype='Color',
                    atype='bqplot.ColorAxis', min_dim=1, max_dim=1)

    # Other attributes
    scales_metadata = Dict({'x': {'orientation': 'horizontal'},
                            'y': {'orientation': 'vertical'}}, sync=True)
    color_mode = Enum(['auto', 'group', 'element'], default_value='auto',
                      allow_none=False, sync=True)
    type = Enum(['stacked', 'grouped'], default_value='stacked',
                allow_none=False, sync=True, exposed=True, display_index=3,
                display_name='Type')
    colors = ColorList(CATEGORY10, sync=True, exposed=True, display_index=4,
                       display_name='Colors')
    padding = Float(0.05, sync=True)
    select_bars = Bool(False, sync=True)
    stroke = Color('white', allow_none=True, sync=True)
    base = Float(default_value=0.0, sync=True)
    opacity = BoundedFloat(default_value=1.0, min=0.2, max=1, sync=True,
                           exposed=True, display_index=7,
                           display_name='Opacity')

    _view_name = Unicode('Bars', sync=True)
    _view_module = Unicode('nbextensions/bqplot/Bars', sync=True)
    _model_name = Unicode('BarsModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/BarsModel', sync=True)


@register_mark('bqplot.Label')
class Label(Mark):

    """Label mark.

    Attributes
    ----------
    x: Date or float
        horizontal position of the label, in data coordinates or in figure
        coordinates
    y: float or None (default: None)
        vertical y position of the label, in data coordinates or in figure
        coordinates
    x_offset: int (default: 0)
        horizontal offset in pixels from the stated x location
    y_offset: int (default: 0)
        vertical offset in pixels from the stated y location
    color: Color or None (default: None)
        label color
    rotate_angle: float (default: 0.0)
        angle by which the text is to be rotated
    text: string (default: '')
        text to be displayed
    font_size: string (default: '14px')
        front size in px, em or ex
    font_weight: {'bold', 'normal', 'bolder'}
        font weight of the caption
    align: {'start', 'middle', 'end'}
        alignment of the text with respect to the provided location
    """
    x = Date(sync=True) | Float(sync=True)  # TODO: check validation order, and default value
    y = Float(allow_none=True, default_value=None, sync=True)
    x_offset = Int(sync=True)
    y_offset = Int(sync=True)
    scales_metadata = Dict({'x': {'orientation': 'horizontal'},
                            'y': {'orientation': 'vertical'}}, sync=True)
    color = Color(None, allow_none=True, sync=True)
    rotate_angle = Float(sync=True)
    text = Unicode(sync=True)
    font_size = Unicode(default_value='14px', sync=True)
    font_weight = Enum(['bold', 'normal', 'bolder'], default_value='bold',
                       allow_none=False, sync=True)
    align = Enum(['start', 'middle', 'end'], default_value='start',
                 allow_none=False, sync=True)

    _view_name = Unicode('Label', sync=True)
    _view_module = Unicode('nbextensions/bqplot/Label', sync=True)


@register_mark('bqplot.OHLC')
class OHLC(Mark):

    """Open/High/Low/Close marks.

    Attributes
    ----------
    icon: string
        font-awesome icon for that mark
    name: string
        user-friendly name of the mark
    marker: {'candle', 'bar'}
        marker type
    stroke: color
        stroke color of the marker
    colors: ColorList
        fill colors for the markers (up/down)
    opacity: float
        opacity of the marker
    format: string
        description of y data being passed
        supports all permutations of the strings 'ohlc', 'oc', and 'hl'

    Data Attributes
    ---------------
    _y_default: numpy.ndarray
        default 2 dimensional value for y
    x: numpy.ndarray
        abscissas of the data points (1d array)
    y: numpy.ndarray
        Open/High/Low/Close ordinates of the data points (2d array)
    """

    # Mark decoration
    icon = 'fa-birthday-cake'
    name = 'OHLC chart'

    # Scaled attributes
    x = NdArray(sync=True, display_index=1, scaled=True, rtype='Number',
                min_dim=1, max_dim=1)
    y = NdArray(sync=True, display_index=2, scaled=True, rtype='Number',
                min_dim=2, max_dim=2)
    # FIXME Future warnings
    _y_default = None

    # Other attributes
    scales_metadata = Dict({'x': {'orientation': 'horizontal'},
                            'y': {'orientation': 'vertical'}}, sync=True)
    marker = Enum(['candle', 'bar'], allow_none=False, default_value='candle',
                  exposed=True, display_index=3, display_name='Marker',
                  sync=True)
    stroke = Color('white', sync=True, exposed=True, display_index=4,
                   display_name='Stroke color')
    stroke_width = Int(1, sync=True, exposed=True, display_name='Stroke Width',
                       display_index=5, allow_none=False)
    colors = ColorList(['limegreen', 'red'], allow_none_element=True,
                       allow_none=False, display_index=6, sync=True,
                       display_name='Colors')
    opacity = BoundedFloat(default_value=1.0, min=0, max=1, sync=True,
                           exposed=True, display_index=7,
                           display_name='Opacity')
    format = Unicode(default_value='ohlc', allow_none=False, exposed=True,
                     display_index=8, display_name='Format', sync=True)

    _view_name = Unicode('OHLC', sync=True)
    _view_module = Unicode('nbextensions/bqplot/OHLC', sync=True)
    _model_name = Unicode('OHLCModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/OHLCModel', sync=True)


@register_mark('bqplot.Pie')
class Pie(Mark):

    """Piechart mark.

    colors: list of colors
        list of colors for the slices.
    select_slices: bool
    stroke: color
    opacity: float
        opacity of the mark. Then number must be between 0 and 1
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

    Data Attributes
    ---------------
    sizes: numpy.ndarray
        proportions of the pie slices
    color: numpy.ndarray
        color of the data points (1d array). Defaults to colors when not
        provided
    """
    # Mark decoration
    icon = 'fa-pie-chart'
    name = 'Pie chart'

    # Scaled attributes
    sizes = NdArray(sync=True, display_index=1, rtype='Number',
                    min_dim=1, max_dim=1)
    color = NdArray(sync=True, display_index=8, scaled=True, rtype='Color',
                    atype='bqplot.ColorAxis', min_dim=1, max_dim=1)
    x = Float(default_value=0.5, sync=True) | Date(sync=True)
    y = Float(default_value=0.5, sync=True)

    # Other attributes
    scales_metadata = Dict({'x': {'orientation': 'horizontal'},
                            'y': {'orientation': 'vertical'}}, sync=True)
    sort = Bool(False, sync=True)
    colors = ColorList(CATEGORY10, sync=True, exposed=True, display_index=4,
                       display_name='Colors')
    select_slices = Bool(False, sync=True)
    stroke = Color('white', allow_none=True, sync=True)
    opacity = BoundedFloat(default_value=1.0, min=0.2, max=1, sync=True,
                           exposed=True, display_index=7,
                           display_name='Opacity')
    radius = BoundedFloat(default_value=300.0, min=0.0, max=float('inf'),
                          sync=True)
    inner_radius = BoundedFloat(default_value=0.1, min=0.0, max=float('inf'),
                                sync=True)
    start_angle = Float(default_value=0.0, sync=True, exposed=True)
    end_angle = Float(default_value=360.0, sync=True, exposed=True)

    _view_name = Unicode('Pie', sync=True)
    _view_module = Unicode('nbextensions/bqplot/Pie', sync=True)
    _model_name = Unicode('PieModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/PieModel', sync=True)
