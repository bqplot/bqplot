__Marks__ are the core plotting components (e.g. lines, bars, pie, scatter) etc. All `Marks` extend the [`Mark`](../../api/marks/#bqplot.marks.Mark) class. 
__Marks__ take one or more _data_ attributes and _style_ attributes (styling, colors etc.). Most of these attributes are eventful (instances of __traitlets__). 

For each data attribute a corresponding [`Scale`](../../api/scales.md) object needs to passed when constructing `Mark` objects, like so:

```py title="Lines mark using Object Model"
import bqplot as bq
import numpy as np

# data attributes
x = np.linspace(-10, 10, 100)
y = np.sin(x)

# scales for each data attribute
xs = bq.LinearScale()
ys = bq.LinearScale()

line = bq.Lines(x, y, scales={"x": xs, "y": ys})
```

A preferred approach is to use [__pyplot__](../pyplot.md) which sets meaningful defaults when constructing marks. __Most of the time you don't need to create scales explicitly__. Let's look at an example:

```py title="Lines mark using pyplot"
import bqplot as bq
import numpy as np

# data attributes
x = np.linspace(-10, 10, 100)
y = np.sin(x)

line = plt.plot(x, y)
```

Take a look at specific mark documents for more details on customizing/rendering various marks in `bqplot`