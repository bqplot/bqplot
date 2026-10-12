The `Pie` mark provides the following features:

* Plot a pie chart from an array of sizes (proportions)
* Create donut charts by setting the `inner_radius` attribute
* Display labels inside or outside slices, optionally with numeric values
* Sort slices by descending size, or render a partial arc (gauge chart) using `start_angle` / `end_angle`
* Encode a third dimension using a `ColorScale` via the `color` attribute

### Attributes

#### [Data Attributes](../../api/marks.md#bqplot.marks.Pie--data-attributes)

#### [Style Attributes](../../api/marks.md#bqplot.marks.Pie--style-attributes)

Let's now look at examples of constructing pie charts using the `pyplot` API

### pyplot
The function for plotting pie charts in `pyplot` is [`plt.pie`](../../api/pyplot.md#bqplot.pyplot.pie). It takes one main argument:

1. __sizes__ 1d array of values representing the relative size of each slice

For further customization, any of the attributes above can be passed as keyword args.

### Code Examples
#### Simple Pie Chart
```py hl_lines="7"
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure(title="Pie Chart")

sizes = np.array([1, 2, 3, 4])
pie = plt.pie(sizes)
fig
```

Attributes can be updated in separate notebook cells or in callbacks when an event is triggered!
```py
# update colors and opacities
pie.colors = ["steelblue", "salmon", "limegreen", "orange"]
pie.opacities = [0.8, 0.8, 0.8, 0.8]
```

#### Slice Labels
Use the `display_labels` attribute to control label placement: `'none'`, `'inside'`, or `'outside'`.

=== "Inside Labels"
    ```py hl_lines="5"
    fig = plt.figure(title="Pie Chart - Inside Labels")
    sizes = [25, 35, 20, 20]
    labels = ["Q1", "Q2", "Q3", "Q4"]
    pie = plt.pie(sizes, labels=labels, display_labels="inside")
    fig
    ```

=== "Outside Labels"
    ```py hl_lines="5"
    fig = plt.figure(title="Pie Chart - Outside Labels")
    sizes = [25, 35, 20, 20]
    labels = ["Q1", "Q2", "Q3", "Q4"]
    pie = plt.pie(sizes, labels=labels, display_labels="outside")
    fig
    ```

Use `display_values=True` to show the numeric values alongside the labels:
```py
pie = plt.pie(sizes, labels=labels, display_labels="outside",
              display_values=True, values_format=".0f")
```

#### Donut Chart
Set `inner_radius` to a non-zero value to create a donut chart:

```py hl_lines="5"
fig = plt.figure(title="Donut Chart")
sizes = [25, 35, 20, 20]
labels = ["Q1", "Q2", "Q3", "Q4"]
pie = plt.pie(sizes, labels=labels, inner_radius=80,
              display_labels="outside")
fig
```
!!! tip
    `radius` sets the outer radius and `inner_radius` sets the hole size, both in pixels. The default `radius` is 180. Setting `inner_radius` to around 60–100 gives a good-looking donut.

#### Sorting Slices
Use `sort=True` to automatically sort slices by descending size:

```py
pie = plt.pie(sizes, labels=labels, sort=True, display_labels="outside")
```

#### Partial Arc (Gauge Chart)
Use `start_angle` and `end_angle` (both in degrees, measured clockwise from the top) to render only a portion of the full circle:

```py hl_lines="4 5"
fig = plt.figure(title="Gauge")
sizes = [40, 30, 20, 10]
pie = plt.pie(sizes, start_angle=-90, end_angle=90,
              inner_radius=60, display_labels="outside")
fig
```

#### Using `color` Data Attribute
The `color` attribute encodes a numeric dimension using a `ColorScale`, overriding the default categorical `colors` list:

```py hl_lines="3 4 9"
import bqplot as bq

fig = plt.figure(fig_margin=dict(top=50, bottom=80, left=50, right=50))
sizes = [20, 30, 25, 25]
color_data = np.array([1.2, 3.4, 2.1, 4.5])

plt.scales(scales={"color": bq.ColorScale(scheme="Reds")})
pie = plt.pie(sizes, color=color_data)
fig
```

#### Interactions
##### Tooltips
Tooltips can be added by setting the `tooltip` attribute to a [Tooltip](../../api/tooltip.md) instance:

```py hl_lines="6 7"
import bqplot as bq

fig = plt.figure()
sizes = [20, 30, 25, 25]
labels = ["A", "B", "C", "D"]
tooltip = bq.Tooltip(fields=["index", "size"], formats=["", ".1f"])
pie = plt.pie(sizes, labels=labels, tooltip=tooltip)
fig
```

##### Selecting Slices
Discrete slice(s) can be selected via mouse clicks. The `selected` attribute is automatically updated with the __indices__ of the selected slices.

!!! tip
    Use the `selected_style` and `unselected_style` attributes (dicts) to apply CSS styling for selected and unselected slices respectively.

```py hl_lines="6 7"
fig = plt.figure()
sizes = [25, 35, 20, 20]
labels = ["A", "B", "C", "D"]
pie = plt.pie(sizes, labels=labels,
              interactions={"click": "select"},
              unselected_style={"opacity": 0.4})

def on_select(*args):
    print("Selected slices:", pie.selected)

pie.observe(on_select, names=["selected"])
fig
```

### Example Notebooks
For detailed examples of pie charts, refer to the following example notebooks

1. [pyplot](https://github.com/bqplot/bqplot/blob/master/examples/Marks/Pyplot/Pie.ipynb)
2. [Object Model](https://github.com/bqplot/bqplot/blob/master/examples/Marks/Object%20Model/Pie.ipynb)
