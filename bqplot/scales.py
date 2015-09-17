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


class GeoScale(Scale):

    """The base projection scale class for Map marks.

    The GeoScale represents a mapping between topographic data and a
    2d visual representation.
    """
    _view_module = Unicode('nbextensions/bqplot/GeoScale', sync=True)
    _model_name = Unicode('GeoScaleModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/GeoScaleModel', sync=True)


@register_scale('bqplot.Mercator')
class Mercator(GeoScale):

    """A Geo Scale usually used for World Maps.

    The Mercator projection is a cylindrical map projection which ensures that
    any course of constant bearing is a straight line.

    Attributes
    ----------
    scale_factor: float (default: 190)
        Specifies the scale value for the projection
    center: list (default: (0, 60))
        Specifies the longitude and latitude where the map is centered.
    rotate: tuple (default: (0, 0))
        Degree of rotation in each axis.
    rtype: (Number, Number) (class-level attribute)
        This attribute should not be modifed. The range type of a geo
        scale is a tuple.
    dtype: type (class-level attribute)
        the associated data type / domain type
    """

    scale_factor = Float(190., sync=True)
    center = Tuple((0, 60), sync=True)
    rotate = Tuple((0, 0), sync=True)
    rtype = '(Number, Number)'
    dtype = np.number
    _view_name = Unicode('Mercator', sync=True)
    _model_name = Unicode('MercatorModel', sync=True)


@register_scale('bqplot.Albers')
class Albers(GeoScale):

    """A Geo Scale which is an alias for a conic equal area projection.

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
    center: list (default: (0, 60))
        Specifies the longitude and latitude where the map is centered.
    precision: float (default: 0.1)
        Specifies the threshold for the projections adaptive resampling to the
        specified value in pixels.
    rtype: (Number, Number) (class-level attribute)
        This attribute should not be modifed. The range type of a geo
        scale is a tuple.
    dtype: type (class-level attribute)
        the associated data type / domain type
    """

    scale_factor = Float(250., sync=True)
    rotate = Tuple((96, 0), sync=True)
    center = Tuple((0, 60), sync=True)
    parallels = Tuple((29.5, 45.5), sync=True)
    precision = Float(0.1, sync=True)
    rtype = '(Number, Number)'
    dtype = np.number
    _view_name = Unicode('Albers', sync=True)
    _model_name = Unicode('AlbersModel', sync=True)


@register_scale('bqplot.AlbersUSA')
class AlbersUSA(GeoScale):

    """A composite projection of four Albers projections meant specifically for
    the United States.

    Attributes
    ----------
    scale_factor: float (default: 1200)
        Specifies the scale value for the projection
    rtype: (Number, Number) (class-level attribute)
        This attribute should not be modifed. The range type of a geo
        scale is a tuple.
    dtype: type (class-level attribute)
        the associated data type / domain type
    """

    scale_factor = Float(1200., sync=True)
    rtype = '(Number, Number)'
    dtype = np.number
    _view_name = Unicode('AlbersUSA', sync=True)
    _model_name = Unicode('AlbersUSAModel', sync=True)


@register_scale('bqplot.EquiRectangular')
class EquiRectangular(GeoScale):

    """An elementary projection that uses the identity function.

    The projection is neither equal-area nor conformal.

    Attributes
    ----------
    scale_factor: float (default: 145)
       Specifies the scale value for the projection
    center: list (default: (0, 60))
        Specifies the longitude and latitude where the map is centered.
    """

    scale_factor = Float(145., sync=True)
    center = Tuple((0, 60), sync=True)
    rtype = '(Number, Number)'
    dtype = np.number
    _view_name = Unicode('EquiRectangular', sync=True)
    _model_name = Unicode('EquiRectangularModel', sync=True)


@register_scale('bqplot.Orthographic')
class Orthographic(GeoScale):

    """A perspective projection that depicts a hemisphere as it appears from
    outer space.

    The projection is neither equal-area nor conformal.

    Attributes
    ----------
    scale_factor: float (default: 145)
       Specifies the scale value for the projection
    center: list (default: (0, 60))
        Specifies the longitude and latitude where the map is centered.
    rotate: tuple (default: (96, 0))
        Degree of rotation in each axis.
    clip_angle: float (default: 90.)
        Specifies the clipping circle radius to the specified angle in degrees.
    precision: float (default: 0.1)
        Specifies the threshold for the projections adaptive resampling to the
        specified value in pixels.
    """

    scale_factor = Float(145., sync=True)
    center = Tuple((0, 60), sync=True)
    rotate = Tuple((0, 0), sync=True)
    clip_angle = Float(default_value=90., min=0., max=360., sync=True)
    precision = Float(0.1, sync=True)
    rtype = '(Number, Number)'
    dtype = np.number
    _view_name = Unicode('Orthographic', sync=True)
    _model_name = Unicode('OrthographicModel', sync=True)


@register_scale('bqplot.Gnomonic')
class Gnomonic(GeoScale):

    """A perspective projection which displays great circles as straight lines.

    The projection is neither equal-area nor conformal.

    Attributes
    ----------
    scale_factor: float (default: 145)
       Specifies the scale value for the projection
    center: list (default: (0, 60))
        Specifies the longitude and latitude where the map is centered.
    precision: float (default: 0.1)
        Specifies the threshold for the projections adaptive resampling to the
        specified value in pixels.
    clip_angle: float (default: 89.999)
        Specifies the clipping circle radius to the specified angle in degrees.
    """

    scale_factor = Float(145., sync=True)
    center = Tuple((0, 60), sync=True)
    precision = Float(0.1, sync=True)
    clip_angle = Float(default_value=89.999, min=0., max=360., sync=True)
    rtype = '(Number, Number)'
    dtype = np.number
    _view_name = Unicode('Gnomonic', sync=True)
    _model_name = Unicode('GnomonicModel', sync=True)


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
    center: list (default: (0, 60))
        Specifies the longitude and latitude where the map is centered.
    precision: float (default: 0.1)
        Specifies the threshold for the projections adaptive resampling to the
        specified value in pixels.
    clip_angle: float (default: 90.)
        Specifies the clipping circle radius to the specified angle in degrees.
    """

    scale_factor = Float(145., sync=True)
    center = Tuple((0, 60), sync=True)
    precision = Float(0.1, sync=True)
    rotate = Tuple((96, 0), sync=True)
    clip_angle = Float(default_value=179.9999, min=0., max=360., sync=True)
    rtype = '(Number, Number)'
    dtype = np.number
    _view_name = Unicode('Stereographic', sync=True)
    _model_name = Unicode('StereographicModel', sync=True)


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
        if not None, min is the minimal value of the domain
    max: float or None (default: None)
        if not None, max is the maximal value of the domain
    mid: float or None (default: None)
        if not None, mid is the value corresponding to the mid color.
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
    colors = List(trait=Color(default_value=None, allow_none=True), sync=True)
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
        if not None, min is the minimal value of the domain
    max: Date or None (default: None)
        if not None, max is the maximal value of the domain
    mid: Date or None (default: None)
        if not None, mid is the value corresponding to the mid color.
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
