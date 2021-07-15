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

==========
Market Map
==========

.. currentmodule:: bqplot.market_map

.. autosummary::
   :toctree: _generate/

   MarketMap
"""

from traitlets import Int, Unicode, List, Dict, Bool, Instance, Float
from traittypes import Array, DataFrame
from ipywidgets import (DOMWidget, CallbackDispatcher, Color,
                        widget_serialization)
from ipywidgets.widgets.widget_layout import LayoutTraitType

from .traits import (array_serialization, dataframe_serialization,
                     dataframe_warn_indexname)
from .marks import CATEGORY10
from ._version import __frontend_version__


class MarketMap(DOMWidget):

    """Waffle wrapped map.

    Attributes
    ----------
    names: numpy.ndarray of strings (default: [])
        The elements can also be objects convertible to string
        primary key for the map data. A rectangle is created for each
        unique entry in this array
    groups: numpy.ndarray (default: [])
        attribute on which the groupby is run. If this is an empty array, then
        there is no group by for the map.
    display_text: numpy.ndarray or None(default: None)
        data to be displayed on each rectangle of the map.If this is empty it
        defaults to the names attribute.
    ref_data: pandas.DataDrame or None (default: None)
        Additional data associated with each element of the map. The data in
        this data frame can be displayed as a tooltip.
    color: numpy.ndarray (default: [])
        Data to represent the color for each of the cells. If the value of the
        data is NaN for a cell, then the color of the cell is the color of the
        group it belongs to in absence of data for color
    scales: Dictionary of scales holding a scale for each data attribute
        If the map has data being passed as color, then a corresponding color
        scale is required
    axes: List of axes
        Ability to add an axis for the scales which are used to scale data
        represented in the map
    on_hover: custom event
        This event is received when the mouse is hovering over a cell. Returns
        the data of the cell and the ref_data associated with the cell.
    tooltip_widget: Instance of a widget
        Widget to be displayed as the tooltip. This can be combined with the
        on_hover event to display the chart corresponding to the cell being
        hovered on.
    tooltip_fields: list
        names of the fields from the ref_data dataframe which should be
        displayed in the tooltip.
    tooltip_formats: list
        formats for each of the fields for the tooltip data. Order should match
        the order of the tooltip_fields
    freeze_tooltip_location: bool (default: False)
        if True, freezes the location of the tooltip. If False, tootip will
        follow the mouse
    show_groups: bool
        attribute to determine if the groups should be displayed. If set to
        True, the finer elements are blurred

    Map Drawing Attributes
    cols: int
        Suggestion for no of columns in the map.If not specified, value is
        inferred from the no of rows and no of cells
    rows: int
        No of rows in the map.If not specified, value is inferred from the no
        of cells and no of columns.
        If both rows and columns are not specified, then a square is
        constructed basing on the no of cells.
        The above two attributes are suggestions which are respected unless
        they are not feasible. One required condition is that, the number of
        columns is odd when row_groups is greater than 1.
    row_groups: int
        No of groups the rows should be divided into. This can be used to draw
        more square cells for each of the groups

    Layout Attributes

    map_margin: dict (default: {top=50, bottom=50, left=50, right=50})
        Dictionary containing the top, bottom, left and right margins. The user
        is responsible for making sure that the width and height are greater
        than the sum of the margins.
    min_aspect_ratio: float
         minimum width / height ratio of the figure
    max_aspect_ratio: float
         maximum width / height ratio of the figure


    Display Attributes

    colors: list of colors
        Colors for each of the groups which are cycled over to cover all the
        groups
    title: string
        Title of the Market Map
    title_style: dict
        CSS style for the title of the Market Map
    stroke: color
        Stroke of each of the cells of the market map
    group_stroke: color
        Stroke of the border for the group of cells corresponding to a group
    selected_stroke: color
        stroke for the selected cells
    hovered_stroke: color
        stroke for the cell being hovered on
    font_style: dict
        CSS style for the text of each cell

    Other Attributes

    enable_select: bool
        boolean to control the ability to select the cells of the map by
        clicking
    enable_hover: bool
        boolean to control if the map should be aware of which cell is being
        hovered on. If it is set to False, tooltip will not be displayed

    Note
    ----

    The aspect ratios stand for width / height ratios.

     - If the available space is within bounds in terms of min and max aspect
       ratio, we use the entire available space.
     - If the available space is too oblong horizontally, we use the client
       height and the width that corresponds max_aspect_ratio (maximize width
       under the constraints).
     - If the available space is too oblong vertically, we use the client width
       and the height that corresponds to min_aspect_ratio (maximize height
       under the constraint).
       This corresponds to maximizing the area under the constraints.

    Default min and max aspect ratio are both equal to 16 / 9.
    """
    names = Array([]).tag(sync=True, **array_serialization)
    groups = Array([]).tag(sync=True, **array_serialization)
    display_text = Array(None, allow_none=True)\
        .tag(sync=True, **array_serialization)
    ref_data = DataFrame(None, allow_none=True)\
        .tag(sync=True, **dataframe_serialization)\
        .valid(dataframe_warn_indexname)
    title = Unicode().tag(sync=True)

    tooltip_fields = List().tag(sync=True)
    tooltip_formats = List().tag(sync=True)
    show_groups = Bool().tag(sync=True)

    cols = Int(allow_none=True).tag(sync=True)
    rows = Int(allow_none=True).tag(sync=True)

    row_groups = Int(1).tag(sync=True)
    colors = List(CATEGORY10).tag(sync=True)
    scales = Dict().tag(sync=True, **widget_serialization)
    axes = List().tag(sync=True, **widget_serialization)
    color = Array([]).tag(sync=True, **array_serialization)
    map_margin = Dict(dict(top=50, right=50, left=50, bottom=50))\
        .tag(sync=True)

    layout = LayoutTraitType(kw=dict(min_width='125px'))\
        .tag(sync=True, **widget_serialization)
    min_aspect_ratio = Float(1.0).tag(sync=True)
    # Max aspect ratio is such that we can have 3 charts stacked vertically
    # on a 16:9 monitor: 16/9*3 ~ 5.333
    max_aspect_ratio = Float(6.0).tag(sync=True)

    stroke = Color('white').tag(sync=True)
    group_stroke = Color('black').tag(sync=True)
    selected_stroke = Color('orangered', allow_none=True).tag(sync=True)
    hovered_stroke = Color('orangered', allow_none=True).tag(sync=True)
    font_style = Dict().tag(sync=True)
    title_style = Dict().tag(sync=True)

    selected = List().tag(sync=True)
    enable_hover = Bool(True).tag(sync=True)
    enable_select = Bool(True).tag(sync=True)
    tooltip_widget = Instance(DOMWidget, allow_none=True, default_value=None)\
        .tag(sync=True, **widget_serialization)
    freeze_tooltip_location = Bool(False).tag(sync=True)

    def __init__(self, **kwargs):
        super(MarketMap, self).__init__(**kwargs)
        self._hover_handlers = CallbackDispatcher()
        self.on_msg(self._handle_custom_msgs)

    def on_hover(self, callback, remove=False):
        self._hover_handlers.register_callback(callback, remove=remove)

    def _handle_custom_msgs(self, _, content, buffers=None):
        if content.get('event', '') == 'hover':
            self._hover_handlers(self, content)

    def _compare(self, a, b):
        # Compare dataframes properly
        import pandas as pd
        if isinstance(a, pd.DataFrame) or isinstance(b, pd.DataFrame):
            return pd.DataFrame.equals(a, b)

        return super(MarketMap, self)._compare(a, b)

    _view_name = Unicode('MarketMap').tag(sync=True)
    _model_name = Unicode('MarketMapModel').tag(sync=True)
    _view_module = Unicode('bqplot').tag(sync=True)
    _model_module = Unicode('bqplot').tag(sync=True)
    _view_module_version = Unicode(__frontend_version__).tag(sync=True)
    _model_module_version = Unicode(__frontend_version__).tag(sync=True)
