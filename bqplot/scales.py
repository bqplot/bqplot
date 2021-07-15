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
   :toctree: _generate/

   Scale
   LinearScale
   LogScale
   DateScale
   OrdinalScale
   ColorScale
   DateColorScale
   OrdinalColorScale
   GeoScale
   Mercator
   AlbersUSA
   Gnomonic
   Stereographic
"""

from ipywidgets import Widget, Color
from traitlets import Unicode, List, Enum, Float, Bool, Type, Tuple

import numpy as np
from .traits import Date
from ._version import __frontend_version__


def register_scale(key=None):
    """Returns a decorator to register a scale type in the scale type
    registry.

    If no key is provided, the class name is used as a key. A key is
    provided for each core bqplot scale type so that the frontend can use
    this key regardless of the kernel language.
    """
    def wrap(scale):
        label = key if key is not None else scale.__module__ + scale.__name__
        Scale.scale_types[label] = scale
        return scale
    return wrap


class Scale(Widget):

    """The base scale class.

    Scale objects represent a mapping between data (the domain) and a visual
    quantity (The range).

    Attributes
    ----------
    scale_types: dict (class-level attribute)
        A registry of existing scale types.
    domain_class: type (default: Float)
        traitlet type used to validate values in of the domain of the scale.
    reverse: bool (default: False)
        whether the scale should be reversed.
    allow_padding: bool (default: True)
        indicates whether figures are allowed to add data padding to this scale
        or not.
    precedence: int (class-level attribute)
        attribute used to determine which scale takes precedence in cases when
        two or more scales have the same rtype and dtype.
    """
    scale_types = {}
    precedence = 1
    domain_class = Type(Float)
    reverse = Bool().tag(sync=True)
    allow_padding = Bool(True).tag(sync=True)

    _view_name = Unicode('Scale').tag(sync=True)
    _model_name = Unicode('ScaleModel').tag(sync=True)
    _view_module = Unicode('bqplot').tag(sync=True)
    _model_module = Unicode('bqplot').tag(sync=True)
    _view_module_version = Unicode(__frontend_version__).tag(sync=True)
    _model_module_version = Unicode(__frontend_version__).tag(sync=True)
    _ipython_display_ = None  # We cannot display a scale outside of a figure


class GeoScale(Scale):

    """The base projection scale class for Map marks.

    The GeoScale represents a mapping between topographic data and a
    2d visual representation.
    """
    _view_name = Unicode('GeoScale').tag(sync=True)
    _model_name = Unicode('GeoScaleModel').tag(sync=True)


@register_scale('bqplot.Mercator')
class Mercator(GeoScale):

    """A geographical projection scale commonly used for world maps.

    The Mercator projection is a cylindrical map projection which ensures that
    any course of constant bearing is a straight line.

    Attributes
    ----------
    scale_factor: float (default: 190)
        Specifies the scale value for the projection
    center: tuple (default: (0, 60))
        Specifies the longitude and latitude where the map is centered.
    rotate: tuple (default: (0, 0))
        Degree of rotation in each axis.
    rtype: (Number, Number) (class-level attribute)
        This attribute should not be modified. The range type of a geo
        scale is a tuple.
    dtype: type (class-level attribute)
        the associated data type / domain type
    """

    scale_factor = Float(190).tag(sync=True)
    center = Tuple((0, 60)).tag(sync=True)
    rotate = Tuple((0, 0)).tag(sync=True)
    rtype = '(Number, Number)'
    dtype = np.number
    _view_name = Unicode('Mercator').tag(sync=True)
    _model_name = Unicode('MercatorModel').tag(sync=True)


@register_scale('bqplot.Albers')
class Albers(GeoScale):

    """A geographical scale which is an alias for a conic equal area projection.

    The Albers projection is a conic equal area map. It does not preserve scale
    or shape, though it is recommended for chloropleths since it preserves the
    relative areas of geographic features. Default values are US-centric.

    Attributes
    ----------
    scale_factor: float (default: 250)
        Specifies the scale value for the projection
    rotate: tuple (default: (96, 0))
        Degree of rotation in each axis.
    parallels: tuple (default: (29.5, 45.5))
        Sets the two parallels for the conic projection.
    center: tuple (default: (0, 60))
        Specifies the longitude and latitude where the map is centered.
    precision: float (default: 0.1)
        Specifies the threshold for the projections adaptive resampling to the
        specified value in pixels.
    rtype: (Number, Number) (class-level attribute)
        This attribute should not be modified. The range type of a geo
        scale is a tuple.
    dtype: type (class-level attribute)
        the associated data type / domain type
    """

    scale_factor = Float(250).tag(sync=True)
    rotate = Tuple((96, 0)).tag(sync=True)
    center = Tuple((0, 60)).tag(sync=True)
    parallels = Tuple((29.5, 45.5)).tag(sync=True)
    precision = Float(0.1).tag(sync=True)
    rtype = '(Number, Number)'
    dtype = np.number
    _view_name = Unicode('Albers').tag(sync=True)
    _model_name = Unicode('AlbersModel').tag(sync=True)


@register_scale('bqplot.AlbersUSA')
class AlbersUSA(GeoScale):

    """A composite projection of four Albers projections meant specifically for
    the United States.

    Attributes
    ----------
    scale_factor: float (default: 1200)
        Specifies the scale value for the projection
    translate: tuple (default: (600, 490))
    rtype: (Number, Number) (class-level attribute)
        This attribute should not be modified. The range type of a geo
        scale is a tuple.
    dtype: type (class-level attribute)
        the associated data type / domain type
    """

    scale_factor = Float(1200).tag(sync=True)
    translate = Tuple((600, 490)).tag(sync=True)
    rtype = '(Number, Number)'
    dtype = np.number
    _view_name = Unicode('AlbersUSA').tag(sync=True)
    _model_name = Unicode('AlbersUSAModel').tag(sync=True)


@register_scale('bqplot.EquiRectangular')
class EquiRectangular(GeoScale):

    """An elementary projection that uses the identity function.

    The projection is neither equal-area nor conformal.

    Attributes
    ----------
    scale_factor: float (default: 145)
       Specifies the scale value for the projection
    center: tuple (default: (0, 60))
        Specifies the longitude and latitude where the map is centered.
    """

    scale_factor = Float(145.0).tag(sync=True)
    center = Tuple((0, 60)).tag(sync=True)
    rtype = '(Number, Number)'
    dtype = np.number
    _view_name = Unicode('EquiRectangular').tag(sync=True)
    _model_name = Unicode('EquiRectangularModel').tag(sync=True)


@register_scale('bqplot.Orthographic')
class Orthographic(GeoScale):

    """A perspective projection that depicts a hemisphere as it appears from
    outer space.

    The projection is neither equal-area nor conformal.

    Attributes
    ----------
    scale_factor: float (default: 145)
       Specifies the scale value for the projection
    center: tuple (default: (0, 60))
        Specifies the longitude and latitude where the map is centered.
    rotate: tuple (default: (96, 0))
        Degree of rotation in each axis.
    clip_angle: float (default: 90.)
        Specifies the clipping circle radius to the specified angle in degrees.
    precision: float (default: 0.1)
        Specifies the threshold for the projections adaptive resampling to the
        specified value in pixels.
    """

    scale_factor = Float(145.0).tag(sync=True)
    center = Tuple((0, 60)).tag(sync=True)
    rotate = Tuple((0, 0)).tag(sync=True)
    clip_angle = Float(90.0, min=0.0, max=360.0).tag(sync=True)
    precision = Float(0.1).tag(sync=True)
    rtype = '(Number, Number)'
    dtype = np.number
    _view_name = Unicode('Orthographic').tag(sync=True)
    _model_name = Unicode('OrthographicModel').tag(sync=True)


@register_scale('bqplot.Gnomonic')
class Gnomonic(GeoScale):

    """A perspective projection which displays great circles as straight lines.

    The projection is neither equal-area nor conformal.

    Attributes
    ----------
    scale_factor: float (default: 145)
       Specifies the scale value for the projection
    center: tuple (default: (0, 60))
        Specifies the longitude and latitude where the map is centered.
    precision: float (default: 0.1)
        Specifies the threshold for the projections adaptive resampling to the
        specified value in pixels.
    clip_angle: float (default: 89.999)
        Specifies the clipping circle radius to the specified angle in degrees.
    """

    scale_factor = Float(145.0).tag(sync=True)
    center = Tuple((0, 60)).tag(sync=True)
    precision = Float(0.1).tag(sync=True)
    clip_angle = Float(89.999, min=0.0, max=360.0).tag(sync=True)
    rtype = '(Number, Number)'
    dtype = np.number
    _view_name = Unicode('Gnomonic').tag(sync=True)
    _model_name = Unicode('GnomonicModel').tag(sync=True)


@register_scale('bqplot.Stereographic')
class Stereographic(GeoScale):

    """A perspective projection that uses a bijective and smooth map at every
    point except the projection point.

    The projection is not an equal-area projection but it is conformal.

    Attributes
    ----------
    scale_factor: float (default: 250)
        Specifies the scale value for the projection
    rotate: tuple (default: (96, 0))
        Degree of rotation in each axis.
    center: tuple (default: (0, 60))
        Specifies the longitude and latitude where the map is centered.
    precision: float (default: 0.1)
        Specifies the threshold for the projections adaptive resampling to the
        specified value in pixels.
    clip_angle: float (default: 90.)
        Specifies the clipping circle radius to the specified angle in degrees.
    """

    scale_factor = Float(145.0).tag(sync=True)
    center = Tuple((0, 60)).tag(sync=True)
    precision = Float(0.1).tag(sync=True)
    rotate = Tuple((96, 0)).tag(sync=True)
    clip_angle = Float(179.9999, min=0.0, max=360.0).tag(sync=True)
    rtype = '(Number, Number)'
    dtype = np.number
    _view_name = Unicode('Stereographic').tag(sync=True)
    _model_name = Unicode('StereographicModel').tag(sync=True)


@register_scale('bqplot.LinearScale')
class LinearScale(Scale):

    """A linear scale.

    An affine mapping from a numerical domain to a numerical range.

    Attributes
    ----------
    min: float or None (default: None)
        if not None, min is the minimal value of the domain
    max: float or None (default: None)
        if not None, max is the maximal value of the domain
    rtype: string (class-level attribute)
        This attribute should not be modified. The range type of a linear
        scale is numerical.
    dtype: type (class-level attribute)
        the associated data type / domain type
    precedence: int (class-level attribute, default_value=2)
        attribute used to determine which scale takes precedence in cases when
        two or more scales have the same rtype and dtype.
        default_value is 2 because for the same range and domain types,
        LinearScale should take precedence.
    stabilized: bool (default: False)
        if set to False, the domain of the scale is tied to the data range
        if set to True, the domain of the scale is updated only when
        the data range is beyond certain thresholds, given by the attributes
        mid_range and min_range.
    mid_range: float (default: 0.8)
        Proportion of the range that is spanned initially.
        Used only if stabilized is True.
    min_range: float (default: 0.6)
        Minimum proportion of the range that should be spanned by the data.
        If the data span falls beneath that level, the scale is reset.
        min_range must be <= mid_range.
        Used only if stabilized is True.
    """
    rtype = 'Number'
    dtype = np.number
    precedence = 2
    min = Float(None, allow_none=True).tag(sync=True)
    max = Float(None, allow_none=True).tag(sync=True)
    stabilized = Bool(False).tag(sync=True)
    min_range = Float(0.6, min=0.0, max=1.0).tag(sync=True)
    mid_range = Float(0.8, min=0.1, max=1.0).tag(sync=True)

    _view_name = Unicode('LinearScale').tag(sync=True)
    _model_name = Unicode('LinearScaleModel').tag(sync=True)


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
        This attribute should not be modified by the user.
        The range type of a linear scale is numerical.
    dtype: type (class-level attribute)
        the associated data type / domain type
    """
    rtype = 'Number'
    dtype = np.number
    min = Float(None, allow_none=True).tag(sync=True)
    max = Float(None, allow_none=True).tag(sync=True)

    _view_name = Unicode('LogScale').tag(sync=True)
    _model_name = Unicode('LogScaleModel').tag(sync=True)


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
    rtype: string (class-level attribute)
        This attribute should not be modified by the user.
        The range type of a linear scale is numerical.
    dtype: type (class-level attribute)
        the associated data type / domain type
    """
    rtype = 'Number'
    dtype = np.datetime64
    domain_class = Type(Date)
    min = Date(default_value=None, allow_none=True).tag(sync=True)
    max = Date(default_value=None, allow_none=True).tag(sync=True)

    _view_name = Unicode('DateScale').tag(sync=True)
    _model_name = Unicode('DateScaleModel').tag(sync=True)


@register_scale('bqplot.OrdinalScale')
class OrdinalScale(Scale):

    """An ordinal scale.

    A mapping from a discrete set of values to a numerical range.

    Attributes
    ----------
    domain: list (default: [])
        The discrete values mapped by the ordinal scale
    rtype: string (class-level attribute)
        This attribute should not be modified by the user.
        The range type of a linear scale is numerical.
    dtype: type (class-level attribute)
        the associated data type / domain type
    """
    rtype = 'Number'
    dtype = np.str_
    domain = List().tag(sync=True)

    _view_name = Unicode('OrdinalScale').tag(sync=True)
    _model_name = Unicode('OrdinalScaleModel').tag(sync=True)


@register_scale('bqplot.ColorScale')
class ColorScale(Scale):

    """A color scale.

    A mapping from numbers to colors. The relation is affine by part.

    Attributes
    ----------
    scale_type: {'linear'}
        scale type
    colors: list of colors (default: [])
        list of colors
    min: float or None (default: None)
        if not None, min is the minimal value of the domain
    max: float or None (default: None)
        if not None, max is the maximal value of the domain
    mid: float or None (default: None)
        if not None, mid is the value corresponding to the mid color.
    scheme: string (default: 'RdYlGn')
        Colorbrewer color scheme of the color scale.
    extrapolation: {'constant', 'linear'} (default: 'constant')
        How to extrapolate values outside the [min, max] domain.
    rtype: string (class-level attribute)
        The range type of a color scale is 'Color'. This should not be modified.
    dtype: type (class-level attribute)
        the associated data type / domain type
    """
    rtype = 'Color'
    dtype = np.number
    scale_type = Enum(['linear'], default_value='linear').tag(sync=True)
    colors = List(trait=Color(default_value=None, allow_none=True))\
        .tag(sync=True)
    min = Float(None, allow_none=True).tag(sync=True)
    max = Float(None, allow_none=True).tag(sync=True)
    mid = Float(None, allow_none=True).tag(sync=True)
    scheme = Unicode('RdYlGn').tag(sync=True)
    extrapolation = Enum(['constant', 'linear'], default_value='constant').tag(sync=True)

    _view_name = Unicode('ColorScale').tag(sync=True)
    _model_name = Unicode('ColorScaleModel').tag(sync=True)


@register_scale('bqplot.DateColorScale')
class DateColorScale(ColorScale):

    """A date color scale.

    A mapping from dates to a numerical domain.

    Attributes
    ----------
    min: Date or None (default: None)
        if not None, min is the minimal value of the domain
    max: Date or None (default: None)
        if not None, max is the maximal value of the domain
    mid: Date or None (default: None)
        if not None, mid is the value corresponding to the mid color.
    rtype: string (class-level attribute)
        This attribute should not be modified by the user.
        The range type of a color scale is 'Color'.
    dtype: type (class-level attribute)
        the associated data type / domain type
    """
    dtype = np.datetime64
    domain_class = Type(Date)

    min = Date(default_value=None, allow_none=True).tag(sync=True)
    mid = Date(default_value=None, allow_none=True).tag(sync=True)
    max = Date(default_value=None, allow_none=True).tag(sync=True)

    _view_name = Unicode('DateColorScale').tag(sync=True)
    _model_name = Unicode('DateColorScaleModel').tag(sync=True)


@register_scale('bqplot.OrdinalColorScale')
class OrdinalColorScale(ColorScale):

    """An ordinal color scale.

    A mapping from a discrete set of values to colors.

    Attributes
    ----------
    domain: list (default: [])
        The discrete values mapped by the ordinal scales.
    rtype: string (class-level attribute)
        This attribute should not be modified by the user.
        The range type of a color scale is 'color'.
    dtype: type (class-level attribute)
        the associated data type / domain type
    """
    rtype = 'Color'
    dtype = np.str_
    domain = List().tag(sync=True)

    _view_name = Unicode('OrdinalColorScale').tag(sync=True)
    _model_name = Unicode('OrdinalColorScaleModel').tag(sync=True)
