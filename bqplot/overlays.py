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

========
Overlays
========

.. currentmodule:: bqplot.overlays

.. autosummary::
   :toctree: generate/

   BrushIntervalSelectorOverlay
   BrushSelectorOverlay
   HandDraw
   IndexSelectorOverlay
   IntervalSelectorOverlay
   MultiSelectorOverlay
   OneDSelectorOverlay
   Overlay
   PanZoom
   SelectorOverlay
   TwoDSelectorOverlay
   panzoom
"""

import sys
from IPython.utils.traitlets import Bool, Int, Float, Unicode, Dict, Any, Instance, List
from IPython.html.widgets import Widget

from .scales import Scale, DateScale
from .traits import NdArray


def register_overlay(key=None):
    """Returns a decorator registering an overlay class in the overlay type registry.
    If no key is provided, the class name is used as a key. A key is
    provided for each core bqplot overlay type so that the frontend can use
    this key regardless of the kernal language."""
    def wrap(overlay):
        l = key if key is not None else overlay.__module__ + overlay.__name__
        Overlay.overlay_types[l] = overlay
        return overlay
    return wrap


class Overlay(Widget):
    overlay_types = {}
    _view_name = Unicode('bqplot.Overlay', sync=True)
    _ipython_display_ = None  # We cannot display an overlay outside of a figure


@register_overlay('bqplot.HandDraw')
class HandDraw(Overlay):
    _view_name = Unicode('bqplot.HandDraw', sync=True)
    lines = Any(None, sync=True)
    line_index = Int(0, sync=True)
    # TODO: Handle infinity in a meaningful way (json does not)
    min_x = Float(-sys.float_info.max, sync=True)
    max_x = Float(sys.float_info.max, sync=True)


@register_overlay('bqplot.PanZoom')
class PanZoom(Overlay):
    _view_name = Unicode('bqplot.PanZoom', sync=True)
    allow_pan = Bool(True, sync=True)
    allow_zoom = Bool(True, sync=True)
    scales = Dict({}, allow_none=False, sync=True)

    def __init__(self, **kwargs):
        super(PanZoom, self).__init__(**kwargs)
        self.snapshot()
        self.on_trait_change(self.snapshot, name='scales')

    def snapshot(self):
        self.scales_states = {k: [s.get_state() for s in self.scales[k]] for k in self.scales}

    def reset(self):
        for k in self.scales:
            for i in xrange(len(self.scales[k])):
                self.scales[k][i].set_state(self.scales_states[k][i])
                self.scales[k][i].send_state()


def panzoom(marks):
    """helper function for panning and zooming over a set of marks"""
    return PanZoom(scales={
        'x': [mark.scales.get('x') for mark in marks if 'x' in mark.scales],
        'y': [mark.scales.get('y') for mark in marks if 'y' in mark.scales],
    })


class SelectorOverlay(Overlay):
    _view_name = Unicode('bqplot.SelectorOverlay', sync=True)
    _model_name = Unicode('bqplot.BaseModel', sync=True)
    marks = List([], sync=True)


class OneDSelectorOverlay(SelectorOverlay):
    scale = Instance(Scale, sync=True)


class TwoDSelectorOverlay(SelectorOverlay):
    x_scale = Instance(Scale, sync=True)
    y_scale = Instance(Scale, sync=True)


@register_overlay('bqplot.IntervalSelectorOverlay')
class IntervalSelectorOverlay(OneDSelectorOverlay):
    _view_name = Unicode('bqplot.IntervalSelectorOverlay', sync=True)
    selected = NdArray(sync=True)
    idx_selected = List([], sync=True)


@register_overlay('bqplot.IndexSelectorOverlay')
class IndexSelectorOverlay(OneDSelectorOverlay):
    _view_name = Unicode('bqplot.IndexSelectorOverlay', sync=True)
    selected = NdArray(sync=True)
    idx_selected = List([], sync=True)
    color = Unicode("red", sync=True)
    line_width = Int(2, sync=True)


@register_overlay('bqplot.BrushIntervalSelectorOverlay')
class BrushIntervalSelectorOverlay(OneDSelectorOverlay):
    _view_name = Unicode("bqplot.BrushIntervalSelectorOverlay", sync=True)
    brushing = Bool(False, sync=True)
    selected = NdArray(sync=True)
    idx_selected = List([], sync=True)


@register_overlay('bqplot.BrushSelectorOverlay')
class BrushSelectorOverlay(TwoDSelectorOverlay):
    _view_name = Unicode("bqplot.BrushSelectorOverlay", sync=True)
    clear = Bool(False, sync=True)
    brushing = Bool(False, sync=True)
    idx_selected = List([], sync=True)
    selected = List([], sync=True)

    def __init__(self, **kwargs):
        ## Stores information regarding the scales. The date scaled values have to be converted into
        ## dateobjects because they are transmitted as strings.
        try:
            self.read_json_x = kwargs.get('x_scale').domain_class.from_json
        except AttributeError:
            self.read_json_x = None
        try:
            self.read_json_y = kwargs.get('y_scale').domain_class.from_json
        except AttributeError:
            self.read_json_y = None
        super(BrushSelectorOverlay, self).__init__(**kwargs)

    def _selected_changed(self, name, selected):
        if(len(self.selected) == 2):
            if(self.read_json_x is not None):
                self.selected[0][0] = self.read_json_x(self.selected[0][0])
                self.selected[1][0] = self.read_json_x(self.selected[1][0])
            if(self.read_json_y is not None):
                self.selected[0][1] = self.read_json_y(self.selected[0][1])
                self.selected[1][1] = self.read_json_y(self.selected[1][1])


@register_overlay('bqplot.MultiSelectorOverlay')
class MultiSelectorOverlay(OneDSelectorOverlay):
    _view_name = Unicode("bqplot.MultiSelectorOverlay", sync=True)
    names = List([], sync=True)
    brushing = Bool(False, sync=True)
    selected = Dict({}, sync=True)
    _selected = Dict({}, sync=True)  # TODO: UglyHack. Hidden variable to get
    # around the even more ugly hack to have a trait which converts dates,
    # if present, into strings and send it across. It means writing a trait
    # which does that on top of a dictionary. I don't like that
    idx_selected = Dict({}, sync=True)
    show_names = Bool(True, sync=True)  # TODO: Not a trait. The value has to be set at declaration time.

    def __init__(self, **kwargs):
        self.is_date = isinstance(kwargs.get('scale'), DateScale)
        try:
            self.read_json = kwargs.get('scale').domain_class.from_json
        except AttributeError:
            self.read_json = None
        super(MultiSelectorOverlay, self).__init__(**kwargs)
        self.on_trait_change(self.hidden_selected_changed, '_selected')

    def hidden_selected_changed(self, name, selected):
        actual_selected = {}
        if(self.read_json is None):
            self.selected = self._selected
        else:
            for key in self._selected:
                actual_selected[key] = [self.read_json(elem) for elem in self._selected[key]]
            self.selected = actual_selected
