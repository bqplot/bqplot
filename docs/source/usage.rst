.. _usage:

Usage
=====

Examples
---------

Using the pyplot API

.. ipywidgets-display::

    import numpy as np
    from bqplot import pyplot as plt

    plt.figure(1, title='Line Chart')
    np.random.seed(0)
    n = 200
    x = np.linspace(0.0, 10.0, n)
    y = np.cumsum(np.random.randn(n))
    plt.plot(x, y)
    plt.show()

Using the bqplot internal object model

.. ipywidgets-display::

    import numpy as np
    from IPython.display import display
    from bqplot import (
        OrdinalScale, LinearScale, Bars, Lines, Axis, Figure
    )

    size = 20
    np.random.seed(0)

    x_data = np.arange(size)

    x_ord = OrdinalScale()
    y_sc = LinearScale()

    bar = Bars(x=x_data, y=np.random.randn(2, size), scales={'x': x_ord, 'y':
    y_sc}, type='stacked')
    line = Lines(x=x_data, y=np.random.randn(size), scales={'x': x_ord, 'y': y_sc},
                 stroke_width=3, colors=['red'], display_legend=True, labels=['Line chart'])

    ax_x = Axis(scale=x_ord, grid_lines='solid', label='X')
    ax_y = Axis(scale=y_sc, orientation='vertical', tick_format='0.2f',
                grid_lines='solid', label='Y')

    Figure(marks=[bar, line], axes=[ax_x, ax_y], title='API Example',
           legend_location='bottom-right')
