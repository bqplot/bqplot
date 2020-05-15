import bqplot
import numpy as np
import pytest


def test_scatter(figure):
    x = np.arange(10, dtype=np.float64)
    y = (x**2).astype(np.int32)
    scatter = bqplot.Scatter(x=x, y=y)
    assert scatter.x.dtype == np.float64
    assert scatter.y.dtype == np.int32

    assert scatter.x.shape == (10,)
    assert scatter.y.shape == (10,)


def test_lines(scales):
    # Create a Line chart with data of multiple shapes should work with binary serialization
    lines = bqplot.Lines(x=[[0, 1], [0, 1, 2]], y=[[0, 1], [1, 0, -1]], scales=scales)

    lines = bqplot.Lines(x=[[0, 1], [0, 1]], y=[[0, 1], [1, 0]], scales=scales)
    state = lines.get_state()

    lines2 = bqplot.Lines(scales=scales)
    lines2.set_state(state)
    assert lines.x[0][0] == 0
    assert lines.x[0][1] == 1
    assert lines.x[1][1] == 1

def test_lines_ordinal(scale_ordinal, scale_y):
    scales = {'x': scale_ordinal, 'y': scale_y}
    lines = bqplot.Lines(x=list('ABC'), y=[1, 2, 3], scales=scales)


def test_bars(scales):
    # Create a Bar chart with data of multiple shapes should work with binary serialization
    bars = bqplot.Bars(x=[0, 1], y=[[0, 1], [1, 0, -1]], scales=scales)

    bars = bqplot.Bars(x=[0, 1], y=[[1, 2], [3, 4]], scales=scales)
    state = bars.get_state()

    bars2 = bqplot.Bars(scales=scales)
    bars2.set_state(state)
    assert bars.x[0] == 0
    assert bars.x[1] == 1
    assert bars.y[0][0] == 1
    assert bars.y[0][1] == 2
    assert bars.y[1][0] == 3
    assert bars.y[1][1] == 4
