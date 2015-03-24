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

from IPython.html.widgets import Widget, Color
from IPython.utils.traitlets import Unicode, List, Enum, Float, Bool, Type

import numpy as np
from .traits import Date


def register_scale(key=None):
    """Returns a decorator registering a scale class in the scale type
    registry. If no key is provided, the class name is used as a key. A key is
    provided for each core bqplot scale type so that the frontend can use
    this key regardless of the kernal language."""
    def wrap(scale):
        label = key if key is not None else scale.__module__ + scale.__name__
        Scale.scale_types[label] = scale
        return scale
    return wrap


class Scale(Widget):

    """The base scale class

    Scale objects represent a mapping between data (the domain) and a visual
    quantity (The range).

    Attributes
    ----------
    scale_types: dict (class-level attribute)
        A registry of existing scale types.
    domain_class: type (default: Float)
        traitlet type used to validate values in of the domain of the scale.
    reverse: bool (default: False)
        whether the scale should be reversed
    allow_padding: bool (default: True)
        indicates whether figures are allowed to add data padding to this scale
        or not
    """
    scale_types = {}
    domain_class = Type(Float, sync=False)
    reverse = Bool(False, sync=True)
    allow_padding = Bool(True, sync=True)

    _view_name = Unicode('Scale', sync=True)
    _view_module = Unicode('nbextensions/bqplot/Scale', sync=True)
    _model_name = Unicode('ScaleModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/ScaleModel', sync=True)
    _ipython_display_ = None  # We cannot display a scale outside of a figure


@register_scale('bqplot.LinearScale')
class LinearScale(Scale):

    """A linear scale

    An affine mapping from a numerical domain to a numerical range.

    Attributes
    ----------
    min: float or None (default: None)
        if not None, min is the minimal value of the domain
    max: float or None (default: None)
        if not None, max is the maximal value of the domain
    rtype: string (class-level attribute)
        This attribute should not be modifed. The range type of a linear
        scale is numerical.
    dtype: type (class-level attribute)
        the associated data type / domain type
    """
    rtype = 'Number'
    dtype = np.number
    min = Float(default_value=None, sync=True, allow_none=True)
    max = Float(default_value=None, sync=True, allow_none=True)

    _view_name = Unicode('LinearScale', sync=True)
    _view_module = Unicode('nbextensions/bqplot/LinearScale', sync=True)
    _model_name = Unicode('LinearScaleModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/LinearScaleModel', sync=True)


@register_scale('bqplot.LogScale')
class LogScale(Scale):

    """A log scale.

    A logarithmic mapping from a numerical domain to a numerical range.

    Attributes
    ----------
    min: float or None (default: None)
        if not None, min is the minimal value of the domain
    max: float or None (default: None)
        if not None, max is the maximal value of the domain
    rtype: string (class-level attribute)
        This attribute should not be modifed by the user.
        The range type of a linear scale is numerical.
    dtype: type (class-level attribute)
        the associated data type / domain type
    """
    rtype = 'Number'
    dtype = np.number
    min = Float(default_value=None, sync=True, allow_none=True)
    max = Float(default_value=None, sync=True, allow_none=True)

    _view_name = Unicode('LogScale', sync=True)
    _view_module = Unicode('nbextensions/bqplot/LogScale', sync=True)
    _model_name = Unicode('LogScaleModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/LogScaleModel', sync=True)


@register_scale('bqplot.DateScale')
class DateScale(Scale):

    """A date scale, with customizable formatting.

    An affine mapping from dates to a numerical range.

    Attributes
    ----------
    min: Date or None (default: None)
        if not None, min is the minimal value of the domain
    max: Date (default: None)
        if not None, max is the maximal value of the domain
    domain_class: type (default: Date)
         traitlet type used to validate values in of the domain of the scale.
    date_format: string (default: '')

    rtype: string (class-level attribute)
        This attribute should not be modifed by the user.
        The range type of a linear scale is numerical.
    dtype: type (class-level attribute)
        the associated data type / domain type
    """
    rtype = 'Number'
    dtype = np.datetime64
    domain_class = Type(Date, sync=False)
    min = Date(default_value=None, sync=True, allow_none=True)
    max = Date(default_value=None, sync=True, allow_none=True)
    date_format = Unicode('', sync=True)  # TODO: allow and default to None?

    _view_name = Unicode('DateScale', sync=True)
    _view_module = Unicode('nbextensions/bqplot/DateScale', sync=True)
    _model_name = Unicode('DateScaleModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/DateScaleModel', sync=True)


