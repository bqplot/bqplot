The `MarketMap` provides the following features:

* Display a waffle-style grid of colored rectangles, one per item in a dataset
* Group items visually by a categorical attribute using the `groups` attribute
* Encode a numeric dimension using a `ColorScale` via the `color` attribute
* Show tooltips using `ref_data` (a pandas DataFrame) and `tooltip_fields`
* Display custom text inside each cell with `display_text`

!!! tip
    `MarketMap` is __not__ a `Mark` — it is a standalone `DOMWidget` and does __not__ have a `pyplot` function. Use the object model API to construct it.

### Attributes

#### [All Attributes](../../../api/market_map.md#bqplot.market_map.MarketMap)

### Object Model
A `MarketMap` is created directly as a widget. At minimum you need to provide the `names` array:

```python
import bqplot as bq
import numpy as np
import pandas as pd

names = [str(i) for i in range(20)]
market_map = bq.MarketMap(names=names)
market_map
```

### Code Examples
#### Simple Market Map
```py hl_lines="5"
import bqplot as bq
import numpy as np

names = list("ABCDEFGHIJKLMNOPQRST")
market_map = bq.MarketMap(names=names)
market_map
```

#### Grouping Items
Use the `groups` attribute to visually cluster items. Items sharing the same group value are placed adjacent to each other and separated by a border:

```py hl_lines="7"
import bqplot as bq
import numpy as np

names = list("ABCDEFGHIJKLMNOPQRST")
groups = ["Tech", "Tech", "Tech", "Finance", "Finance",
          "Finance", "Finance", "Health", "Health", "Health",
          "Health", "Health", "Energy", "Energy", "Energy",
          "Energy", "Retail", "Retail", "Retail", "Retail"]

market_map = bq.MarketMap(names=names, groups=groups, show_groups=True)
market_map
```

#### Color Encoding
Encode a numeric value per cell using the `color` attribute and a `ColorScale`:

```py hl_lines="6 7 8"
import bqplot as bq
import numpy as np

names = list("ABCDEFGHIJKLMNOPQRST")
color_data = np.random.randn(20)

color_scale = bq.ColorScale(scheme="RdYlGn", mid=0)
color_axis = bq.ColorAxis(scale=color_scale, label="Value")

market_map = bq.MarketMap(
    names=names,
    color=color_data,
    scales={"color": color_scale},
    axes=[color_axis]
)
market_map
```

#### Custom Cell Text
Use `display_text` to override the label shown inside each cell:

```py hl_lines="6"
import bqplot as bq
import numpy as np

names = ["AAPL", "GOOG", "AMZN", "MSFT", "META"]
changes = np.array([1.2, -0.5, 3.1, -1.8, 0.7])
display_text = [f"{c:+.1f}%" for c in changes]

market_map = bq.MarketMap(
    names=names,
    color=changes,
    display_text=display_text,
    scales={"color": bq.ColorScale(scheme="RdYlGn", mid=0)}
)
market_map
```

#### Tooltips with ref_data
Pass a pandas DataFrame as `ref_data` and specify `tooltip_fields` to automatically build a tooltip from the data:

```py hl_lines="6 7 8 9 10"
import bqplot as bq
import numpy as np
import pandas as pd

names = ["AAPL", "GOOG", "AMZN", "MSFT", "META"]
ref_data = pd.DataFrame({
    "Name": ["Apple", "Alphabet", "Amazon", "Microsoft", "Meta"],
    "Price": [182.3, 141.5, 178.2, 375.0, 302.5],
    "Change": [1.2, -0.5, 3.1, -1.8, 0.7]
})

market_map = bq.MarketMap(
    names=names,
    ref_data=ref_data,
    tooltip_fields=["Name", "Price", "Change"],
    tooltip_formats=["", ".2f", "+.2f"]
)
market_map
```

#### Custom Tooltip Widget
For rich tooltips (e.g. an embedded mini-chart), attach any ipywidget to `tooltip_widget` and update it using the `on_hover` event:

```py hl_lines="10 11 12 13 14 15"
import bqplot as bq
import bqplot.pyplot as plt
import numpy as np
import ipywidgets as widgets

names = ["AAPL", "GOOG", "AMZN", "MSFT", "META"]
prices_over_time = {n: np.random.randn(30).cumsum() for n in names}

# Create a small line chart to use as the tooltip
tooltip_fig = plt.figure(layout={"width": "200px", "height": "120px"})
tooltip_line = plt.plot([], [])

def on_hover(name, event):
    tooltip_line.y = prices_over_time.get(event.get("data", {}).get("ref", name), [])

market_map = bq.MarketMap(
    names=names,
    tooltip_widget=tooltip_fig,
    on_hover=on_hover
)
market_map
```

### Example Notebooks
For detailed examples of the market map, refer to the following example notebooks

1. [Object Model](https://github.com/bqplot/bqplot/blob/master/examples/Marks/Object%20Model/Market_Map.ipynb)
