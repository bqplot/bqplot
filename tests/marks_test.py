import bqplot
import numpy as np

def test_scatter(figure):
    x = np.arange(10, dtype=np.float64)
    y = (x**2).astype(np.int32)
    scatter = bqplot.Scatter(x=x, y=y)
    assert scatter.x.dtype == np.float64
    assert scatter.y.dtype == np.int32

    assert scatter.x.shape == (10,)
    assert scatter.y.shape == (10,)
