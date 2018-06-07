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

=========
Interacts
=========

.. currentmodule:: bqplot.interacts

.. autosummary::
   :toctree: _generate/

   BrushIntervalSelector
   BrushSelector
   HandDraw
   IndexSelector
   FastIntervalSelector
   MultiSelector
   OneDSelector
   Interaction
   PanZoom
   Selector
   TwoDSelector
"""

from traitlets import (Bool, Int, Float, Unicode, Dict,
                       Instance, List, Enum)
from traittypes import Array
from ipywidgets import Widget, Color, widget_serialization, register

from .scales import Scale, DateScale
from .traits import Date, array_serialization
from .marks import Lines
from ._version import __frontend_version__


def register_interaction(key=None):
    """Decorator registering an interaction class in the registry.

    If no key is provided, the class name is used as a key. A key is provided
    for each core bqplot interaction type so that the frontend can use this
    key regardless of the kernal language.
    """
    def wrap(interaction):
        name = key if key is not None else interaction.__module__ + \
            interaction.__name__
        interaction.types[name] = interaction
        return interaction
    return wrap


class Interaction(Widget):

    """The base interaction class.

    An interaction is a mouse interaction layer for a figure that requires the
    capture of all mouse events on the plot area. A consequence is that one can
    allow only one interaction at any time on a figure.

    An interaction can be associated with features such as selection or
    manual change of specific mark. Although, they differ from the so called
    'mark interactions' in that they do not rely on knowing whether a specific
    element of the mark are hovered by the mouse.

    Attributes
    ----------
    types: dict (class-level attribute) representing interaction types
        A registry of existing interaction types.
    """
    types = {}

    _view_name = Unicode('Interaction').tag(sync=True)
    _model_name = Unicode('BaseModel').tag(sync=True)

    _view_module = Unicode('bqplot').tag(sync=True)
    _model_module = Unicode('bqplot').tag(sync=True)
    _view_module_version = Unicode(__frontend_version__).tag(sync=True)
    _model_module_version = Unicode(__frontend_version__).tag(sync=True)
    # We cannot display an interaction outside of a figure
    _ipython_display_ = None


@register_interaction('bqplot.HandDraw')
class HandDraw(Interaction):

    """A hand-draw interaction.

    This can be used to edit the 'y' value of an existing line using the mouse.
    The minimum and maximum x values of the line which can be edited may be
    passed as parameters.
    The y-values for any part of the line can be edited by drawing the desired
    path while holding the mouse-down.
    y-values corresponding to x-values smaller than min_x or greater than max_x
    cannot be edited by HandDraw.

    Attributes
    ----------
    lines: an instance Lines mark or None (default: None)
        The instance of Lines which is edited using the hand-draw interaction.
        The 'y' values of the line are changed according to the path of the
        mouse. If the lines has multi dimensional 'y', then the 'line_index'
        attribute is used to selected the 'y' to be edited.
    line_index: nonnegative integer (default: 0)
        For a line with multi-dimensional 'y', this indicates the index of the
        'y' to be edited by the handdraw.
    min_x: float or Date or None (default: None)
        The minimum value of 'x' which should be edited via the handdraw.
    max_x: float or Date or None (default: None)
        The maximum value of 'x' which should be edited via the handdraw.
    """
    lines = Instance(Lines, allow_none=True, default_value=None)\
        .tag(sync=True, **widget_serialization)
    line_index = Int().tag(sync=True)
    # TODO: Handle infinity in a meaningful way (json does not)
    min_x = (Float(None, allow_none=True) | Date(None, allow_none=True))\
        .tag(sync=True)
    max_x = (Float(None, allow_none=True) | Date(None, allow_none=True))\
        .tag(sync=True)

    _view_name = Unicode('HandDraw').tag(sync=True)
    _model_name = Unicode('HandDrawModel').tag(sync=True)


@register_interaction('bqplot.PanZoom')
@register
class PanZoom(Interaction):

    """An interaction to pan and zoom wrt scales.

    Attributes
    ----------
    allow_pan: bool (default: True)
        Toggle the ability to pan.
    allow_zoom: bool (default: True)
        Toggle the ability to zoom.
    scales: Dictionary of lists of Scales (default: {})
        Dictionary with keys such as 'x' and 'y' and values being the scales in
        the corresponding direction (dimensions) which should be panned or
        zoomed.
    """
    allow_pan = Bool(True).tag(sync=True)
    allow_zoom = Bool(True).tag(sync=True)
    scales = Dict(trait=List(trait=Instance(Scale)))\
        .tag(sync=True, **widget_serialization)

    _view_name = Unicode('PanZoom').tag(sync=True)
    _model_name = Unicode('PanZoomModel').tag(sync=True)


def panzoom(marks):
    """Helper function for panning and zooming over a set of marks.

    Creates and returns a panzoom interaction with the 'x' and 'y' dimension
    scales of the specified marks.
    """
    return PanZoom(scales={
            'x': sum([mark._get_dimension_scales('x', preserve_domain=True) for mark in marks], []),
            'y': sum([mark._get_dimension_scales('y', preserve_domain=True) for mark in marks], [])
    })


class Selector(Interaction):

    """Selector interaction. A selector can be used to select a subset of data

    Base class for all the selectors.

    Attributes
    ----------
    marks: list (default: [])
        list of marks for which the `selected` attribute is updated based on
        the data selected by the selector.
    """
    marks = List().tag(sync=True, **widget_serialization)

    _view_name = Unicode('Selector').tag(sync=True)

    def reset(self):
        self.send({"type": "reset"})


class OneDSelector(Selector):

    """One-dimensional selector interaction

    Base class for all selectors which select data in one dimension, i.e.,
    either the x or the y direction. The ``scale`` attribute should
    be provided.

    Attributes
    ----------
    scale: An instance of Scale
        This is the scale which is used for inversion from the pixels to data
        co-ordinates. This scale is used for setting the selected attribute for
        the selector.
    """
    scale = Instance(Scale, allow_none=True, default_value=None)\
        .tag(sync=True, dimension='x', **widget_serialization)
    _model_name = Unicode('OneDSelectorModel').tag(sync=True)


class TwoDSelector(Selector):

    """Two-dimensional selector interaction.

    Base class for all selectors which select data in both the x and y
    dimensions. The attributes 'x_scale' and 'y_scale' should be provided.

    Attributes
    ----------
    x_scale: An instance of Scale
        This is the scale which is used for inversion from the pixels to data
        co-ordinates in the x-direction. This scale is used for setting the
        selected attribute for the selector along with ``y_scale``.
    y_scale: An instance of Scale
        This is the scale which is used for inversion from the pixels to data
        co-ordinates in the y-direction. This scale is used for setting the
        selected attribute for the selector along with ``x_scale``.
    """
    x_scale = Instance(Scale, allow_none=True, default_value=None)\
        .tag(sync=True, dimension='x', **widget_serialization)
    y_scale = Instance(Scale, allow_none=True, default_value=None)\
        .tag(sync=True, dimension='y', **widget_serialization)
    _model_name = Unicode('TwoDSelectorModel').tag(sync=True)


@register_interaction('bqplot.FastIntervalSelector')
class FastIntervalSelector(OneDSelector):

    """Fast interval selector interaction.

    This 1-D selector is used to select an interval on the x-scale
    by just moving the mouse (without clicking or dragging). The
    x-coordinate of the mouse controls the mid point of the interval selected
    while the y-coordinate of the mouse controls the the width of the interval.
    The larger the y-coordinate, the wider the interval selected.

    Interval selector has three modes:
        1. default mode: This is the default mode in which the mouse controls
                the location and width of the interval.
        2. fixed-width mode: In this mode the width of the interval is frozen
                and only the location of the interval is controlled with the
                mouse.
                A single click from the default mode takes you to this mode.
                Another single click takes you back to the default mode.
        3. frozen mode: In this mode the selected interval is frozen and the
                selector does not respond to mouse move.
                A double click from the default mode takes you to this mode.
                Another double click takes you back to the default mode.

    Attributes
    ----------
    selected: numpy.ndarray
        Two-element array containing the start and end of the interval selected
        in terms of the scale of the selector.
    color: Color or None (default: None)
        color of the rectangle representing the interval selector
    size: Float or None (default: None)
        if not None, this is the fixed pixel-width of the interval selector
    """
    selected = Array(None, allow_none=True)\
        .tag(sync=True, **array_serialization)
    color = Color(None, allow_none=True).tag(sync=True)
    size = Float(None, allow_none=True).tag(sync=True)

    _view_name = Unicode('FastIntervalSelector').tag(sync=True)
    _model_name = Unicode('FastIntervalSelectorModel').tag(sync=True)


@register_interaction('bqplot.IndexSelector')
class IndexSelector(OneDSelector):

    """Index selector interaction.

    This 1-D selector interaction uses the mouse x-coordinate to select the
    corresponding point in terms of the selector scale.

    Index Selector has two modes:
        1. default mode: The mouse controls the x-position of the selector.
        2. frozen mode: In this mode, the selector is frozen at a point and
                does not respond to mouse events.

        A single click switches between the two modes.

    Attributes
    ----------
    selected: numpy.ndarray
        A single element array containing the point corresponding the
        x-position of the mouse. This attribute is updated as you move the
        mouse along the x-direction on the figure.
    color: Color or None (default: None)
        Color of the line representing the index selector.
    line_width: nonnegative integer (default: 0)
        Width of the line represetning the index selector.
    """
    selected = Array(None, allow_none=True)\
        .tag(sync=True, **array_serialization)
    line_width = Int(2).tag(sync=True)
    color = Color(None, allow_none=True).tag(sync=True)

    _view_name = Unicode('IndexSelector').tag(sync=True)
    _model_name = Unicode('IndexSelectorModel').tag(sync=True)


@register_interaction('bqplot.BrushIntervalSelector')
class BrushIntervalSelector(OneDSelector):

    """Brush interval selector interaction.

    This 1-D selector interaction enables the user to select an interval using
    the brushing action of the mouse. A mouse-down marks the start of the
    interval. The drag after the mouse down in the x-direction selects the
    extent and a mouse-up signifies the end of the interval.

    Once an interval is drawn, the selector can be moved to a new interval by
    dragging the selector to the new interval.

    A double click at the same point without moving the mouse in the
    x-direction will result in the entire interval being selected.

    Attributes
    ----------
    selected: numpy.ndarray
        Two element array containing the start and end of the interval selected
        in terms of the scale of the selector.
        This attribute changes while the selection is being made with the
        ``BrushIntervalSelector``.
    brushing: bool
        Boolean attribute to indicate if the selector is being dragged.
        It is True when the selector is being moved and False when it is not.
        This attribute can be used to trigger computationally intensive code
        which should be run only on the interval selection being completed as
        opposed to code which should be run whenever selected is changing.
    orientation: {'horizontal', 'vertical'}
        The orientation of the interval, either vertical or horizontal
    color: Color or None (default: None)
        Color of the rectangle representing the brush selector.
    """
    brushing = Bool().tag(sync=True)
    selected = Array(None, allow_none=True)\
        .tag(sync=True, **array_serialization)
    orientation = Enum(['horizontal', 'vertical'],
                       default_value='horizontal').tag(sync=True)
    color = Color(None, allow_none=True).tag(sync=True)

    _view_name = Unicode('BrushIntervalSelector').tag(sync=True)
    _model_name = Unicode('BrushIntervalSelectorModel').tag(sync=True)


@register_interaction('bqplot.BrushSelector')
class BrushSelector(TwoDSelector):

    """Brush interval selector interaction.

    This 2-D selector interaction enables the user to select a rectangular
    region using the brushing action of the mouse. A mouse-down marks the
    starting point of the interval. The drag after the mouse down selects the
    rectangle of interest and a mouse-up signifies the end point of
    the interval.

    Once an interval is drawn, the selector can be moved to a new interval by
    dragging the selector to the new interval.

    A double click at the same point without moving the mouse will result in
    the entire interval being selected.

    Attributes
    ----------
    selected_x: numpy.ndarray
        Two element array containing the start and end of the interval selected
        in terms of the x_scale of the selector.
        This attribute changes while the selection is being made with the
        ``BrushSelector``.
    selected_y: numpy.ndarray
        Two element array containing the start and end of the interval selected
        in terms of the y_scale of the selector.
        This attribute changes while the selection is being made with the
        ``BrushSelector``.
    selected_x: list
        Readonly 2x2 array containing the coordinates 
        [[selected_x[0], selected_y[0]],
         [selected_x[1], selected_y[1]]]
    brushing: bool (default: False)
        boolean attribute to indicate if the selector is being dragged.
        It is True when the selector is being moved and False when it is not.
        This attribute can be used to trigger computationally intensive code
        which should be run only on the interval selection being completed as
        opposed to code which should be run whenever selected is changing.
    color: Color or None (default: None)
        Color of the rectangle representing the brush selector.
    """
    clear = Bool().tag(sync=True)
    brushing = Bool().tag(sync=True)
    selected_x = Array(None, allow_none=True).tag(sync=True, **array_serialization)
    selected_y = Array(None, allow_none=True).tag(sync=True, **array_serialization)
    color = Color(None, allow_none=True).tag(sync=True)

    # This is for backward compatibility
    @property
    def selected(self):
        if self.selected_x is None or len(self.selected_x) == 0:
            return []
        else:
            return [[self.selected_x[0], self.selected_y[0]],
                    [self.selected_x[1], self.selected_y[1]]]

    _view_name = Unicode('BrushSelector').tag(sync=True)
    _model_name = Unicode('BrushSelectorModel').tag(sync=True)


@register_interaction('bqplot.MultiSelector')
class MultiSelector(BrushIntervalSelector):

    """Multi selector interaction.

    This 1-D selector interaction enables the user to select multiple intervals
    using the mouse. A mouse-down marks the start of the interval. The drag
    after the mouse down in the x-direction selects the extent and a mouse-up
    signifies the end of the interval.

    The current selector is highlighted with a green border and the inactive
    selectors are highlighted with a red border.

    The multi selector has three modes:
        1. default mode: In this mode the interaction behaves exactly as the
                brush selector interaction with the current selector.
        2. add mode: In this mode a new selector can be added by clicking at
                a point and dragging over the interval of interest. Once a new
                selector has been added, the multi selector is back in the
                default mode.
                From the default mode, ctrl+click switches to the add mode.
        3. choose mode: In this mode, any of the existing inactive selectors
                can be set as the active selector. When an inactive selector is
                selected by clicking, the multi selector goes back to the
                default mode.
                From the default mode, shift+click switches to the choose mode.

    A double click at the same point without moving the mouse in the
    x-direction will result in the entire interval being selected for the
    current selector.

    Attributes
    ----------
    selected: dict
        A dictionary with keys being the names of the intervals and values
        being the two element arrays containing the start and end of the
        interval selected by that particular selector in terms of the scale of
        the selector.
        This is a read-only attribute.
        This attribute changes while the selection is being made with the
        MultiSelectorinteraction.
    brushing: bool (default: False)
        A boolean attribute to indicate if the selector is being dragged.
        It is True when the selector is being moved and false when it is not.
        This attribute can be used to trigger computationally intensive code
        which should be run only on the interval selection being completed as
        opposed to code which should be run whenever selected is changing.
    names: list
        A list of strings indicating the keys of the different intervals.
        Default values are 'int1', 'int2', 'int3' and so on.
    show_names: bool (default: True)
        Attribute to indicate if the names of the intervals are to be displayed
        along with the interval.
    """
    names = List().tag(sync=True)
    selected = Dict().tag(sync=True)
    _selected = Dict().tag(sync=True)  # TODO: UglyHack. Hidden variable to get
    # around the even more ugly hack to have a trait which converts dates,
    # if present, into strings and send it across. It means writing a trait
    # which does that on top of a dictionary. I don't like that

    # TODO: Not a trait. The value has to be set at declaration time.
    show_names = Bool(True).tag(sync=True)

    def __init__(self, **kwargs):
        self.is_date = isinstance(kwargs.get('scale'), DateScale)
        try:
            self.read_json = kwargs.get('scale').domain_class.from_json
        except AttributeError:
            self.read_json = None
        super(MultiSelector, self).__init__(**kwargs)
        self.on_trait_change(self.hidden_selected_changed, '_selected')

    def hidden_selected_changed(self, name, selected):
        actual_selected = {}
        if(self.read_json is None):
            self.selected = self._selected
        else:
            for key in self._selected:
                actual_selected[key] = [self.read_json(elem)
                                        for elem in self._selected[key]]
            self.selected = actual_selected

    _view_name = Unicode('MultiSelector').tag(sync=True)
    _model_name = Unicode('MultiSelectorModel').tag(sync=True)


@register_interaction('bqplot.LassoSelector')
class LassoSelector(TwoDSelector):

    """Lasso selector interaction.

    This 2-D selector enables the user to select multiple sets of data points
    by drawing lassos on the figure. A mouse-down starts drawing the lasso and
    after the mouse-up the lasso is closed and the `selected` attribute of each
    mark gets updated with the data in the lasso.

    The user can select (de-select) by clicking on lassos and can delete them
    (and their associated data) by pressing the 'Delete' button.

    Attributes
    ----------
    marks: List of marks which are instances of {Lines, Scatter} (default: [])
        List of marks on which lasso selector will be applied.
    color: Color (default: None)
        Color of the lasso.
    """
    color = Color(None, allow_none=True).tag(sync=True)

    _view_name = Unicode('LassoSelector').tag(sync=True)
    _model_name = Unicode('LassoSelectorModel').tag(sync=True)
