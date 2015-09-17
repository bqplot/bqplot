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
   :toctree: generate/

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

from traitlets import Bool, Int, Float, Unicode, Dict, Instance, List, TraitError
from ipywidgets import Widget, Color, widget_serialization

from .scales import Scale, DateScale
from .traits import Date, NdArray
from .marks import Lines, Scatter


def register_interaction(key=None):
    """Returns a decorator registering an interaction class in the interaction
    type registry. If no key is provided, the class name is used as a key. A
    key is provided for each core bqplot interaction type so that the frontend
    can use this key regardless of the kernal language."""
    def wrap(interaction):
        l = key if key is not None else interaction.__module__ + interaction.__name__
        interaction.types[l] = interaction
        return interaction
    return wrap


class Interaction(Widget):

    """The base interaction class

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

    _view_name = Unicode('Interaction', sync=True)
    _view_module = Unicode('nbextensions/bqplot/Interaction', sync=True)
    _model_name = Unicode('BaseModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/BaseModel', sync=True)
    _ipython_display_ = None  # We cannot display an interaction outside of a
                              # figure


@register_interaction('bqplot.HandDraw')
class HandDraw(Interaction):

    """A Hand Draw interaction.

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
    lines = Instance(Lines, sync=True, **widget_serialization)
    line_index = Int(0, sync=True)
    # TODO: Handle infinity in a meaningful way (json does not)
    # TODO: Once the new Union is merged in IPython, the sync on the whole
    # trait can be removed
    min_x = (Float(allow_none=True, default_value=None, sync=True) |
             Date(allow_none=True, default_value=None, sync=True))
    max_x = (Float(allow_none=True, default_value=None, sync=True) |
             Date(default_value=None, allow_none=True, sync=True))

    _view_name = Unicode('HandDraw', sync=True)
    _view_module = Unicode('nbextensions/bqplot/HandDraw', sync=True)
    _model_name = Unicode('HandDrawModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/HandDrawModel', sync=True)


@register_interaction('bqplot.PanZoom')
class PanZoom(Interaction):

    """An interaction to pan and zoom a figure w.r.t. certain scales.

        Attributes
        ----------
        allow_pan: bool (default: True)
            attribute to set the ability to pan the figure or not
        allow_zoom: bool (default: True)
            attribute to set the ability to zoom the figure or not
        scales: Dictionary of lists of Scales (default: {})
            Dictionary with keys as 'x' and 'y' and values being the scales in
            the corresponding direction which should be panned or zoomed.
    """
    allow_pan = Bool(True, sync=True)
    allow_zoom = Bool(True, sync=True)
    scales = Dict(sync=True, **widget_serialization)

    def __init__(self, **kwargs):
        super(PanZoom, self).__init__(**kwargs)
        self.snapshot()
        self.on_trait_change(self.snapshot, name='scales')

    def snapshot(self):
        self.scales_states = {k: [s.get_state() for s in self.scales[k]]
                              for k in self.scales}

    def reset(self):
        for k in self.scales:
            for i in xrange(len(self.scales[k])):
                self.scales[k][i].set_state(self.scales_states[k][i])
                self.scales[k][i].send_state()

    _view_name = Unicode('PanZoom', sync=True)
    _view_module = Unicode('nbextensions/bqplot/PanZoom', sync=True)
    _model_name = Unicode('PanZoomModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/PanZoomModel', sync=True)


def panzoom(marks):
    """helper function for panning and zooming over a set of marks
        Creates and returns a panzoom interaction with the 'x' and 'y' scales
        containing the scales of the marks passed.
    """
    return PanZoom(scales={
        'x': [mark.scales.get('x') for mark in marks if 'x' in mark.scales],
        'y': [mark.scales.get('y') for mark in marks if 'y' in mark.scales],
    })


class Selector(Interaction):

    """Selector interaction. A selector can be used to select a subset of data

    Base class for all the selectors

    Attributes
    ----------
    marks: list (default: [])
        list of marks for which the `selected` attribute is updated based on
        the data selected by the selector.
    """
    marks = List(sync=True, **widget_serialization)

    _view_name = Unicode('Selector', sync=True)
    _view_module = Unicode('nbextensions/bqplot/Selector', sync=True)

    def reset(self):
        self.send({"type": "reset"})


