bqplot
======

bqplot is a plotting system for the Jupyter notebook.

Note
----

This README concerns bqplot version 0.6.0 beta 2.

Goals
-----

-   provide a unified framework for 2d visualizations with a pythonic API.
-   provide a sensible API for adding user interactions (panning, zooming, selection, etc)

Two APIs are provided

- Users can build custom visualizations using the internal object model, which
  is inspired by the constructs of the Grammar of Graphics (figure, marks, axes,
  scales), and enrich their visualization with our Interaction Layer.
- Or they can use the context-based API similar to Matplotlib's pyplot, which
  provides sensible default choices for most parameters.

Getting Started
---------------

### Dependencies

This package depends on the following packages:

-   `numpy`
-   `ipywidgets` (version >=5.0.0)

### Installation

```
$ pip install --pre bqplot
$ jupyter nbextension enable --py bqplot
```

or for a development installation (requires npm),

```
$ git clone https://github.com/bloomberg/bqplot.git
$ cd bqplot
$ pip install -e .
$ jupyter nbextension install --py --symlink --user bqplot
$ jupyter nbextension enable --py --user bqplot
```

Note for developers: the `--symlink` argument on Linux or OS X allows one to
modify the JavaScript code in-place. This feature is not available
with Windows.


### Loading `bqplot`

```python
# In a Jupyter notebook
import bqplot
```

That's it! You're ready to go!

Examples
--------

### Using the `pyplot` API

```python
from bqplot import pyplot as plt
import numpy as np

plt.figure(1)
np.random.seed(0)
n = 200
x = np.linspace(0.0, 10.0, n)
y = np.cumsum(np.random.randn(n))
plt.plot(x,y, axes_options={'y': {'grid_lines': 'dashed'}})
plt.show()
```

![Pyplot Screenshot](/pyplot-screenshot.png)

### Using the `bqplot` internal object model


```python
import numpy as np
from IPython.display import display
import bqplot as bq

size = 20
np.random.seed(0)

x_data = np.arange(size)

x_ord = bq.OrdinalScale()
y_sc = bq.LinearScale()

bar = bq.Bars(x=x_data, y=np.random.randn(2, size), scales={'x': x_ord, 'y': y_sc},
              type='stacked')
line = bq.Lines(x=x_data, y=np.random.randn(size), scales={'x': x_ord, 'y': y_sc},
                stroke_width=3, colors=['red'], display_legend=True, labels=['Line chart'])

ax_x = bq.Axis(scale=x_ord)
ax_y = bq.Axis(scale=y_sc, orientation='vertical', tick_format='0.2f', grid_lines='solid')

fig = bq.Figure(marks=[bar, line], axes=[ax_x, ax_y])
display(fig)
```

![Bqplot Screenshot](/bqplot-screenshot.png)


Help / Documentation
--------------------

- API reference documentation: [![Read the documentation of the stable version](https://readthedocs.org/projects/pip/badge/?version=stable)](http://bqplot.readthedocs.org/en/stable/) [![Read the documentation of the development version](https://readthedocs.org/projects/pip/badge/?version=latest)](http://bqplot.readthedocs.org/en/latest/)

License
-------

This software is licensed under the Apache 2.0 license. See the [LICENSE](LICENSE) file
for details.

