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
Scales
======

.. currentmodule:: bqplot.scales

.. autosummary::
   :toctree: generate/

   Scale
   LinearScale
   LogScale
   DateScale
   OrdinalScale
   ColorScale
   DateColorScale
   OrdinalColorScale

"""

from IPython.html.widgets import Widget
from IPython.utils.traitlets import Unicode, List, Enum, Float, Bool, Type

from .traits import Date


class Scale(Widget):

    """The Scale base class
    """
    domain_class = Type(Float, sync=False)
    reverse = Bool(False, sync=True)  #: Whether the scale should be reversed
    allow_padding = Bool(True, sync=True)  #: Boolean indicating if the figure should be able to add padding to the scale or not
    _view_name = Unicode('Scale', sync=True)
    _model_name = Unicode('ScaleModel', sync=True)
    _ipython_display_ = None  # We cannot display a scale outside of a figure


class LinearScale(Scale):

    """A linear scale."""
    min = Float(default_value=None, sync=True, allow_none=True)
    max = Float(default_value=None, sync=True, allow_none=True)
    scale_range_type = Unicode('numeric', sync=True)
    _view_name = Unicode('LinearScale', sync=True)
    _model_name = Unicode('LinearScaleModel', sync=True)


class LogScale(Scale):

    """A log scale."""
    min = Float(default_value=None, sync=True, allow_none=True)
    max = Float(default_value=None, sync=True, allow_none=True)
    scale_range_type = Unicode('numeric', sync=True)
    _view_name = Unicode('LogScale', sync=True)
    _model_name = Unicode('LogScaleModel', sync=True)


class DateScale(Scale):

    """A date scale, with customizable formatting."""
    domain_class = Type(Date, sync=False)
    min = Date(default_value=None, sync=True, allow_none=True)
    max = Date(default_value=None, sync=True, allow_none=True)
    date_format = Unicode('', sync=True)
    scale_range_type = Unicode('numeric', sync=True)
    _view_name = Unicode('DateScale', sync=True)
    _model_name = Unicode('DateScaleModel', sync=True)


class OrdinalScale(Scale):

    """An ordinal scale."""
    domain = List(sync=True)
    scale_range_type = Unicode('numeric', sync=True)
    _view_name = Unicode('OrdinalScale', sync=True)
    _model_name = Unicode('OrdinalScaleModel', sync=True)


class ColorScale(Scale):

    """A color scale."""
    scale_type = Enum(['linear'], default_value='linear', sync=True)
    colors = List(sync=True)
    min = Float(default_value=None, sync=True, allow_none=True)
    max = Float(default_value=None, sync=True, allow_none=True)
    mid = Float(default_value=None, sync=True, allow_none=True)
    scheme = Unicode('RdYlGn', sync=True)
    scale_range_type = Unicode('Color', sync=True)
    _view_name = Unicode('LinearColorScale', sync=True)
    _model_name = Unicode('LinearColorScaleModel', sync=True)


class DateColorScale(ColorScale):

    min = Date(default_value=None, sync=True, allow_none=True)
    max = Date(default_value=None, sync=True, allow_none=True)
    mid = Unicode(default_value=None, sync=True, allow_none=True)
    date_format = Unicode("", sync=True)
    scale_range_type = Unicode('Color', sync=True)
    _view_name = Unicode('DateColorScale', sync=True)
    _model_name = Unicode('DateColorScaleModel', sync=True)


class OrdinalColorScale(ColorScale):

    scale_range_type = Unicode('Color', sync=True)
    domain = List(sync=True)
    _view_name = Unicode('OrdinalColorScale', sync=True)
    _model_name = Unicode('OrdinalScaleModel', sync=True)
