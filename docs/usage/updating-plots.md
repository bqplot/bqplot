In `bqplot` almost all the attributes of plotting widgets (Figure, Mark, Scale, Axis) are implemented as __traitlets__, so the plots are responsive to data updates. All you need to do is update the attributes __in place__ without having to recreate the `figure` and `mark` objects. 

__Updating the attributes of `figure` and `marks` automatically triggers a re-draw of the plots on the front-end.__

Let's look at an example:

```py
import numpy as np
import bqplot.pyplot as plt

x = np.linspace(-10, 10, 100)
y = np.sin(x)

fig = plt.figure()
curve = plt.plot(x, y)
fig
```

#### Updating Single Data Attribute
Let's look at the correct (and incorrect) way of updating the plots:

!!! success "Correct"
    __Only__ update the `figure` and `mark` attributes like so:
    ```py
    curve.y = np.cos(x)
    fig.title = "Cosine"
    ```
!!! failure "Incorrect"
    __Do not__ create `figure` and `mark` objects again to update the plots!
    ```py
    fig = plt.figure(title="Cosine")
    curve = plt.plot(x, np.cos(y))
    ```

#### Updating Multiple Data Attributes
We can update multiple attributes of the `mark` object simultaneously by using the `hold_sync` method like so. (This makes only one round trip from the python kernel to the front end)
!!! success "Efficient"
    Only __one__ network trip
    ```py
    # use the hold_sync() context manager
    with curve.hold_sync():
        curve.x = np.linspace(-20, 20, 200)
        curve.y = np.cos(x)
    ```

!!! failure "Inefficient"
    Makes __two__ network trips
    ```py
    curve.x = np.linspace(-20, 20, 200)
    curve.y = np.cos(x)
    ```

#### Animations
We can enable __animated__ data updates by passing in `animation_duration` (in milliseconds) to the figure. Let's look at an example to update a scatter plot

```py hl_lines="3"
x, y = np.random.rand(2, 10)

fig = plt.figure(animation_duration=1000) # 1000 ms or 1s
scat = plt.scatter(x=x, y=y)
fig
```

```py
# update the scatter plot to use animations (1s duration)
with scat.hold_sync():
    scat.x, scat.y = np.random.rand(2, 10)
```