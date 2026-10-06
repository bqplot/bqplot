The `HandDraw` interaction lets users **edit the y-values of a Lines mark** by drawing directly on the chart with the mouse. While holding the mouse button down, move the cursor over the chart to redraw the line along the mouse path.

This is useful for scenarios like:

* Drawing a custom forecast or annotation on a time series
* Letting users interactively adjust a line and observing how downstream computations change
* Rapid prototyping of curve shapes

### Attributes

#### [HandDraw API](../../api/interactions.md#bqplot.interacts.HandDraw)

### Code Examples

#### Basic HandDraw
```py hl_lines="11 12"
import bqplot as bq
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure(title="Hand Draw")

x = np.linspace(0, 10, 200)
y = np.sin(x)
line = plt.plot(x, y)

hand_draw = bq.HandDraw(lines=line)
fig.interaction = hand_draw
fig
```

Hold the mouse button and drag over the chart to redraw the line. Release to finish.

#### Restricting the Editable Range

Use `min_x` and `max_x` to limit which part of the line can be edited:

```py hl_lines="4 5"
hand_draw = bq.HandDraw(
    lines=line,
    min_x=3.0,   # only allow editing x >= 3.0
    max_x=7.0    # only allow editing x <= 7.0
)
fig.interaction = hand_draw
```

#### Editing One Line in a Multi-Line Chart

For a `Lines` mark with multi-dimensional `y` (multiple lines), use `line_index` to specify which line to edit:

```py hl_lines="9 10 11"
import bqplot as bq
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure()
x = np.linspace(0, 10, 100)
y = np.array([np.sin(x), np.cos(x)])  # two lines
line = plt.plot(x, y)

# edit only the second line (index 1)
hand_draw = bq.HandDraw(lines=line, line_index=1)
fig.interaction = hand_draw
fig
```

#### Observing Changes

The edited `y` values are available on `line.y` after drawing. Register an `observe` callback to react:

```py hl_lines="3 4 5 6"
import ipywidgets as widgets

output = widgets.Output()

def on_y_change(change):
    with output:
        output.clear_output(wait=True)
        print("New y values:", line.y[:5], "...")  # show first 5

line.observe(on_y_change, names=["y"])

widgets.VBox([fig, output])
```

#### Toggling HandDraw On and Off

Attach the interaction to a toggle button:

```py
import ipywidgets as widgets

toggle = widgets.ToggleButton(description="Hand Draw", value=True)
hand_draw = bq.HandDraw(lines=line)

def on_toggle(change):
    fig.interaction = hand_draw if change["new"] else None

toggle.observe(on_toggle, names=["value"])
fig.interaction = hand_draw

widgets.VBox([toggle, fig])
```

### Removing the Interaction

```py
fig.interaction = None
```

### API Reference

See the [Interactions API](../../api/interactions.md#bqplot.interacts.HandDraw) for the full list of HandDraw attributes.

### Example Notebooks

1. [Interactions](https://github.com/bqplot/bqplot/blob/master/examples/Interactions/Interactions.ipynb)
