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

==============
BQPlot Package
==============

.. currentmodule:: bqplot


Each plot starts with a `Figure` object. A `Figure` has a number of `Axis`
objects (representing scales) and a number of `Mark` objects. `Mark`
objects are a visual representation of the data. Scales transform data
into visual properties (typically a number of pixels, a color, etc.).  ::

    from bqplot import *
    from IPython.display import display

    x_data = range(10)
    y_data = [i ** 2 for i in x_data]

    x_sc = LinearScale()
    y_sc = LinearScale()

    ax_x = Axis(label='Test X', scale=x_sc, tick_format='0.0f')
    ax_y = Axis(label='Test Y', scale=y_sc,
                orientation='vertical', tick_format='0.2f')

    line = Lines(x=x_data,
                 y=y_data,
                 scales={'x': x_sc, 'y': y_sc},
                 colors=['red', 'yellow'])

    fig = Figure(axes=[ax_x, ax_y], marks=[line])

    display(fig)

.. automodule:: bqplot.figure
.. automodule:: bqplot.scales
.. automodule:: bqplot.marks
.. automodule:: bqplot.axes
.. automodule:: bqplot.market_map
.. automodule:: bqplot.interacts
.. automodule:: bqplot.traits
.. automodule:: bqplot.toolbar

.. automodule:: bqplot.pyplot

"""

from .figure import *
from .axes import *
from .marks import *
from .scales import *
from .toolbar import *
from .default_tooltip import *
from ._version import version_info, __version__


def _jupyter_nbextension_paths():
    return [{
        'section': 'notebook',
        'src': 'static',
        'dest': 'bqplot',
        'require': 'bqplot/extension'
    }]
