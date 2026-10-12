A **compound widget** combines bqplot figures with ipywidgets controls into a single, reusable Python class. This approach encapsulates the layout, event wiring, and state management, making it easy to drop the widget into a notebook or share it as a library component.

### Basic Pattern

Subclass `ipywidgets.VBox` (or `HBox`) and build the layout in `__init__`:

```py
import bqplot.pyplot as plt
import bqplot as bq
import ipywidgets as widgets
import numpy as np


class LinePlotWithSlider(widgets.VBox):
    """A line chart with a frequency slider."""

    def __init__(self, **kwargs):
        # Build the figure
        self.fig = plt.figure(title="Interactive Sine")
        self.x = np.linspace(0, 4 * np.pi, 300)
        self.line = plt.plot(self.x, np.sin(self.x))

        # Build the control
        self.slider = widgets.FloatSlider(
            value=1.0, min=0.1, max=5.0, step=0.1,
            description="Frequency"
        )
        self.slider.observe(self._on_freq_change, names=["value"])

        # Pass children to VBox
        super().__init__(children=[self.slider, self.fig], **kwargs)

    def _on_freq_change(self, change):
        self.line.y = np.sin(change["new"] * self.x)


# Usage
widget = LinePlotWithSlider()
widget
```

### Adding Public Properties

Expose key attributes as Python properties so callers can read and set state programmatically:

```py
class LinePlotWithSlider(widgets.VBox):

    def __init__(self, **kwargs):
        self.fig = plt.figure()
        self.x = np.linspace(0, 4 * np.pi, 300)
        self.line = plt.plot(self.x, np.sin(self.x))
        self.slider = widgets.FloatSlider(value=1.0, min=0.1, max=5.0,
                                          description="Frequency")
        self.slider.observe(self._on_freq_change, names=["value"])
        super().__init__(children=[self.slider, self.fig], **kwargs)

    @property
    def frequency(self):
        return self.slider.value

    @frequency.setter
    def frequency(self, value):
        self.slider.value = value  # triggers _on_freq_change

    def _on_freq_change(self, change):
        self.line.y = np.sin(change["new"] * self.x)
```

### Reusable Scatter Explorer

A more complete example — a scatter plot paired with summary statistics that update on selection:

```py
import bqplot.pyplot as plt
import bqplot as bq
import ipywidgets as widgets
import numpy as np


class ScatterExplorer(widgets.VBox):
    """Scatter chart with brush selector and live summary stats."""

    def __init__(self, x, y, **kwargs):
        self.x_data = np.asarray(x)
        self.y_data = np.asarray(y)

        # Chart
        self.fig = plt.figure(title="Scatter Explorer",
                              layout={"width": "500px", "height": "350px"})
        self.scatter = plt.scatter(
            self.x_data, self.y_data,
            unselected_style={"opacity": 0.2}
        )

        # Brush selector
        xs = self.scatter.scales["x"]
        ys = self.scatter.scales["y"]
        self.brush = bq.BrushSelector(
            x_scale=xs, y_scale=ys,
            marks=[self.scatter]
        )
        self.fig.interaction = self.brush

        # Stats output
        self.stats_label = widgets.HTML(value=self._format_stats(None))
        self.scatter.observe(self._on_select, names=["selected"])

        # Reset button
        reset_btn = widgets.Button(description="Reset", icon="refresh")
        reset_btn.on_click(lambda _: setattr(self.scatter, "selected", None))

        super().__init__(children=[self.fig, reset_btn, self.stats_label],
                         **kwargs)

    def _format_stats(self, idx):
        if idx is None or len(idx) == 0:
            sx, sy = self.x_data, self.y_data
            label = "All points"
        else:
            sx, sy = self.x_data[idx], self.y_data[idx]
            label = f"{len(idx)} selected"
        return (
            f"<b>{label}</b><br>"
            f"X: mean={sx.mean():.3f}, std={sx.std():.3f}<br>"
            f"Y: mean={sy.mean():.3f}, std={sy.std():.3f}"
        )

    def _on_select(self, change):
        self.stats_label.value = self._format_stats(self.scatter.selected)


# Usage
np.random.seed(42)
explorer = ScatterExplorer(np.random.randn(100), np.random.randn(100))
explorer
```

### Tips for Compound Widgets

* **Use `hold_sync()`** when updating multiple mark attributes at once to avoid intermediate renders:
  ```py
  with self.line.hold_sync():
      self.line.x = new_x
      self.line.y = new_y
  ```

* **Avoid `plt.figure()` state leaks** — call `plt.figure()` at construction time and store the reference. Using multiple compound widgets in the same notebook can otherwise interfere if the pyplot context isn't managed carefully. Alternatively, use the [object model](../object-model.md) API which avoids global state entirely.

* **Layout sizing** — pass `layout=widgets.Layout(width="100%")` to `plt.figure()` and to the compound widget's `VBox`/`HBox` for responsive sizing.

* **Expose the figure** — keep `self.fig` as a public attribute so callers can further customize titles, axes, and margins after construction.

### API Reference

* [ipywidgets widget list](https://ipywidgets.readthedocs.io/en/stable/examples/Widget%20List.html)
* [bqplot Object Model](../object-model.md)
* [bqplot Figure API](../../api/figure.md)
