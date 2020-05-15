import pytest
import bqplot

@pytest.fixture
def scale_x():
    return bqplot.LinearScale(min=0, max=1, allow_padding=False)

@pytest.fixture
def scale_ordinal():
    return bqplot.OrdinalScale(allow_padding=False)

@pytest.fixture
def scale_y():
    return bqplot.LinearScale(min=2, max=3, allow_padding=False)

@pytest.fixture
def scales(scale_x, scale_y):
    return {'x': scale_x, 'y': scale_y}

@pytest.fixture
def figure(scale_x, scale_y):
    return bqplot.Figure(scale_x=scale_x, scale_y=scale_y)

# @pytest.fixture
# def scatter(scale_x, scale_y):
#     bqplot.Scatter(scale_x=scale_x, scale_y=scale_y)

