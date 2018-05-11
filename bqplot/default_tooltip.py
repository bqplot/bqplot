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

=============================
Default bqplot tooltip widget
=============================

.. currentmodule:: bqplot.default_tooltip

.. autosummary::
   :toctree: _generate/

   Tooltip
"""
from ipywidgets import DOMWidget
from traitlets import Unicode, List, Bool
from ._version import __frontend_version__


class Tooltip(DOMWidget):

    """Default tooltip widget for marks.

    Attributes
    ----------
    fields: list (default: [])
        list of names of fields to be displayed in the tooltip
        All the attributes  of the mark are accesible in the tooltip
    formats: list (default: [])
        list of formats to be applied to each of the fields.
        if no format is specified for a field, the value is displayed as it is
    labels: list (default: [])
        list of labels to be displayed in the table instead of the fields. If
        the length of labels is less than the length of fields, then the field
        names are displayed for those fields for which label is missing.
    show_labels: bool (default: True)
        Boolean attribute to enable and disable display of the
        label /field name
        as the first column along with the value
    """

    fields = List().tag(sync=True)
    formats = List().tag(sync=True)
    show_labels = Bool(True).tag(sync=True)
    labels = List().tag(sync=True)

    _view_name = Unicode('Tooltip').tag(sync=True)
    _model_name = Unicode('TooltipModel').tag(sync=True)
    _view_module = Unicode('bqplot').tag(sync=True)
    _model_module = Unicode('bqplot').tag(sync=True)
    _view_module_version = Unicode(__frontend_version__).tag(sync=True)
    _model_module_version = Unicode(__frontend_version__).tag(sync=True)
