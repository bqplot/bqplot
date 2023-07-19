# Migration Guide

## Migrate your code from bqplot 0.12 to 0.13

Starting from 0.13, bqplot has been split into multiple packages:

- [bqscales](https://github.com/bqplot/bqscales): contains all the bqplot scales
- [bqplot-gl](https://github.com/bqplot/bqplot-gl): contains the WebGL-based marks (ScatterGL, LinesGL)
- [bqplot](https://github.com/bqplot/bqplot): the core bqplot package

### bqscales imports

For backward compatibility, **bqplot** depends on **bqscales** and exposes all the scales in its API.
Though this may be removed at some point, so you should update your imports:

=== "0.12"
    ```py hl_lines="1"
    from bqplot as import LinearScale, Axis, Lines, Figure
    import numpy as np

    x = np.linspace(-10, 10, 100)
    y = np.sin(x)

    xs = LinearScale()
    ys = LinearScale()

    xax = Axis(scale=xs, label="X")
    yax = Axis(scale=ys, orientation="vertical", label="Y")

    line = Lines(x=x, y=y, scales={"x": xs, "y": ys})

    fig = Figure(marks=[line], axes=[xax, yax], title="Line Chart")

    fig
    ```

=== "0.13"
    ```py hl_lines="1 2"
    from bqscales import LinearScale
    from bqplot as import Axis, Lines, Figure
    import numpy as np

    x = np.linspace(-10, 10, 100)
    y = np.sin(x)

    xs = LinearScale()
    ys = LinearScale()

    xax = Axis(scale=xs, label="X")
    yax = Axis(scale=ys, orientation="vertical", label="Y")

    line = Lines(x=x, y=y, scales={"x": xs, "y": ys})

    fig = Figure(marks=[line], axes=[xax, yax], title="Line Chart")

    fig
    ```

### bqplot-gl imports

In order to use WebGL-based marks, you will need to install bqplot-gl:

```bash
    pip install bqplot-gl
```

You will then need to update your imports:

=== "0.12"
    ```py hl_lines="1"
    from bqplot import LinearScale, ScatterGL, Axis, Figure

    import numpy as np
    import pandas as pd

    n_points = 150_000

    np.random.seed(0)
    y = np.cumsum(np.random.randn(n_points)) + 100.

    sc_x = LinearScale()
    sc_y = LinearScale()

    scatter = ScatterGL(
        x=np.arange(len(y)), y=y,
        default_size=1,
        scales={'x': sc_x, 'y': sc_y}
    )
    ax_x = Axis(scale=sc_x, label='Index')
    ax_y = Axis(scale=sc_y, orientation='vertical', label='Points')

    fig = Figure(marks=[scatter], axes=[ax_x, ax_y], title='Scatter powered by WebGL')
    fig
    ```

=== "0.13"
    ```py hl_lines="1 2"
    from bqplot import LinearScale, Axis, Figure
    from bqplot_gl import ScatterGL

    import numpy as np
    import pandas as pd

    n_points = 150_000

    np.random.seed(0)
    y = np.cumsum(np.random.randn(n_points)) + 100.

    sc_x = LinearScale()
    sc_y = LinearScale()

    scatter = ScatterGL(
        x=np.arange(len(y)), y=y,
        default_size=1,
        scales={'x': sc_x, 'y': sc_y}
    )
    ax_x = Axis(scale=sc_x, label='Index')
    ax_y = Axis(scale=sc_y, orientation='vertical', label='Points')

    fig = Figure(marks=[scatter], axes=[ax_x, ax_y], title='Scatter powered by WebGL')
    fig
    ```
