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

from traitlets import Unicode, Instance, Bool
from ipywidgets import DOMWidget, register, widget_serialization

from .interacts import PanZoom
from .figure import Figure
from ._version import __frontend_version__


@register
class Toolbar(DOMWidget):

    """Default toolbar for bqplot figures.

    The default toolbar provides three buttons:

    - A *Panzoom* toggle button which enables panning and zooming the figure.
    - A *Save* button to save the figure as a png image.
    - A *Reset* button, which resets the figure position to its original
      state.

    When the *Panzoom* button is toggled to True for the first time, a new
    instance of ``PanZoom`` widget is created.
    The created ``PanZoom`` widget uses the scales of all the marks that are on
    the figure at this point.
    When the *PanZoom* widget is toggled to False, the figure retrieves its
    previous interaction.
    When the *Reset* button is pressed, the ``PanZoom`` widget is deleted and
    the figure scales reset to their initial state. We are back to the case
    where the PanZoom widget has never been set.

    If new marks are added to the figure after the panzoom button is toggled,
    and these use new scales, those scales will not be panned or zoomed,
    unless the reset button is clicked.

    Attributes
    ----------
    figure: instance of Figure
        The figure to which the toolbar will apply.
    """

    figure = Instance(Figure).tag(sync=True, **widget_serialization)

    _panning = Bool(read_only=True).tag(sync=True)
    _panzoom = Instance(PanZoom, default_value=None, allow_none=True,
                        read_only=True).tag(sync=True, **widget_serialization)

    _view_name = Unicode('Toolbar').tag(sync=True)
    _model_name = Unicode('ToolbarModel').tag(sync=True)
    _view_module = Unicode('bqplot').tag(sync=True)
    _model_module = Unicode('bqplot').tag(sync=True)
    _view_module_version = Unicode(__frontend_version__).tag(sync=True)
    _model_module_version = Unicode(__frontend_version__).tag(sync=True)
