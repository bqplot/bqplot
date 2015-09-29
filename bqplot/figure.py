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

from traitlets import Unicode, Instance, List, Dict, CFloat, Bool, Enum, Float
from ipywidgets import DOMWidget, register, Color, widget_serialization

from .scales import Scale, LinearScale
from .interacts import Interaction
from .marks import Mark
from .axes import Axis


@register('bqplot.Figure')
class Figure(DOMWidget):

    """Main canvas for drawing a chart.

    The Figure object holds the list of Marks and Axes. It also holds an
    optional Interaction object that is responsible for figure-level mouse
    interactions, the "interaction layer".

    Besides, the Figure object has two reference scales, for positioning items
    in an absolute fashion in the figure canvas.

    Attributes
    ----------
    title: string (default: "")
        title of the figure
    axes: List of Axes (default: [])
        list containing the instances of the axes for the figure
    marks: List of Marks (default: [])
        list containing the marks which are to be appended to the figure
    interaction: Interaction or None (default: )
        optional interaction layer for the figure
    scale_x: Scale
        Scale representing the x values of the figure
    scale_y: Scale
        Scale representing the y values of the figure
    padding_x: Float (default: 0.0)
        Padding to be applied in the horizontal direction of the figure
        around the data points, proportion of the horizontal length
    padding_y: Float (default: 0.025)
        Padding to be applied in the vertical direction of the figure
        around the data points, proportion of the vertical length
    legend_location:  {'top-right', 'top', 'top-left', 'left',
                       'bottom-left', 'bottom', 'bottom-right', 'right'}
        location of the legend relative to the center of the figure
    fig_color: Color (default: None)
        background color of the figure

    Layout Attributes
    -----------------
    min_width: CFloat (default: 800.0)
        minimum width of the figure including the figure margins
    min_height: CFloat (default: 600.0)
        minimum height of the figure including the figure margins
    preserve_aspect: bool (default: False)
        Determines whether the aspect ratio for the figure specified by
        min_width and min_height is preserved during resizing. This does not
        guarantee that the data coordinates will have any specific aspect
        ratio.
    fig_margin: dict (default: {top=60, bottom=60, left=60, right=60})
        Dictionary containing the top, bottom, left and right margins. The user
        is responsible for making sure that the width and height are greater
        than the sum of the margins.

    """
    title = Unicode(sync=True, display_name='Title')
    axes = List(Instance(Axis), sync=True, **widget_serialization)
    marks = List(Instance(Mark), sync=True, **widget_serialization)
    interaction = Instance(Interaction, allow_none=True, sync=True,
                           **widget_serialization)
    scale_x = Instance(Scale, sync=True, **widget_serialization)
    scale_y = Instance(Scale, sync=True, **widget_serialization)
    fig_color = Color(None, allow_none=True, sync=True)

    min_width = CFloat(800.0, sync=True)
    min_height = CFloat(500.0, sync=True)
    preserve_aspect = Bool(False, sync=True, display_name='Preserve aspect ratio')

    fig_margin = Dict(dict(top=60, bottom=60, left=60, right=60), sync=True)
    padding_x = Float(default_value=0.0, min=0.0, max=1.0, sync=True)
    padding_y = Float(default_value=0.025, min=0.0, max=1.0, sync=True)
    legend_location = Enum(['top-right', 'top', 'top-left', 'left',
                            'bottom-left', 'bottom', 'bottom-right', 'right'],
                           default_value='top-right', sync=True,
                           display_name='Legend position')

    def save(self):
        self.send({"type": "save"})

    def _scale_x_default(self):
        return LinearScale(min=0, max=1)

    def _scale_y_default(self):
        return LinearScale(min=0, max=1)

    _view_name = Unicode('Figure', sync=True)
    _view_module = Unicode('nbextensions/bqplot/Figure', sync=True)
    _model_name = Unicode('FigureModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/FigureModel', sync=True)
