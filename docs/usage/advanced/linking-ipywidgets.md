Because bqplot marks and figures are ipywidgets, their traits can be linked to other ipywidgets using the standard ipywidgets linking mechanisms. This enables rich, reactive UIs where changing one widget automatically updates another — with no explicit callback needed.

### `observe` — Python-side callbacks

The most flexible approach is using `traitlets.observe`. Register a callback function that is called whenever a trait value changes:

```py
import bqplot.pyplot as plt
import ipywidgets as widgets
import numpy as np

fig = plt.figure()
x = np.linspace(0, 10, 100)
line = plt.plot(x, np.sin(x))

# A slider that controls the y-offset of the line
offset_slider = widgets.FloatSlider(value=0.0, min=-2.0, max=2.0, step=0.05,
                                     description="Offset")

def on_offset(change):
    line.y = np.sin(x) + change["new"]

offset_slider.observe(on_offset, names=["value"])

widgets.VBox([offset_slider, fig])
```

### `widgets.link` — Bidirectional Python linking

`widgets.link` creates a **bidirectional** link between two traits. If either side changes, the other is updated automatically:

```py
import bqplot as bq
import ipywidgets as widgets
import numpy as np

x_sc = bq.LinearScale(min=0, max=10)
y_sc = bq.LinearScale()
ax_x = bq.Axis(scale=x_sc, label="X")
ax_y = bq.Axis(scale=y_sc, orientation="vertical", label="Y")
line = bq.Lines(x=np.linspace(0, 10, 100), y=np.sin(np.linspace(0, 10, 100)),
                scales={"x": x_sc, "y": y_sc})
fig = bq.Figure(marks=[line], axes=[ax_x, ax_y])

# Link the figure title to a text widget
title_input = widgets.Text(value="My Chart", description="Title")
widgets.link((fig, "title"), (title_input, "value"))

widgets.VBox([title_input, fig])
```

### `widgets.jslink` — Client-side linking (no Python round-trip)

`widgets.jslink` links two traits directly in the browser. Changes are reflected immediately without any Python execution. This is ideal for visual properties that should feel instantaneous:

```py
import bqplot.pyplot as plt
import ipywidgets as widgets
import numpy as np

fig = plt.figure()
x = np.linspace(0, 10, 100)
scatter = plt.scatter(x, np.sin(x))

# Link a slider to the mark's default_opacities without Python round-trip
opacity_slider = widgets.FloatSlider(value=1.0, min=0.0, max=1.0, step=0.05,
                                      description="Opacity")
# jslink works on simple scalar traits
widgets.jslink((opacity_slider, "value"), (fig, "fig_margin"))  # example only
```

!!! tip
    `jslink` is best for traits that map directly to frontend properties (like `fig.title`, axis `label`, or scale `min`/`max`). For traits requiring computation or array manipulation, use `observe` instead.

### Linking Scale Ranges to Sliders

A common pattern is letting users control the visible data range by linking scale `min`/`max` to sliders:

```py hl_lines="12 13 14 15 16"
import bqplot as bq
import bqplot.pyplot as plt
import ipywidgets as widgets
import numpy as np

fig = plt.figure(title="Zoom via Sliders")
x = np.linspace(0, 10, 200)
line = plt.plot(x, np.sin(x) * np.exp(-x / 5))
xs = line.scales["x"]

x_min_slider = widgets.FloatSlider(value=0, min=0, max=9, step=0.1,
                                    description="X min")
x_max_slider = widgets.FloatSlider(value=10, min=1, max=10, step=0.1,
                                    description="X max")

widgets.link((x_min_slider, "value"), (xs, "min"))
widgets.link((x_max_slider, "value"), (xs, "max"))

widgets.VBox([x_min_slider, x_max_slider, fig])
```

### Linking Two Charts Together

Selectors on one chart can drive filtering in another by observing `mark.selected`:

```py hl_lines="17 18 19 20 21"
import bqplot as bq
import bqplot.pyplot as plt
import ipywidgets as widgets
import numpy as np

n = 200
x = np.random.randn(n)
y = np.random.randn(n)

# Chart 1: scatter with a brush selector
fig1 = plt.figure(title="Select here", layout={"width": "350px"})
scatter1 = plt.scatter(x, y, unselected_style={"opacity": 0.2})
xs, ys = scatter1.scales["x"], scatter1.scales["y"]
brush = bq.BrushSelector(x_scale=xs, y_scale=ys, marks=[scatter1])
fig1.interaction = brush

# Chart 2: histogram that updates based on selection
fig2 = plt.figure(title="Distribution of selection", layout={"width": "350px"})
hist = plt.hist(x, bins=20)

def on_select(change):
    idx = scatter1.selected
    data = x[idx] if idx is not None and len(idx) > 0 else x
    hist.sample = data

scatter1.observe(on_select, names=["selected"])

widgets.HBox([fig1, fig2])
```

### Linking bqplot with Output Widgets

Use `widgets.Output` to display text or matplotlib figures that react to bqplot interactions:

```py
import bqplot.pyplot as plt
import ipywidgets as widgets
import numpy as np

fig = plt.figure()
x, y = np.random.rand(2, 30)
scatter = plt.scatter(x, y, interactions={"click": "select"})

output = widgets.Output()

def on_select(change):
    with output:
        output.clear_output(wait=True)
        idx = scatter.selected
        if idx:
            print(f"Selected {len(idx)} points")
            print(f"Mean x: {x[idx].mean():.3f}, Mean y: {y[idx].mean():.3f}")

scatter.observe(on_select, names=["selected"])

widgets.VBox([fig, output])
```

### API Reference

* [ipywidgets linking docs](https://ipywidgets.readthedocs.io/en/stable/examples/Widget%20Events.html#Linking-Widgets)
* [bqplot Interactions API](../../api/interactions.md)
