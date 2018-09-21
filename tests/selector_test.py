import bqplot

def test_brush_selector():
    selector = bqplot.interacts.BrushSelector()
    
    # should evaluate to false
    assert not selector.selected_x
    assert not selector.selected_y
    assert not selector.selected

    # test getter
    selector.selected_x = [0, 1]
    selector.selected_y = [1, 2]
    assert selector.selected.tolist() == [[0, 1], [1, 2]]

    # test setter
    selector.selected = [[3, 4], [5, 6]]
    assert selector.selected_x.tolist() == [3, 5]
    assert selector.selected_y.tolist() == [4, 6]