class OneDSelector(Selector):

    """OneDSelector interaction

    Base class for all selectors which select data in one dimension, i.e.,
    either the x or the y direction. The 'scale' attribute should be provided.

    Attributes
    ----------
    scale: An instance of Scale
        This is the scale which is used for inversion from the pixels to data
        co-ordinates. This scale is used for setting the selected attribute for
        the selector.
    """
    scale = Instance(Scale, allow_none=True, sync=True, dimension='x', **widget_serialization)
    _model_name = Unicode('OneDSelectorModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/OneDSelectorModel', sync=True)


class TwoDSelector(Selector):

    """TwoDSelector interaction

    Base class for all selectors which select data in both the x and y
    dimensions. The attributes 'x_scale' and 'y_scale' should be provided.

    Attributes
    ----------
    x_scale: An instance of Scale
        This is the scale which is used for inversion from the pixels to data
        co-ordinates in the x-direction. This scale is used for setting the
        selected attribute for the selector along with y_scale.
    y_scale: An instance of Scale
        This is the scale which is used for inversion from the pixels to data
        co-ordinates in the y-direction. This scale is used for setting the
        selected attribute for the selector along with x_scale.
    """
    x_scale = Instance(Scale, allow_none=True, sync=True, dimension='x',
                       **widget_serialization)
    y_scale = Instance(Scale, allow_none=True, sync=True, dimension='y',
                       **widget_serialization)

    _model_name = Unicode('TwoDSelectorModel', sync=True)
    _model_module = Unicode('nbextensions/bqplot/TwoDSelectorModel', sync=True)


@register_interaction('bqplot.FastIntervalSelector')
class FastIntervalSelector(OneDSelector):

    """Fast Interval Selector interaction.

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
        in terms of the scale of the selector. This is a read-only attribute.
    color: Color or None (default: None)
        color of the rectangle representing the interval selector
    size: Float or None (default: None)
        if not None, this is the fixed pixel-width of the interval selector
    """
    selected = NdArray(sync=True)
    color = Color(None, sync=True, allow_none=True)
    size = Float(None, allow_none=True, sync=True)

    _view_name = Unicode('FastIntervalSelector', sync=True)
    _view_module = Unicode('nbextensions/bqplot/FastIntervalSelector', sync=True)


