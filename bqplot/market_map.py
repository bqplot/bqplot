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
# from .figure import Figure
from IPython.utils.traitlets import Int, Unicode, List, Dict, Enum, Bool
from IPython.html.widgets import DOMWidget

from .traits import NumpyArray, PandasDataFrame
from .marks import CATEGORY10


class MarketMap(DOMWidget):
    map_width = Int(1080, sync=True)
    map_height = Int(800, sync=True)

    names = NumpyArray(sync=True)  # primary key for the data
    groups = NumpyArray(sync=True)  # group by is run on this attribute
    display_text = NumpyArray(sync=True)  # name to be displayed on the rectangle in the map. If this is empty it defaults to the names attribute
    ref_data = PandasDataFrame(sync=True)  # Data frame to display the data which can be used for different operations

    tooltip_fields = List(sync=True)  # names of the fields from the ref_data dataframe which should be displayed in the tooltip
    tooltip_formats = List(sync=True)  # Formats for each of the fields for the tooltip data. Order should match the order of the tooltip_fields
    show_groups = Bool(False, sync=True)  # attribute to determine if the groups should be displayed. If set to True, the finer elements are blurred

    cols = Int(sync=True, allow_none=True)  # Suggestion for no of columns in the map.
    # If not specified, value is inferred from the no of rows and no of columns
    rows = Int(sync=True, allow_none=True)  # No of rows in the map.
    # If not specified, value is inferred from the no of cells and no of columns
    # If both rows and columns are not specified, then a square is constructed
    # basing on the no of cells
    # The above two attributes are suggestions which are respected unless they
    # are not feasible. One required condition is that, the number of columns
    # is odd when row_groups is greater than 1.

    row_groups = Int(1, sync=True)
    colors = List(CATEGORY10, sync=True)   # colors to be cycled in absence of data for the color
    scales = Dict(sync=True)
    axes = List(sync=True)  # Possibility to have a color axis
    color_data = NumpyArray(sync=True)
    map_margin = Dict(dict(top=50, right=50, left=50, bottom=50), sync=True)
    preserve_aspect = Bool(False, sync=True, display_name='Preserve aspect ratio')  #: Preserve the aspect ratio given by the minimum width and height

    stroke = Unicode('white', sync=True)   # Stroke of each of the cells of the market map
    group_stroke = Unicode('black', sync=True)  # Stroke of the group of cells corresponding to a group
    selected_stroke = Unicode("dodgerblue", sync=True)  # border of the selected cells
    hovered_stroke = Unicode("orangered", sync=True)  # border of the cell being hovered on

    clickable = Bool(False, sync=True)
    selected = List([], sync=True)
    enable_hover = Bool(True, sync=True)
    _view_name = Unicode("MarketMap", sync=True)


class SquareMarketMap(MarketMap):
    margin = Dict(dict(top=50, right=50, left=50, bottom=50), sync=True)
    data = Dict(sync=True)
    mode = Enum(['squarify', 'slice', 'dice', 'slice-dice'], default_value='squarify', sync=True)
    _view_name = Unicode("SquareMarketMap", sync=True)
