Axes are the visual representation of scales. Every scale that maps data to a positional dimension (`x`, `y`) should have a corresponding axis displayed on the figure.

bqplot provides two axis types:

* `Axis` — for numerical, date, or ordinal scales
* `ColorAxis` — for color scales (renders as a color bar)

### Default Axis Behavior

When using `pyplot`, axes are created automatically with sensible defaults. You can customize them by passing an `axes_options` dict to the mark function:

```py
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure()
axes_options = {
    "x": {"label": "X Axis", "tick_format": ".1f"},
    "y": {"label": "Y Axis", "grid_lines": "dashed"}
}
line = plt.plot(np.linspace(0, 10, 50), np.sin(np.linspace(0, 10, 50)),
                axes_options=axes_options)
fig
```

### Common Axis Attributes

| Attribute | Description |
|---|---|
| `label` | Text label shown along the axis |
| `side` | Which side to display: `'bottom'`, `'top'`, `'left'`, `'right'` |
| `tick_format` | d3 format string for tick labels (e.g. `".2f"`, `"%b %Y"`) |
| `num_ticks` | Number of ticks to display |
| `tick_values` | Explicit array of tick positions |
| `tick_labels` | Dict to override specific tick labels `{value: label}` |
| `grid_lines` | Grid line style: `'solid'`, `'dashed'`, or `'none'` |
| `grid_color` | Color of the grid lines |
| `color` | Color of the axis line and ticks |
| `label_color` | Color of the axis label |
| `label_location` | `'middle'`, `'start'`, or `'end'` |
| `label_offset` | Offset of the label from the axis line (e.g. `'2em'`) |
| `tick_style` | Dict of CSS styles applied to tick text |
| `tick_rotate` | Degrees to rotate tick labels |
| `visible` | Toggle axis visibility |

### Code Examples

#### Axis Labels and Tick Formatting

```py hl_lines="5 6 7"
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure(title="Formatted Axes")
axes_options = {
    "x": {"label": "Time (s)", "tick_format": ".1f", "label_offset": "3em"},
    "y": {"label": "Amplitude", "grid_lines": "dashed"}
}
x = np.linspace(0, 2 * np.pi, 100)
line = plt.plot(x, np.sin(x), axes_options=axes_options)
fig
```

#### Rotating Tick Labels

Long category names often overlap. Rotate the tick labels to fix this:

```py hl_lines="4"
fig = plt.figure()
categories = ["January", "February", "March", "April", "May", "June"]
values = [10, 25, 18, 32, 27, 40]
axes_options = {"x": {"tick_rotate": -45, "grid_lines": "none"}}
bar = plt.bar(categories, values, axes_options=axes_options)
fig
```

#### Explicit Tick Values and Labels

Override which ticks are displayed and what they say:

```py hl_lines="6 7 8"
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure()
axes_options = {
    "x": {
        "tick_values": [0, 1.5708, 3.1416, 4.7124, 6.2832],
        "tick_labels": {0: "0", 1.5708: "π/2", 3.1416: "π",
                        4.7124: "3π/2", 6.2832: "2π"}
    }
}
x = np.linspace(0, 2 * np.pi, 100)
line = plt.plot(x, np.sin(x), axes_options=axes_options)
fig
```

#### Date Axis Formatting

For time-series data use d3 time format strings for `tick_format`:

```py hl_lines="6"
import pandas as pd

dates = pd.date_range("2023-01-01", periods=52, freq="W").values
values = np.random.randn(52).cumsum()

axes_options = {"x": {"tick_format": "%b '%y", "label": "Week"}}
fig = plt.figure()
line = plt.plot(dates, values, axes_options=axes_options)
fig
```

#### Object Model Axis Construction

When using the object model, create `Axis` instances explicitly and pass them to the figure:

```py hl_lines="6 7 8 9"
import bqplot as bq
import numpy as np

x_sc = bq.LinearScale()
y_sc = bq.LinearScale()

ax_x = bq.Axis(scale=x_sc, label="X", grid_lines="solid")
ax_y = bq.Axis(scale=y_sc, label="Y", orientation="vertical",
               grid_lines="dashed", tick_format=".2f")

x = np.linspace(0, 10, 50)
line = bq.Lines(x=x, y=np.sin(x), scales={"x": x_sc, "y": y_sc})
fig = bq.Figure(marks=[line], axes=[ax_x, ax_y], title="Object Model Axes")
fig
```

#### ColorAxis (Color Bar)

`ColorAxis` renders a color bar for any mark that uses a `ColorScale`. Add it to the figure's `axes` list:

```py hl_lines="9 10 11"
import bqplot as bq
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure(fig_margin=dict(top=50, bottom=80, left=50, right=50))

x, y = np.random.rand(2, 50)
color_data = np.random.rand(50)

color_sc = bq.ColorScale(scheme="Viridis")
color_ax = bq.ColorAxis(scale=color_sc, label="Intensity",
                        orientation="horizontal", side="bottom")

plt.scales(scales={"color": color_sc})
scatter = plt.scatter(x, y, color=color_data, stroke="black")
plt.current_figure().axes = list(plt.current_figure().axes) + [color_ax]
fig
```

!!! tip
    When using `pyplot`, a `ColorAxis` is __not__ added automatically — you must create and attach it manually as shown above.

### Updating Axes After Construction

Axis attributes can be changed at any time after the figure is displayed:

```py
# change axis label and grid color
ax_x.label = "New Label"
ax_x.grid_color = "lightgray"
ax_x.tick_rotate = -30
```

### API Reference

For the complete list of axis attributes, see the [Axes API](../api/axes.md).
