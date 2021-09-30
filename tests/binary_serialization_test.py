import bqplot
import numpy as np
import pandas as pd
from bqplot.traits import array_to_json, array_from_json
import pytest


def test_binary_serialize_1d(figure):
    x = np.arange(10, dtype=np.float64)
    y = (x**2).astype(np.int32)
    scatter = bqplot.Scatter(x=x, y=y)

    state = scatter.get_state()
    assert state['x']['dtype'] == 'float64'
    assert state['y']['dtype'] == 'int32'

    assert state['x']['value'] == memoryview(x)
    assert state['y']['value'] == memoryview(y)

    assert state['x']['shape'] == (10,)
    assert state['y']['shape'] == (10,)

    scatter2 = bqplot.Scatter()
    scatter2.set_state(state)

    assert scatter.x.dtype == np.float64
    assert scatter.y.dtype == np.int32

    assert scatter.x.shape == (10,)
    assert scatter.y.shape == (10,)

    assert scatter2.x.tolist() == x.tolist()
    assert scatter2.y.tolist() == y.tolist()


def test_binary_serialize_datetime():
    x = np.arange('2005-02-25', '2005-03', dtype='datetime64[D]')
    x_ms = np.array([1109289600000, 1109376000000, 1109462400000, 1109548800000], dtype=np.int64)
    scatter = bqplot.Scatter(x=x)

    state = scatter.get_state()
    assert state['x']['dtype'] == 'float64'
    assert np.array(state['x']['value'], dtype=np.float64).astype(np.int64).tolist() == x_ms.tolist()

    x = np.array([pd.Timestamp('2005-02-25'), pd.Timestamp('2005-02-26'), pd.Timestamp('2005-02-27'), pd.Timestamp('2005-02-28')])
    scatter = bqplot.Scatter(x=x)

    state = scatter.get_state()
    assert state['x']['dtype'] == 'float64'
    assert np.array(state['x']['value'], dtype=np.float64).astype(np.int64).tolist() == x_ms.tolist()


    # currently a roundtrip does not converse the datetime64 type
    scatter2 = bqplot.Scatter()
    scatter2.set_state(state)

    assert scatter2.x.dtype.kind == 'M'
    assert scatter2.x.astype(np.int64).tolist() == x_ms.tolist()


def test_binary_serialize_text():
    # string do not get serialized in binary (since numpy uses utf32, and js/browsers do not support that)
    text = np.array(['aap', 'noot', 'mies'])
    label = bqplot.Label(text=text)

    state = label.get_state()
    assert state['text'] == ['aap', 'noot', 'mies']


    # currently a roundtrip does not converse the datetime64 type
    label2 = bqplot.Label()
    label2.set_state(state)

    assert label2.text.tolist() == label.text.tolist()


def test_dtype_with_str():
    # dtype object is not supported
    text = np.array(['foo', None, 'bar'])
    assert text.dtype == object
    with pytest.raises(ValueError, match='.*Unsupported dtype object*'), pytest.warns(UserWarning):
        array_to_json(text)
    # but if they contain all strings, it should convert them.
    # This is for backward compatibility of expecting pandas dataframe
    # string columns to work (which are of dtype==np.object)
    text[1] = 'foobar'
    assert array_to_json(text) == ['foo', 'foobar', 'bar']


def test_serialize_nested_list():
    data = np.array([
        [0, 1, 2, 3, 4, 5, 6],
        [0, 1, 2, 2, 3],
        [0, 1, 2, 3, 4, 5, 6, 7],
    ], dtype=object)

    serialized_data = array_to_json(data)

    assert len(serialized_data) == 3

    assert serialized_data[0]['dtype'] == 'int32'
    assert serialized_data[0]['value'] == memoryview(np.array(data[0]))

    assert serialized_data[1]['dtype'] == 'int32'
    assert serialized_data[1]['value'] == memoryview(np.array(data[1]))

    assert serialized_data[2]['dtype'] == 'int32'
    assert serialized_data[2]['value'] == memoryview(np.array(data[2]))

    deserialized_data = array_from_json(serialized_data)

    for el, deserialized_el in zip(data, deserialized_data):
        assert np.all(el == deserialized_el)

    data = np.array([
        [0, 1, 2, 3, 4, 5, 6],
        np.array([0, 1, 2, 2, 3]),
        [0, 1, 2, 3]
    ], dtype=object)

    serialized_data = array_to_json(data)

    assert len(serialized_data) == 3

    assert serialized_data[0]['dtype'] == 'int32'
    assert serialized_data[0]['value'] == memoryview(np.array(data[0]))

    assert serialized_data[1]['dtype'] == 'int32'
    assert serialized_data[1]['value'] == memoryview(np.array(data[1]))

    assert serialized_data[2]['dtype'] == 'int32'
    assert serialized_data[2]['value'] == memoryview(np.array(data[2]))

    deserialized_data = array_from_json(serialized_data)

    for el, deserialized_el in zip(data, deserialized_data):
        assert np.all(el == deserialized_el)

    data = np.array([
        ['Hello', 'Hallo'],
        ['Coucou', 'Hi', 'Ciao']
    ], dtype=object)

    serialized_data = array_to_json(data)

    assert len(serialized_data) == 2

    assert serialized_data[0] == ['Hello', 'Hallo']
    assert serialized_data[1] == ['Coucou', 'Hi', 'Ciao']

    deserialized_data = array_from_json(serialized_data)

    assert np.all(data == deserialized_data)
