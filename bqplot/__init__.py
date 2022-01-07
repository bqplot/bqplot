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
into visual properties (typically a number of pixels, a color, etc.).

.. jupyter-execute::

    from bqplot import *

    x_data = range(10)
    y_data = [i ** 2 for i in x_data]

    x_sc = LinearScale()
    y_sc = LinearScale()

    ax_x = Axis(label="Test X", scale=x_sc, tick_format="0.0f")
    ax_y = Axis(
        label="Test Y", scale=y_sc, orientation="vertical", tick_format="0.2f"
    )

    line = Lines(
        x=x_data, y=y_data,
        scales={"x": x_sc, "y": y_sc}, colors=["red", "yellow"]
    )

    Figure(axes=[ax_x, ax_y], marks=[line])

.. automodule:: bqplot.figure
.. automodule:: bqscales.scales
.. automodule:: bqplot.marks
.. automodule:: bqplot.axes
.. automodule:: bqplot.market_map
.. automodule:: bqplot.interacts
.. automodule:: bqplot.traits
.. automodule:: bqplot.toolbar

.. automodule:: bqplot.pyplot

"""

from .figure import *  # noqa
from .axes import *  # noqa
from .marks import *  # noqa
from .scales import *  # noqa
from .toolbar import *  # noqa
from .default_tooltip import *  # noqa
from ._version import version_info, __version__  # noqa


def _prefix():
    import sys
    from pathlib import Path
    prefix = sys.prefix
    here = Path(__file__).parent
    # for when in dev mode
    if (here.parent / 'share/jupyter/nbextensions/bqplot').parent.exists():
        prefix = here.parent
    return prefix


def _jupyter_labextension_paths():
    return [{
        'src': f'{_prefix()}/share/jupyter/labextensions/bqplot/',
        'dest': 'bqplot',
    }]


def _jupyter_nbextension_paths():
    return [{
        'section': 'notebook',
        'src': f'{_prefix()}/share/jupyter/nbextensions/bqplot/',
        'dest': 'bqplot',
        'require': 'bqplot/extension'
    }]