@register_scale('bqplot.OrdinalScale')
class OrdinalScale(Scale):

    """An ordinal scale.

    A mapping from a discrete set of values to a numerical range.

    Attributes
    ----------
    domain: list (default: [])
        The discrete values mapped by the ordinal scale
    rtype: string (class-level attribute)
        This attribute should not be modifed by the user.
        The range type of a linear scale is numerical.
    dtype: type (class-level attribute)
        the associated data type / domain type
    """
    rtype = 'Number'
    dtype = np.str
    domain = List(sync=True)

    _view_name = Unicode('OrdinalScale', sync=True)
    _view_module = Unicode('nbextensions/bqplot/OrdinalScale', sync=True)
    _model_name = Unicode('OrdinalScaleModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/OrdinalScaleModel', sync=True)


@register_scale('bqplot.ColorScale')
class ColorScale(Scale):

    """A color scale.

    A mapping from numbers to colors. The relation is affine by part.

    Attributes
    ----------
    scale_type: {'linear'}

    colors: list of colors (default: [])

    min: float or None (default: None)

    max: float or None (default: None)

    mid: float or None (default: None)

    scheme: string (default: 'RdYlGn')

    rtype: string (class-level attribute)
        This attribute should not be modifed by the user.
        The range type of a color scale is 'Color'.
    dtype: type (class-level attribute)
        the associated data type / domain type
    """
    rtype = 'Color'
    dtype = np.number
    scale_type = Enum(['linear'], default_value='linear',
                      sync=True)
    colors = List(trait=Color(), sync=True)
    min = Float(default_value=None, sync=True, allow_none=True)
    max = Float(default_value=None, sync=True, allow_none=True)
    mid = Float(default_value=None, sync=True, allow_none=True)
    scheme = Unicode('RdYlGn', sync=True)

    _view_name = Unicode('LinearColorScale', sync=True)
    _view_module = Unicode('nbextensions/bqplot/LinearColorScale', sync=True)
    _model_name = Unicode('LinearColorScaleModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/LinearColorScaleModel', sync=True)


@register_scale('bqplot.DateColorScale')
class DateColorScale(ColorScale):

    """A date color scale.

    A mapping from dates to a numerical domain.

    Attributes
    ----------
    min: Date or None (default: None)

    max: Date or None (default: None)

    mid: Date or None (default: None)

    date_format: string (default: '')

    rtype: string (class-level attribute)
        This attribute should not be modifed by the user.
        The range type of a color scale is 'Color'.
    dtype: type (class-level attribute)
        the associated data type / domain type
    """
    rtype = 'Color'
    dtype = np.datetime64
    min = Date(default_value=None, sync=True, allow_none=True)
    max = Date(default_value=None, sync=True, allow_none=True)
    mid = Unicode(default_value=None, sync=True, allow_none=True)
    date_format = Unicode(sync=True)

    _view_name = Unicode('DateColorScale', sync=True)
    _view_module = Unicode('nbextensions/bqplot/DateColorScale', sync=True)
    _model_name = Unicode('DateColorScaleModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/DateColorScaleModel', sync=True)


@register_scale('bqplot.OrdinalColorScale')
class OrdinalColorScale(ColorScale):

    """An ordinal color scale.

    A mapping from a discrete set of values to colors.

    Attributes
    ----------
    domain: list (default: [])
        The discrete values mapped by the ordinal scales.
    rtype: string (class-level attribute)
        This attribute should not be modifed by the user.
        The range type of a color scale is 'color'.
    dtype: type (class-level attribute)
        the associated data type / domain type
    """
    rtype = 'Color'
    dtype = np.str
    domain = List(sync=True)

    _view_name = Unicode('OrdinalColorScale', sync=True)
    _view_module = Unicode('nbextensions/bqplot/OrdinalColorScale', sync=True)
    _model_name = Unicode('OrdinalScaleModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/OrdinalScaleModel', sync=True)
