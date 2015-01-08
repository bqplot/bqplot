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


Each plot starts with a `Figure` object.  A `Figure` has a number of `Axis` objects (horizontal and vertical) and a number of `Mark` objects.  Each `Axis` and `Mark` has a `Scale` object.  The `Scale` objects transform data into a visual property (typically a location in pixel space, but could be a color, etc.).  An `Axis` draws an axis associated with the scale. ::

    from bqplot import *
    x_data = np.arange(100)
    y_data = np.cumsum(np.random.randn(100))
    y_data_2 = np.cumsum(np.random.randn(100) * 100)
    y_data_3 = np.cumsum(np.random.randn(100))
    y_data_4 = np.cumsum(np.random.randn(100)  * 100)

    x_sc = LinearScale()
    y_sc = LinearScale()

    ax_x = Axis(label='Test X', scale=x_sc, tick_format='0.0f')
    ax_y = Axis(label='Test Y', scale=y_sc, orientation='vertical', tick_format='0.2f', side='right')

    line = Lines(x=x_data,
                 y=y_data_2,
                 scales={'x':x_sc, 'y':y_sc},
                 colors=['hotpink', 'yellow'])

    m_fig = dict(left=100, top=50, bottom=50, right=100)
    intsel.on_trait_change(update_index, name='selected')
    fig = Figure(width=800, height=600, axes=[ax_x, ax_y], marks=[line], margin=m_fig)

.. automodule:: bqplot.figure
.. automodule:: bqplot.scales
.. automodule:: bqplot.marks
.. automodule:: bqplot.axes
.. automodule:: bqplot.market_map
.. automodule:: bqplot.overlays
.. automodule:: bqplot.traits

.. automodule:: bqplot.pyplot




"""

# ignore the IPython future warning that widgets might change
import warnings
warnings.filterwarnings('ignore', module='IPython.html.widgets',
                        category = FutureWarning)

from .figure import *
from .axes import *
from .marks import *
from .scales import *

def install_nbextension(**kwargs):
    """Install the appropriate html and javascript into the IPython nbextension.

    Keyword arguments will be passed on to the IPython install_nbextension function.
    """
    import os.path
    from IPython.html import nbextensions
    #kwargs.setdefault('symlink', True)
    pkgdir = os.path.dirname(__file__)
    nbextensions.install_nbextension([os.path.join(pkgdir, 'nbextension', 'bqplot')], **kwargs)

