Selectors let users select subsets of data directly on the chart by interacting with the figure canvas. When a selection is made, the `selected` attribute of the linked marks is automatically updated with the __indices__ of the selected data points.

bqplot provides the following selector types:

| Selector | Dimensions | How it works |
|---|---|---|
| `BrushIntervalSelector` | 1D (x or y) | Click and drag to draw a rectangular interval |
| `FastIntervalSelector` | 1D (x) | Move the mouse to set interval; y-position controls width |
| `IndexSelector` | 1D (x) | A vertical line that follows the mouse x-position |
| `BrushSelector` | 2D (x and y) | Click and drag to draw a 2D rectangular region |
| `MultiSelector` | 1D (x) | Draw multiple independent intervals |
| `LassoSelector` | 2D (x and y) | Freehand lasso to select arbitrary regions |

All selectors are attached to a figure via `fig.interaction = selector`.

### BrushIntervalSelector

The most commonly used selector. The user clicks and drags horizontally (or vertically) to define an interval. The `selected` attribute on linked marks updates with the indices of data points inside the interval.

```py hl_lines="9 10"
import bqplot as bq
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure()
x = np.linspace(0, 10, 100)
line = plt.plot(x, np.sin(x), unselected_style={"opacity": 0.3})

xs = line.scales["x"]
selector = bq.BrushIntervalSelector(scale=xs, marks=[line])
fig.interaction = selector

def on_select(*args):
    if line.selected is not None:
        selected_x = x[line.selected]
        print("Selected x range:", selected_x.min(), "to", selected_x.max())

line.observe(on_select, names=["selected"])
fig
```

!!! tip
    Use the `brushing` attribute on the selector to distinguish between __while dragging__ (True) and __finished__ (False). This lets you defer expensive computations until the selection is complete.

```py
def on_brush_change(*args):
    if not selector.brushing:  # only run when drag is finished
        # do expensive computation here
        pass

selector.observe(on_brush_change, names=["brushing"])
```

#### Vertical Brush
```py
ys = line.scales["y"]
selector = bq.BrushIntervalSelector(scale=ys, marks=[line],
                                     orientation="vertical")
fig.interaction = selector
```

### FastIntervalSelector

The interval follows the mouse without clicking. Moving the mouse left/right shifts the interval center; moving up/down widens or narrows it.

```py hl_lines="7"
import bqplot as bq
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure()
scatter = plt.scatter(*np.random.rand(2, 50), unselected_style={"opacity": 0.3})

xs = scatter.scales["x"]
selector = bq.FastIntervalSelector(scale=xs, marks=[scatter])
fig.interaction = selector
fig
```

Modes:

* **Default**: mouse controls both position and width
* **Fixed-width** (single click): width is frozen, only position changes
* **Frozen** (double click): selector does not respond to mouse

### IndexSelector

A vertical line that tracks the mouse x-position. Useful for cross-referencing values across multiple marks at the same x:

```py hl_lines="9 10"
import bqplot as bq
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure()
x = np.linspace(0, 10, 100)
line1 = plt.plot(x, np.sin(x))
line2 = plt.plot(x, np.cos(x))

xs = line1.scales["x"]
selector = bq.IndexSelector(scale=xs, marks=[line1, line2])
fig.interaction = selector

def on_index_change(*args):
    if selector.selected is not None:
        print("Mouse x:", selector.selected[0])

selector.observe(on_index_change, names=["selected"])
fig
```

Single click toggles between tracking mode and frozen mode.

### BrushSelector

A 2D rectangular brush — the user drags to select a rectangular region in both x and y:

```py hl_lines="9 10 11"
import bqplot as bq
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure()
x, y = np.random.rand(2, 100)
scatter = plt.scatter(x, y, unselected_style={"opacity": 0.2})

xs = scatter.scales["x"]
ys = scatter.scales["y"]
selector = bq.BrushSelector(x_scale=xs, y_scale=ys, marks=[scatter])
fig.interaction = selector

def on_select(*args):
    if scatter.selected is not None:
        print("Selected indices:", scatter.selected)

scatter.observe(on_select, names=["selected"])
fig
```

`selected_x` and `selected_y` on the selector hold the `[min, max]` for each dimension.

### MultiSelector

Draw multiple independent brush intervals on the same chart. Use `ctrl+click` to add a new interval, `shift+click` to switch between existing ones.

```py hl_lines="7 8 9"
import bqplot as bq
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure()
line = plt.plot(np.linspace(0, 10, 100), np.sin(np.linspace(0, 10, 100)),
                unselected_style={"opacity": 0.3})

xs = line.scales["x"]
selector = bq.MultiSelector(scale=xs, marks=[line])
fig.interaction = selector

def on_select(*args):
    # selector.selected is a dict {interval_name: [start, end]}
    print("Selections:", selector.selected)

selector.observe(on_select, names=["selected"])
fig
```

Use `show_names=True` (default) to display the name of each interval on the chart.

### LassoSelector

Draw a freehand lasso to select arbitrary regions. Works on Scatter and Lines marks. Hold mouse down and draw the lasso; release to close it.

```py hl_lines="7 8 9"
import bqplot as bq
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure()
x, y = np.random.rand(2, 100)
scatter = plt.scatter(x, y, unselected_style={"opacity": 0.2})

xs = scatter.scales["x"]
ys = scatter.scales["y"]
selector = bq.LassoSelector(x_scale=xs, y_scale=ys, marks=[scatter])
fig.interaction = selector
fig
```

Click on a drawn lasso to select/deselect it. Press `Delete` to remove a lasso and clear its selection.

### Removing a Selector

```py
fig.interaction = None
```

### Responding to Selections

All selectors update the `selected` attribute on linked marks. Register an `observe` callback to react to selection changes:

```py
def on_select(change):
    indices = mark.selected
    if indices is not None and len(indices) > 0:
        selected_x = x[indices]
        selected_y = y[indices]
        # update another widget, run computation, etc.

mark.observe(on_select, names=["selected"])
```

!!! tip
    Use `selected_style` and `unselected_style` on the mark to visually highlight selected vs. unselected data points.
    ```py
    scatter = plt.scatter(x, y,
                          selected_style={"stroke": "black", "fill": "orange"},
                          unselected_style={"opacity": 0.2})
    ```

### API Reference

For all selector attributes, see the [Interactions API](../../api/interactions.md).

### Example Notebooks

1. [Interactions](https://github.com/bqplot/bqplot/blob/master/examples/Interactions/Interactions.ipynb)
2. [Selectors](https://github.com/bqplot/bqplot/blob/master/examples/Interactions/Selectors.ipynb)