@register_interaction('bqplot.IndexSelector')
class IndexSelector(OneDSelector):

    """Index selector interaction.

    This 1-D selector interaction uses the mouse x-cooridnate to select the
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
        color of the line representing the index selector
    line_width: nonnegative integer (default: 0)
        width of the line represetning the index selector
    """
    selected = NdArray(sync=True)
    line_width = Int(2, sync=True)
    color = Color(None, sync=True, allow_none=True)

    _view_name = Unicode('IndexSelector', sync=True)
    _view_module = Unicode('nbextensions/bqplot/IndexSelector', sync=True)


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
        in terms of the scale of the selector. This is a read-only attribute.
        This attribute changes while the selection is being made with the
        BrushIntervalSelectorinteraction
    brushing: bool
        boolean attribute to indicate if the selector is being dragged right
        now.
        It is True when the selector is being moved and false when it is not.
        This attribute can be used to trigger computationally intensive code
        which should be run only on the interval selection being completed as
        opposed to code which should be run whenever selected is changing.
    color: Color or None (default: None)
        color of the rectangle representing the brush selector
    """
    brushing = Bool(False, sync=True)
    selected = NdArray(sync=True)
    color = Color(None, sync=True, allow_none=True)

    _view_name = Unicode('BrushIntervalSelector', sync=True)
    _view_module = Unicode('nbextensions/bqplot/BrushSelector', sync=True)


@register_interaction('bqplot.BrushSelector')
class BrushSelector(TwoDSelector):

    """Brush interval selector interaction.

    This 2-D selector interaction enables the user to select a rectangular
    region using the brushing action of the mouse. A mouse-down marks the
    starting point of the interval. The drag after the mouse down selects the
    rectangle of interest and a mouse-up signifies the end point of the interval.

    Once an interval is drawn, the selector can be moved to a new interval by
    dragging the selector to the new interval.

    A double click at the same point without moving the mouse will result in
    the entire interval being selected.

    Attributes
    ----------
    selected: numpy.ndarray
        Two element array containing the start and end of the interval selected
        in terms of the scales of the selector. This is a read-only attribute.
        This attribute changes while the selection is being made with the
        BrushIntervalSelectorinteraction
    brushing: bool (default: False)
        boolean attribute to indicate if the selector is being dragged right
        now.
        It is True when the selector is being moved and false when it is not.
        This attribute can be used to trigger computationally intensive code
        which should be run only on the interval selection being completed as
        opposed to code which should be run whenever selected is changing.
    color: Color or None (default: None)
        color of the rectangle representing the brush selector
    """
    clear = Bool(False, sync=True)
    brushing = Bool(False, sync=True)
    selected = List(sync=True)
    color = Color(None, sync=True, allow_none=True)

    def __init__(self, **kwargs):
        # Stores information regarding the scales. The date scaled values have
        # to be converted into dateobjects because they are transmitted as
        # strings.
        try:
            self.read_json_x = kwargs.get('x_scale').domain_class.from_json
        except AttributeError:
            self.read_json_x = None
        try:
            self.read_json_y = kwargs.get('y_scale').domain_class.from_json
        except AttributeError:
            self.read_json_y = None
        super(BrushSelector, self).__init__(**kwargs)

    def _selected_changed(self, name, selected):
        if(len(self.selected) == 2):
            if(self.read_json_x is not None):
                self.selected[0][0] = self.read_json_x(self.selected[0][0])
                self.selected[1][0] = self.read_json_x(self.selected[1][0])
            if(self.read_json_y is not None):
                self.selected[0][1] = self.read_json_y(self.selected[0][1])
                self.selected[1][1] = self.read_json_y(self.selected[1][1])

    _view_name = Unicode('BrushSelector', sync=True)
    _view_module = Unicode('nbextensions/bqplot/BrushSelector', sync=True)


@register_interaction('bqplot.MultiSelector')
class MultiSelector(OneDSelector):

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
        A boolean attribute to indicate if the selector is being dragged right
        now.
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
    names = List(sync=True)
    brushing = Bool(False, sync=True)
    selected = Dict(sync=True)
    _selected = Dict(sync=True)  # TODO: UglyHack. Hidden variable to get
    # around the even more ugly hack to have a trait which converts dates,
    # if present, into strings and send it across. It means writing a trait
    # which does that on top of a dictionary. I don't like that
    show_names = Bool(True, sync=True)  # TODO: Not a trait. The value has to
                                        # be set at declaration time.

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

    _view_name = Unicode('MultiSelector', sync=True)
    _view_module = Unicode('nbextensions/bqplot/BrushSelector', sync=True)


@register_interaction('bqplot.LassoSelector')
class LassoSelector(TwoDSelector):

    """Lasso selector interaction.

    This 2-D selector enables the user to select multiple sets of data points
    by drawing lassos on the figure. Lasso Selector is currently supported only
    for Lines and Scatter marks. A mouse-down starts drawing the lasso and
    after the mouse-up the lasso is closed and the `selected` attribute of each
    mark gets updated with the data in the lasso. A lasso which doesn't
    encompass any mark data will be automatically deleted

    The user can select (de-select) by clicking on lassos and can delete them
    (and their associated data) by pressing the 'Delete' button

    Attributes
    ----------
    marks: List of marks which are instances of {Lines, Scatter} (default: [])
        List of marks on which lasso selector will be applied.
    color: Color (default: None)
        Color of the lasso

    """
    marks = List(Instance(Lines) | Instance(Scatter), sync=True,
                 **widget_serialization)
    color = Color(None, sync=True, allow_none=True)

    def __init__(self, marks=None, **kwargs):
        _marks = []
        if marks is not None:
            for mark in marks:
                try:
                    mark_trait = self.class_traits()['marks']
                    _marks.append(mark_trait.validate_elements(self, [mark])[0])
                except TraitError:
                    pass

        kwargs['marks'] = _marks
        super(LassoSelector, self).__init__(**kwargs)

    _view_name = Unicode('LassoSelector', sync=True)
    _view_module = Unicode('nbextensions/bqplot/LassoSelector', sync=True)
