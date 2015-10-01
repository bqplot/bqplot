bqplot
======

What is it?
-----------

bqplot is a plotting system for the Jupyter notebook.

Goals
-----

-   provide a unified framework for 2d visualizations with a pythonic API.
-   provide a sensible API for adding user interations (panning, zooming, selection, etc)
-   pip installable

Two main APIs are provided

- Users can build a custom visualization using our object model, that is inspired by
  the constructs of the Grammar of Graphics (figure, marks, axes, scales), and enrich their
  visualization with our Interaction Layer.
- Or they can use the context-based API similar to Matplotlib's pyplot, which provides
  sensible default choices for most parameters.

Getting Started
---------------

### Dependencies

This package depends on the following packages:

-   `numpy`
-   `IPython` (version >=4.0)

### Installation

1. Installing `bqplot`:

    ```
    $ pip install bqplot
    ```

    or for a development installation,

    ```
    $ git clone git@github.com:bloomberg/bqplot.git
    $ cd bqplot
    $ pip install -e .
    $ bower install
    ```

2. Next, we need to install the JavaScript code.

    - Linux users:

    ```
    $ python -m bqplot.install --symlink --user --force
    ```

    - Windows users:

    ```
    $ python -m bqplot.install --user --force
    ```

3. Note for developers: the `--symlink` argument in Linux allows one to
   modify the JavaScript code in-place. This feature is not available with Windows.


### Loading `bqplot`
    # In an IPython shell
    $ ipython
    In [1]: import bqplot

That's it! You're ready to go!

Examples
--------

1. Using the `bqplot` internal object model


    ```python
    import numpy as np
    from IPython.display import display
    from bqplot import *

    n = 10
    x_data = np.arange(n)
    y_data = np.cumsum(np.random.randn(n)) * 100.0
    y_data_2 = np.cumsum(np.random.randn(n)) * 100.0
    y_data_3 = np.cumsum(np.random.randn(n)) * 100.0

    sc_ord = OrdinalScale()
    sc_y = LinearScale()
    sc_y_2 = LinearScale()

    ord_ax = Axis(scale=sc_ord,
                  label='Test X',
                  tick_format='0.0f',
                  grid_lines='none')

    y_ax = Axis(scale=sc_y,
                label='Test Y',
                tick_format='0.2f',
                grid_lines='solid',
                orientation='vertical')

    y_ax_2 = Axis(label='Test Y 2',
                  scale=sc_y_2,
                  orientation='vertical',
                  side='right',
                  tick_format='0.0f',
                  grid_lines='dashed')

    line_chart = Lines(x=x_data,
                       y=[y_data, y_data_2, y_data_3],
                       scales={
                           'x': sc_ord,
                           'y': sc_y,
                       },
                       stroke_width=3,
                       labels=['Line1', 'Line2', 'Line3'],
                       display_legend=True)

    bar_chart = Bars(x=x_data,
                     y=[y_data, y_data_2, y_data_3],
                     scales={
                         'x': sc_ord,
                         'y': sc_y_2,
                     },
                     opacity=0.5,
                     labels=['Bar1', 'Bar2', 'Bar3'],
                     display_legend=True)

    fig = Figure(axes=[ord_ax, y_ax, y_ax_2],
                 marks=[bar_chart, line_chart],
                 legend_location='top-left')

    display(fig)
    ```

2. Using the `pyplot` API

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

License
-------

This software is licensed under the Apache 2.0 license. See the LICENSE file
for details.

