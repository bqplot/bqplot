import bqplot
from mock import Mock
import numpy as np
from bqplot.traits import _array_equal


def test_brush_selector():
    selector = bqplot.interacts.BrushSelector()

    mock = Mock()

    selector.observe(mock.on_selected, 'selected')
    selector.observe(mock.on_selected_x, 'selected_x')
    selector.observe(mock.on_selected_y, 'selected_y')
    
    # should evaluate to false
    assert not selector.selected_x
    assert not selector.selected_y
    assert not selector.selected

    # test getter
    selector.selected_x = [0, 1]
    mock.on_selected_x.assert_called_once()
    mock.on_selected_y.assert_not_called()
    mock.on_selected.assert_not_called()

    selector.selected_y = [1, 2]
    mock.on_selected_x.assert_called_once()
    mock.on_selected_y.assert_called_once()
    mock.on_selected.assert_called_once()
    assert selector.selected.tolist() == [[0, 1], [1, 2]]

    # test setter
    selector.selected = [[3, 4], [5, 6]]
    assert selector.selected_x.tolist() == [3, 5]
    assert selector.selected_y.tolist() == [4, 6]

    selector.selected_x = None
    assert selector.selected is None
    assert selector.selected_x is None
    assert selector.selected_y.tolist() == [4, 6]

    selector.selected_y = None
    assert selector.selected is None
    assert selector.selected_x is None
    assert selector.selected_y is None

    selector.selected = [[np.nan, 4], [5, 6]]
    assert _array_equal(selector.selected_x.tolist(), [np.nan, 5])
    assert _array_equal(selector.selected_y.tolist(), [4, 6])

    selector.selected = [[3, np.nan], [5, 6]]
    assert _array_equal(selector.selected_x.tolist(), [3, 5])
    assert _array_equal(selector.selected_y.tolist(), [np.nan, 6])

    selector.selected = [3, 4], [5, 6]
    assert _array_equal(selector.selected_x.tolist(), [3, 5])
    assert _array_equal(selector.selected_y.tolist(), [4, 6])
    selector.selected_x = [3, np.nan]
    assert _array_equal(selector.selected_x.tolist(), [3, np.nan])
    assert _array_equal(selector.selected_y.tolist(), [4, 6])
    selector.selected = [3, 4], [5, 6]
    assert _array_equal(selector.selected_x.tolist(), [3, 5])
    assert _array_equal(selector.selected_y.tolist(), [4, 6])

    selector.selected_y = [4, np.nan]
    assert _array_equal(selector.selected_x.tolist(), [3, 5])
    assert _array_equal(selector.selected_y.tolist(), [4, np.nan])
