The `HeatMap` mark provides the following features:

* Plot a 2d matrix of values as a continuous heat map with smooth color interpolation
* Use `x` and `y` arrays to define the axis boundaries for columns and rows
* Customize the color mapping using a `ColorScale` with any supported color scheme
* Handle missing data by setting a distinct `null_color`

!!! tip
    The key difference between `HeatMap` and [`GridHeatMap`](gridheatmap.md) is that `HeatMap` uses **continuous** (Linear) scales for `x` and `y`, while `GridHeatMap` uses **ordinal/categorical** row and column labels.

### Attributes

#### [Data Attributes](../../api/marks.md#bqplot.marks.HeatMap--data-attributes)

#### [Style Attributes](../../api/marks.md#bqplot.marks.HeatMap--style-attributes)

Let's now look at examples of constructing heat maps using the `pyplot` API

### pyplot
The function for plotting heat maps in `pyplot` is [`plt.heatmap`](../../api/pyplot.md#bqplot.pyplot.heatmap). It takes one main argument:

1. __color__ 2d numpy array of values to be displayed as the heat map

For further customization, any of the attributes above can be passed as keyword args.

### Code Examples
#### Simple Heat Map
```py hl_lines="8 9"
import bqplot.pyplot as plt
import numpy as np

data = np.random.randn(10, 10)

fig = plt.figure(title="Heat Map", padding_y=0)
heatmap = plt.heatmap(data)
fig
```

Attributes can be updated in separate notebook cells or in callbacks when an event is triggered!
```py
# update the color scale scheme
import bqplot as bq
heatmap.scales["color"].scheme = "Blues"
```

#### Custom Axis Ranges
Pass `x` and `y` arrays to define the coordinate boundaries for the columns and rows. The length of `x` should be `num_columns + 1` and `y` should be `num_rows + 1` (boundary values):

```py hl_lines="5 6"
data = np.random.randn(10, 10)

x = np.linspace(0, 1, 11)   # 11 boundary values for 10 columns
y = np.linspace(0, 1, 11)   # 11 boundary values for 10 rows

fig = plt.figure(title="Heat Map with Custom Axes", padding_y=0)
heatmap = plt.heatmap(data, x=x, y=y)
fig
```

#### Alternative Color Schemes
Customize the color scale by passing a `ColorScale` instance via the `scales` argument:

```py hl_lines="6 7"
import bqplot as bq

data = np.random.randn(10, 10)

fig = plt.figure(title="Blues Heat Map", padding_y=0)
heatmap = plt.heatmap(
    data,
    scales={"color": bq.ColorScale(scheme="Blues")}
)
fig
```

=== "Diverging"
    ```py
    heatmap = plt.heatmap(
        data,
        scales={"color": bq.ColorScale(scheme="RdBu", mid=0)}
    )
    ```

=== "Sequential"
    ```py
    heatmap = plt.heatmap(
        data,
        scales={"color": bq.ColorScale(scheme="Greens", min=0)}
    )
    ```

#### Handling Missing Data
Use `null_color` to specify the color rendered for `NaN` values in the data:

```py hl_lines="5"
data_with_nans = data.copy()
data_with_nans[2, 5] = np.nan
data_with_nans[7, 3] = np.nan

heatmap = plt.heatmap(data_with_nans, null_color="lightgray")
```

### Example Notebooks
For detailed examples of heat map plots, refer to the following example notebooks

1. [pyplot](https://github.com/bqplot/bqplot/blob/master/examples/Marks/Pyplot/Heat_map.ipynb)
2. [Object Model](https://github.com/bqplot/bqplot/blob/master/examples/Marks/Object%20Model/Heat_map.ipynb)
