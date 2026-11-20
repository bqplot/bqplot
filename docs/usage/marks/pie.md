The Pie mark provides the following features:

* Data attributes encoding `sizes` and `color`.
* Support for various styling (stroke color, opacities, sorting, radius and positioning of the pie chart, labeling etc.)
* Interactive updates with the ability to add update sizes and colors.

### Attributes

#### [Data Attributes](../../../api/marks/#bqplot.marks.Pie--data-attributes)

#### [Style Attributes](../../../api/marks/#bqplot.marks.Pie--style-attributes)

### pyplot
The function for plotting pie charts in `pyplot` is [`plt.pie`](../../api/pyplot.md#bqplot.pyplot.pie). It takes one positional argument:

1. __sizes__ 1d array of sizes values

Colors data must be passed as keyword argument.

For further customization, any of the data/style attributes above can be passed as keyword arguments.

### Code Examples
#### Simple Pie Chart
```py hl_lines="7"
import bqplot.pyplot as plt
import numpy as np

fig = plt.figure()

x = np.random.rand(5)
pie = plt.pie(x, stroke="black")
fig
```
![plot](../../assets/images/pie-image1.png)

Attributes can be updated in separate notebook cells or in callbacks when an event is triggered!
```py
pie.radius = 150 # (1)!
pie.inner_radius = 100 # (2)!
pie.start_angle = -90 # (3)!
pie.end_angle = 90 # (4)!
```

1. change the outer radius
2. change the inner radius
3. change the angle from which we start drawing the pie
4. change the angle from which we end drawing the pie
!!! tip "In Place Updates"
    The output cell containing the chart will be automatically updated whenever the figure or mark attributes are updated! The figure or marks should __never__ be recreated!

#### Labels
Labels for pie slices can be added by setting the `labels` property

```py hl_lines="4"
fig = plt.figure()

x = np.random.rand(5)
pie = plt.pie(x, labels=list(string.ascii_uppercase), label_color="black", stroke="black")
fig
```
![plot](../../assets/images/pie-image2.png)

You can change the styling of those labels with the following properties:
```py
pie.display_labels = "outside" # (1)!
pie.label_color = "black" # (2)!
pie.font_size = "20px" # (3)!
pie.font_weight = "bold" # (4)!
```

1. display the labels outside of the pie instead of in the middle of slices
2. change the labels font color
3. change the labels font size
4. change the labels font weight: "bold", "normal" or "bolder"

!!! tip
    You can change multiple properties at once using the `hold_sync` context manager
    ```py
    with pie.hold_sync():
        pie.display_labels = "inside"
        pie.label_color = "white"
        pie.font_size = "11px"
        pie.font_weight = "bolder"
    ```

#### Multiple Dimensions
An additional dimension can be encoded in a pie chart by using the `color` data attribute.

```py hl_lines="8 9"
from bqplot import ColorScale, ColorAxis

n = 7
size_data = np.random.rand(n)
color_data = np.random.randn(n)

fig = plt.figure()
plt.scales(scales={"color": ColorScale(scheme="Reds")})  # (1)!
pie = plt.pie(size_data, color=color_data)  # (2)!
fig
```

1. create the color scale using a white to red colormap
2. create the pie by passing the color data attribute

![plot](../../assets/images/pie-image3.png)
