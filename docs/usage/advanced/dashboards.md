bqplot is built on top of [ipywidgets](https://ipywidgets.readthedocs.io), which means bqplot figures can be placed inside any ipywidgets layout alongside sliders, dropdowns, buttons, and other controls to build interactive dashboards — all within a Jupyter notebook or JupyterLab.

### Basic Layout

Use `ipywidgets.VBox` and `ipywidgets.HBox` to arrange figures and controls:

```py
import bqplot.pyplot as plt
import ipywidgets as widgets
import numpy as np

# Create the chart
fig = plt.figure(title="Sine Wave")
x = np.linspace(0, 4 * np.pi, 200)
line = plt.plot(x, np.sin(x))

# Create a slider
freq_slider = widgets.FloatSlider(value=1.0, min=0.1, max=5.0, step=0.1,
                                  description="Frequency")

def on_freq_change(change):
    line.y = np.sin(change["new"] * x)

freq_slider.observe(on_freq_change, names=["value"])

# Lay out vertically
widgets.VBox([freq_slider, fig])
```

### Dashboard with Multiple Charts

```py hl_lines="25 26 27"
import bqplot.pyplot as plt
import ipywidgets as widgets
import numpy as np

n = 100
x = np.random.randn(n)
y = np.random.randn(n)
color = np.random.rand(n)

# Scatter chart
fig1 = plt.figure(title="Scatter", layout={"width": "400px"})
scatter = plt.scatter(x, y)

# Histogram
fig2 = plt.figure(title="Distribution", layout={"width": "400px"})
hist = plt.hist(x, bins=20)

# Slider to filter data by color threshold
threshold_slider = widgets.FloatSlider(value=0.5, min=0.0, max=1.0, step=0.01,
                                        description="Threshold")

def on_threshold(change):
    mask = color <= change["new"]
    scatter.x = x[mask]
    scatter.y = y[mask]

threshold_slider.observe(on_threshold, names=["value"])

widgets.VBox([
    threshold_slider,
    widgets.HBox([fig1, fig2])
])
```

### Using Dropdown to Switch Data

```py
import bqplot.pyplot as plt
import ipywidgets as widgets
import numpy as np

x = np.linspace(0, 2 * np.pi, 100)
datasets = {
    "sin": np.sin(x),
    "cos": np.cos(x),
    "tan (clipped)": np.clip(np.tan(x), -2, 2)
}

fig = plt.figure(title="Function Selector")
line = plt.plot(x, datasets["sin"])

dropdown = widgets.Dropdown(options=list(datasets.keys()),
                            description="Function")

def on_selection(change):
    line.y = datasets[change["new"]]
    fig.title = change["new"]

dropdown.observe(on_selection, names=["value"])

widgets.VBox([dropdown, fig])
```

### Toolbar + Custom Controls

`plt.show()` adds a standard toolbar. For custom control layouts, display `fig` directly and build your own controls:

```py
import bqplot.pyplot as plt
import bqplot as bq
import ipywidgets as widgets
import numpy as np

fig = plt.figure(title="Custom Dashboard")
x = np.linspace(0, 10, 100)
line = plt.plot(x, np.sin(x))

# Custom pan/zoom toggle
panzoom = bq.PanZoom(scales={"x": [line.scales["x"]], "y": [line.scales["y"]]})
pz_toggle = widgets.ToggleButton(description="Pan/Zoom", icon="search-plus")

def on_pz_toggle(change):
    fig.interaction = panzoom if change["new"] else None

pz_toggle.observe(on_pz_toggle, names=["value"])

# Color picker for the line
color_picker = widgets.ColorPicker(value="#1f77b4", description="Color")
color_picker.observe(lambda c: setattr(line, "colors", [c["new"]]), names=["value"])

widgets.VBox([
    widgets.HBox([pz_toggle, color_picker]),
    fig
])
```

### Real-World Examples

For complete, real-world dashboard examples using bqplot, see the [`bqplot-gallery`](https://github.com/bqplot/bqplot-gallery) repository:

* [Logs Analytics](https://github.com/bqplot/bqplot-gallery/blob/main/notebooks/logs_analytics/logs_analytics.ipynb) — interactive log analysis dashboard
* [Wealth of Nations](https://github.com/bqplot/bqplot/blob/master/examples/Applications/Wealth%20of%20Nations/Bubble%20Chart.ipynb) — animated bubble chart dashboard
* [Crossfilter](https://github.com/bqplot/bqplot-gallery/blob/main/notebooks/crossfilter/crossfilter.ipynb) — multi-chart linked selection dashboard
