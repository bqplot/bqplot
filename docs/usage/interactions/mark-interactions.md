bqplot marks support a set of built-in mouse interactions that are configured through the `interactions` attribute. These interactions are independent of selectors — they work at the mark level without attaching anything to `fig.interaction`.

The `interactions` attribute is a dictionary mapping event names to actions:

```py
mark.interactions = {"click": "select", "hover": "tooltip"}
```

### Supported Events and Actions

| Event | Available Actions | Description |
|---|---|---|
| `"click"` | `"select"`, `"add_points"`, `"delete_points"` | Mouse click on a mark element |
| `"hover"` | `"tooltip"` | Mouse hover over a mark element |

### Click: Select

Set `interactions = {"click": "select"}` to enable discrete selection by clicking. The `selected` attribute on the mark is updated with the __indices__ of clicked elements.

* Single click — selects one element
* `Cmd`+click (Mac) / `Ctrl`+click (Windows) — adds to the current selection

```py hl_lines="7"
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure()
x, y = np.random.rand(2, 30)
scatter = plt.scatter(x, y,
                      interactions={"click": "select"},
                      selected_style={"fill": "orange", "stroke": "black"},
                      unselected_style={"opacity": 0.4})

def on_select(change):
    if scatter.selected is not None:
        print("Selected indices:", scatter.selected)

scatter.observe(on_select, names=["selected"])
fig
```

!!! tip
    Use `selected_style` and `unselected_style` (CSS dicts) to provide visual feedback for selected vs. unselected elements.

### Click: Add Points (Scatter only)

Set `interactions = {"click": "add_points"}` to let users add new data points by clicking on the figure:

```py hl_lines="6"
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure()
scatter = plt.scatter([], [],
                      interactions={"click": "add_points"})

def on_points_added(change):
    print(f"Points: x={scatter.x}, y={scatter.y}")

scatter.observe(on_points_added, names=["x"])
fig
```

### Click: Delete Points (Scatter only)

Set `interactions = {"click": "delete_points"}` to remove the nearest point on click:

```py hl_lines="7"
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure()
x, y = np.random.rand(2, 20)
scatter = plt.scatter(x, y,
                      interactions={"click": "delete_points"})
fig
```

### Hover: Tooltip

Set `interactions = {"hover": "tooltip"}` together with the `tooltip` attribute pointing to a [Tooltip](../../api/tooltip.md) instance to show a tooltip on hover.

```py hl_lines="7 8 9"
import bqplot as bq
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure()
x, y = np.random.rand(2, 30)
tooltip = bq.Tooltip(fields=["x", "y"], formats=[".3f", ".3f"])
scatter = plt.scatter(x, y,
                      tooltip=tooltip,
                      interactions={"hover": "tooltip"})
fig
```

The `Tooltip` widget supports:

* `fields` — list of data attribute names to display (`"x"`, `"y"`, `"color"`, `"size"`, etc.)
* `formats` — d3 format strings for each field
* `labels` — custom display names for each field (overrides field name)
* `show_labels` — whether to show the field name next to the value (default: True)

#### Custom Tooltip Labels

```py
tooltip = bq.Tooltip(
    fields=["x", "y"],
    formats=[".2f", ".2f"],
    labels=["Revenue ($M)", "Profit ($M)"]
)
```

### Combining Click and Hover

Multiple interactions can be set at once:

```py hl_lines="3 4"
scatter = plt.scatter(x, y,
                      tooltip=bq.Tooltip(fields=["x", "y"]),
                      interactions={"click": "select",
                                    "hover": "tooltip"},
                      unselected_style={"opacity": 0.4})
```

### Scatter-Specific: Moving Points

Scatter marks support dragging existing points when `enable_move=True`. This updates the `x` and `y` arrays as the user drags:

```py hl_lines="6"
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure()
x, y = np.random.rand(2, 10)
scatter = plt.scatter(x, y, enable_move=True)

def on_move(change):
    print("New positions:", scatter.x, scatter.y)

scatter.observe(on_move, names=["x", "y"])
fig
```

!!! tip
    `enable_move` can be combined with other interactions. For example, `enable_move=True` with `interactions={"click": "add_points"}` lets you both add and reposition points.

### Observing Events with Callbacks

Beyond observing trait changes, marks expose event dispatchers you can use to hook into specific mouse events:

```py
def on_element_click(mark, event):
    print("Clicked element data:", event)

scatter.on_element_click(on_element_click)
```

Available event methods:

* `mark.on_element_click(callback)` — triggered when a mark element is clicked
* `mark.on_background_click(callback)` — triggered when the figure background is clicked
* `mark.on_hover(callback)` — triggered when the mouse hovers over a mark element

### API Reference

For full details see the [Marks API](../../api/marks.md) and the [Tooltip API](../../api/tooltip.md).

### Example Notebooks

1. [Interactions](https://github.com/bqplot/bqplot/blob/master/examples/Interactions/Interactions.ipynb)
2. [Scatter Interactions](https://github.com/bqplot/bqplot/blob/master/examples/Marks/Pyplot/Scatter.ipynb)
