The `PanZoom` interaction enables users to pan and zoom a chart by interacting with the figure canvas. It operates by modifying the `min` and `max` of the underlying scales, so all marks sharing those scales update simultaneously.

* **Pan**: click and drag on the figure to shift the visible data range
* **Zoom**: scroll the mouse wheel to zoom in and out
* Both pan and zoom can be independently enabled/disabled

### Attributes

#### [PanZoom API](../../api/interactions.md#bqplot.interacts.PanZoom)

### pyplot
The easiest way to enable pan and zoom is via [`plt.show()`](../../api/pyplot.md#bqplot.pyplot.show), which renders the figure together with the default [Toolbar](../../api/toolbar.md) — the toolbar includes a pan/zoom toggle button.

```py hl_lines="8"
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure(title="Pan & Zoom")
x = np.linspace(0, 10, 100)
line = plt.plot(x, np.sin(x))

plt.show()  # renders figure + toolbar with pan/zoom button
```

!!! tip
    Use `plt.show()` instead of just displaying `fig` to get the toolbar with pan/zoom support.

### Attaching PanZoom Programmatically

You can also attach a `PanZoom` interaction directly to a figure. This is useful when you need fine-grained control, such as restricting zoom to only one axis.

#### Zoom Both Axes
```py hl_lines="10 11 12 13"
import bqplot as bq
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure(title="PanZoom - Both Axes")
x = np.linspace(0, 10, 100)
line = plt.plot(x, np.sin(x))

# attach a panzoom that controls both x and y scales
xs = line.scales["x"]
ys = line.scales["y"]
panzoom = bq.PanZoom(scales={"x": [xs], "y": [ys]})
fig.interaction = panzoom
fig
```

#### Zoom X Axis Only
```py hl_lines="5"
xs = line.scales["x"]
panzoom = bq.PanZoom(
    scales={"x": [xs]},  # only pass the x scale
    allow_pan=True,
    allow_zoom=True
)
fig.interaction = panzoom
```

#### Zoom Y Axis Only
```py
ys = line.scales["y"]
panzoom = bq.PanZoom(scales={"y": [ys]})
fig.interaction = panzoom
```

#### Disable Pan (Zoom Only)
```py
panzoom = bq.PanZoom(scales={"x": [xs], "y": [ys]}, allow_pan=False)
fig.interaction = panzoom
```

#### Disable Zoom (Pan Only)
```py
panzoom = bq.PanZoom(scales={"x": [xs], "y": [ys]}, allow_zoom=False)
fig.interaction = panzoom
```

### Using the `panzoom` Helper Function

bqplot provides a convenience helper `bq.interacts.panzoom(marks)` that automatically extracts the `x` and `y` scales from a list of marks:

```py hl_lines="8"
import bqplot as bq
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure()
line = plt.plot(np.linspace(0, 10, 100), np.sin(np.linspace(0, 10, 100)))

fig.interaction = bq.interacts.panzoom([line])
fig
```

### Removing the Interaction

To disable pan/zoom set `fig.interaction` to `None`:

```py
fig.interaction = None
```

### Example Notebooks
For detailed examples of the pan/zoom interaction, refer to the following example notebooks

1. [Interactions](https://github.com/bqplot/bqplot/blob/master/examples/Interactions/Interactions.ipynb)
