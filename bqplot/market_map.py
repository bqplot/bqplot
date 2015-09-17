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
   :toctree: generate/

   MarketMap
   SquareMarketMap
"""

from traitlets import Int, Unicode, List, Dict, Enum, Bool, Instance
from ipywidgets import DOMWidget, CallbackDispatcher, widget_serialization

from .traits import NdArray, PandasDataFrame
from .marks import CATEGORY10


class MarketMap(DOMWidget):

    """Class to generate a waffle wrapped map of the list of data provided.

    Attributes
    ----------
    names: numpy.ndarray of strings or objects convertible to strings (default: [])
        primary key for the data of the map. One rectangle is created for each
        unique entry in this array
    groups: numpy.ndarray (default: [])
        attribute on which the groupby is run. If this is an empty arrray, then
        there is no group by for the map.
    display_text: numpy.ndarray (default: [])
        data to be displayed on each rectangle of the map.If this is empty it
        defaults to the names attribute.
    ref_data: PandasDataFrame
        Additional data associated with each element of the map. The data in
        this data frame can be displayed as a tooltip.
    color: numpy.ndarray (default: [])
        Data to represent the color for each of the cells. If the value of the
        data is NaN for a cell, then the color of the cell is the color of the
        group it belongs to in absence of data for color
    scales: Dictionary of , scales holding a scale for each data attribute
        - If the map has data being passed as color, then a corresponding color
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
    show_groups: bool
        attribute to determine if the groups should be displayed. If set to
        True, the finer elements are blurred

    Map Drawing Attributes
    ------------------
    map_width: int
        minimum width of the entire map
    map_height: int
        minimum height of the entire map
    map_margin: dict
        margin for the market map plot area with respect to the entire display
        area
    preserve_aspect: bool
        boolean to control if the aspect ratio should be preserved or not
        during a resize
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

    Display Attributes
    ------------------
    colors: list of colors
        colors for each of the groups which are cycled over to cover all the
        groups
    stroke: color
        Stroke of each of the cells of the market map
    group_stroke: color
        Stroke of the border for the group of cells corresponding to a group
    selected_stroke: color
        stroke for the selected cells
    hovered_stroke: color
        stroke for the cell being hovered on

    Other Attributes
    ----------------
    enable_select: bool
        boolean to control the ability to select the cells of the map by
        clicking
    enable_hover: bool
        boolean to control if the map should be aware of which cell is being
        hovered on. If it is set to False, tooltip will not be displayed
    """
    map_width = Int(1080, sync=True)
    map_height = Int(800, sync=True)

    names = NdArray(sync=True)
    groups = NdArray(sync=True)
    display_text = NdArray(sync=True)
    ref_data = PandasDataFrame(sync=True)

    tooltip_fields = List(sync=True)
    tooltip_formats = List(sync=True)
    show_groups = Bool(False, sync=True)

    cols = Int(sync=True, allow_none=True)
    rows = Int(sync=True, allow_none=True)

    row_groups = Int(1, sync=True)
    colors = List(CATEGORY10, sync=True)
    scales = Dict(sync=True, allow_none=True,
                  **widget_serialization)
    axes = List(sync=True, allow_none=True,
                **widget_serialization)
    color = NdArray(sync=True)
    map_margin = Dict(dict(top=50, right=50, left=50, bottom=50), sync=True)
    preserve_aspect = Bool(False, sync=True,
                           display_name='Preserve aspect ratio')

    stroke = Unicode('white', sync=True)
    group_stroke = Unicode('black', sync=True)
    selected_stroke = Unicode('dodgerblue', sync=True)
    hovered_stroke = Unicode('orangered', sync=True)

    selected = List(sync=True)
    enable_hover = Bool(True, sync=True)
    enable_select = Bool(True, sync=True)
    tooltip_widget = Instance(DOMWidget, allow_none=True, sync=True,
                              **widget_serialization)

    def __init__(self, **kwargs):
        super(MarketMap, self).__init__(**kwargs)
        self._hover_handlers = CallbackDispatcher()
        self.on_msg(self._handle_custom_msgs)

    def on_hover(self, callback, remove=False):
        self._hover_handlers.register_callback(callback, remove=remove)

    def _handle_custom_msgs(self, _, content, buffers=None):
        if content.get('event', '') == 'hover':
            self._hover_handlers(self, content)

    _view_name = Unicode('MarketMap', sync=True)
    _view_module = Unicode('nbextensions/bqplot/MarketMap', sync=True)
    _model_name = Unicode('MarketMapModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/MarketMapModel', sync=True)


class SquareMarketMap(MarketMap):
    margin = Dict(dict(top=50, right=50, left=50, bottom=50), sync=True)
    data = Dict(sync=True)
    mode = Enum(['squarify', 'slice', 'dice', 'slice-dice'],
                default_value='squarify', sync=True)

    _view_name = Unicode('SquareMarketMap', sync=True)
    _view_module = Unicode('nbextensions/bqplot/SquareMarketMap', sync=True)
