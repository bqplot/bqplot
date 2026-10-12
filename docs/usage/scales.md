Scales are the backbone of every bqplot chart. A **scale** maps data values to visual properties (position, color, size). Every data attribute on a mark is backed by a corresponding scale.

bqplot uses [bqscales](https://github.com/bqplot/bqscales) for its scale implementations.

### Types of Scales

| Scale | Use Case |
|---|---|
| `LinearScale` | Continuous numerical data |
| `LogScale` | Numerical data spanning many orders of magnitude |
| `OrdinalScale` | Categorical / discrete data |
| `DateScale` | Time-series data (Python `datetime` or numpy `datetime64`) |
| `ColorScale` | Numeric-to-color mapping for color encoding |
| `OrdinalColorScale` | Category-to-color mapping |
| `DateColorScale` | Date-to-color mapping |
| Geographic scales | Map projections (see [Scales API](../api/scales.md)) |

### Default Scale Behavior

When using `pyplot`, bqplot creates scales automatically based on the data type passed:

* Numeric arrays → `LinearScale`
* String/object arrays → `OrdinalScale`
* `datetime64` arrays → `DateScale`

You can override the defaults by calling `plt.scales()` before creating marks.

### LinearScale

The default scale for continuous numerical `x` and `y` data.

```py
import bqplot.pyplot as plt
import bqplot as bq
import numpy as np

fig = plt.figure()

# Customize the x scale to have a fixed domain
plt.scales(scales={
    "x": bq.LinearScale(min=0, max=10),
    "y": bq.LinearScale()
})

x = np.linspace(0, 10, 100)
line = plt.plot(x, np.sin(x))
fig
```

Key attributes:

* `min`, `max` — fix the domain bounds (default: auto-computed from data)
* `reverse` — flip the axis direction

### LogScale

Use a `LogScale` when data spans many orders of magnitude:

```py hl_lines="5 6"
import bqplot.pyplot as plt
import bqplot as bq
import numpy as np

fig = plt.figure()
plt.scales(scales={"y": bq.LogScale()})

x = np.arange(1, 11)
y = 10 ** x
line = plt.plot(x, y)
fig
```

### OrdinalScale

Used for categorical `x` data (e.g., bar charts). Created automatically when string arrays are passed as `x`.

```py hl_lines="6"
import bqplot.pyplot as plt
import bqplot as bq
import numpy as np

fig = plt.figure()
# OrdinalScale is created automatically for string x
bar = plt.bar(list("ABCDE"), np.random.rand(5))
fig
```

You can restrict which categories are shown using the `domain` attribute:

```py
plt.scales(scales={"x": bq.OrdinalScale(domain=["A", "B", "C"])})
```

### DateScale

Used for time-series data. Pass `datetime64` arrays as `x`:

```py hl_lines="8"
import bqplot.pyplot as plt
import bqplot as bq
import numpy as np
import pandas as pd

dates = pd.date_range("2023-01-01", periods=100, freq="D").values
values = np.random.randn(100).cumsum()

fig = plt.figure()
line = plt.plot(dates, values)
fig
```

Use `tick_format` on the axis to control the date display format (d3 format strings):

```py
axes_options = {"x": {"tick_format": "%b %Y", "label": "Date"}}
line = plt.plot(dates, values, axes_options=axes_options)
```

### ColorScale

A `ColorScale` maps numeric data to colors. It is used with marks that have a `color` data attribute (Scatter, Bars, Pie, GridHeatMap, Map, etc.).

```py hl_lines="7 8"
import bqplot.pyplot as plt
import bqplot as bq
import numpy as np

x, y = np.random.rand(2, 50)
color_data = np.random.rand(50)

plt.scales(scales={"color": bq.ColorScale(scheme="Reds")})
scatter = plt.scatter(x, y, color=color_data, stroke="black")
fig = plt.current_figure()
fig
```

Key attributes:

* `scheme` — d3 color scheme name, e.g. `"Reds"`, `"Blues"`, `"RdYlGn"`, `"Viridis"`
* `min`, `max` — clamp the domain
* `mid` — midpoint for diverging scales (e.g. `mid=0` for `"RdYlGn"`)
* `reverse` — flip the color direction

### Customizing Scales with pyplot

Use `plt.scales()` to set or replace scales __before__ creating marks:

```py
import bqplot.pyplot as plt
import bqplot as bq

fig = plt.figure()

plt.scales(scales={
    "x": bq.LinearScale(min=-5, max=5),
    "y": bq.LogScale()
})

line = plt.plot([-5, -1, 0, 1, 5], [0.001, 0.1, 1, 10, 1000])
fig
```

### Customizing Scales with the Object Model

In the object model you instantiate scales explicitly and pass them to marks:

```py
import bqplot as bq
import numpy as np

x_sc = bq.LinearScale()
y_sc = bq.LogScale()
ax_x = bq.Axis(scale=x_sc, label="X")
ax_y = bq.Axis(scale=y_sc, orientation="vertical", label="Y")

x = np.linspace(1, 100, 50)
line = bq.Lines(x=x, y=x**2, scales={"x": x_sc, "y": y_sc})
fig = bq.Figure(marks=[line], axes=[ax_x, ax_y])
fig
```

### API Reference

For the complete list of scale attributes, see the [Scales API](../api/scales.md).
