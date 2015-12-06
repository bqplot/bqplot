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

=======
Toolbar
=======

.. currentmodule:: bqplot.toolbar

.. autosummary::
   :toctree: _generate/

   Toolbar
"""

from traitlets import Unicode, Instance
from ipywidgets import DOMWidget, register, widget_serialization

from .figure import Figure


@register('bqplot.toolbar')
class Toolbar(DOMWidget):

    """Default toolbar for bqplot figures.

    The default toolbar provides three buttons:

    - A *Panzoom* toggle button whih enables panning and zooming the figure.
    - A *Save* button to save the figure as a png image.
    - A *Reset* button, which resets the figure position to its original
      state.

    When the *Panzoom* button is toggled, a new instance of the ``Panzoom``
    widget is created with the marks that are part of the figure at this.
    If new marks are created after it is toggled, and these use new scales,
    those scales will not be panned or zoomed, unless the toggle is released
    and pressed again.

    Attributes
    ----------

    figure: instance of Figure
        The figure to which the toolbar will apply.
    """

    figure = Instance(Figure, sync=True, **widget_serialization)

    _view_name = Unicode('Toolbar', sync=True)
    _view_module = Unicode('nbextensions/bqplot/Toolbar', sync=True)
    _model_name = Unicode('ToolbarModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/Toolbar', sync=True)
