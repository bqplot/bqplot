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
Figure
======

.. currentmodule:: bqplot.figure

.. autosummary::
   :toctree: generate/

   Figure
"""

from IPython.html.widgets import DOMWidget, register
from IPython.utils.traitlets import Unicode, Instance, List, Dict, Any, CFloat, Bool, Enum, Float

from .scales import Scale, LinearScale


@register('bqplot.Figure')
class Figure(DOMWidget):

    """Main canvas for drawing a chart.

    The Figure object holds the list of Marks and Axes. It also holds an
    optional Overlay object that is responsible for figure-level mouse
    interactions, the "interaction layer".

    Besides, the Figure object has two reference scales, for positioning items
    in an absolute fashion in the figure canvas.


    .. rubric:: Data Attributes

    .. autosummary::

       title
       axes
       marks
       overlay
       scale_x
       scale_y

    .. rubric:: Layout Attributes

    .. autosummary::

       min_width
       min_height
       preserve_aspect
       fig_margin
       padding_x
       padding_y
       legend_location


    .. rubric:: HTML Attributes

    .. autosummary::

       border_color
       border_style
       border_width

       color
       background_color
       border_color

       font_family
       font_size
       font_weight

       width
       height

       padding
       margin
    """
    _view_name = Unicode('bqplot.Figure', sync=True)

    #: The title of the figure
    title = Unicode(sync=True, exposed=True, display_index=1, display_name='Title')
    #: List of axes
    axes = List(allow_none=False, sync=True)
    #: List of marks
    marks = List(allow_none=False, sync=True)
    #: The (optional) interaction layer widget
    overlay = Any(None, sync=True)
    #: A scale instance for the horizontal global figure scale
    scale_x = Instance(Scale, sync=True)
    #: A scale instance for the vertical global figure scale
    scale_y = Instance(Scale, sync=True)

    #: Minimum width for the figure, including the figure margins
    min_width = CFloat(800.0, sync=True)
    #: Minimum height for the figure, including the figure margins
    min_height = CFloat(600.0, sync=True)
    #: Preserve the aspect ratio of the figure box specified with `min_width` and `min_height`.
    #: This does not guarantee that the data coordinates will have any specific aspect ratio.
    preserve_aspect = Bool(False, sync=True, exposed=True, display_index=3, display_name='Preserve aspect ratio')

    #: Dictionary of figure margins, containing 'top', 'bottom', 'left' and 'right' margins.
    #: The user is responsible for making sure that the width and height are greater than the sum of the margins.
    fig_margin = Dict(dict(top=60, bottom=60, left=60, right=60), sync=True)
    #: Padding to be applied around the data points in the figure in the horizontal direction on both sides
    padding_x = Float(0, sync=True)
    #: Padding to be applied around the data points in the figure in the vertical direction on both sides
    padding_y = Float(0.025, sync=True)
    #: The legend location
    legend_location = Enum(['top-right', 'top', 'top-left', 'left', 'bottom-left', 'bottom', 'bottom-right', 'right'],
                           default_value='top-right', allow_none=False, sync=True,
                           exposed=True, display_index=2, display_name='Legend position')

    def _scale_x_default(self):
        return LinearScale(min=0, max=1)

    def _scale_y_default(self):
        return LinearScale(min=0, max=1)
