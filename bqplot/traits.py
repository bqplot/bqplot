# Copyright 2015 Bloomberg Finance L.P.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

r"""

============
Traits Types
============

.. currentmodule:: bqplot.traits

.. autosummary::
   :toctree: _generate/

   Date
"""

from traitlets import TraitError, TraitType

import numpy as np
import pandas as pd
import warnings
import datetime as dt
import six

# Date


def date_to_json(value, obj):
    if value is None:
        return value
    else:
        # Dropping microseconds and only keeping milliseconds to conform
        # with JavaScript's Data.toJSON's behavior - and prevent bouncing
        # back updates from the front-end.
        return value.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'


def date_from_json(value, obj):
    if value:
        return dt.datetime.strptime(value.rstrip('Z'), '%Y-%m-%dT%H:%M:%S.%f')
    else:
        return value


date_serialization = dict(to_json=date_to_json, from_json=date_from_json)


class Date(TraitType):

    """
    A datetime trait type.

    Converts the passed date into a string format that can be used to
    construct a JavaScript datetime.
    """

    def validate(self, obj, value):
        try:
            if isinstance(value, dt.datetime):
                return value
            if isinstance(value, dt.date):
                return dt.datetime(value.year, value.month, value.day)
            if np.issubdtype(np.dtype(value), np.datetime64):
                # TODO: Fix this. Right now, we have to limit the precision
                # of time to microseconds because np.datetime64.astype(datetime)
                # returns date values only for precision <= 'us'
                value_truncated = np.datetime64(value, 'us')
                return value_truncated.astype(dt.datetime)
        except Exception:
            self.error(obj, value)
        self.error(obj, value)

    def __init__(self, default_value=dt.datetime.today(), **kwargs):
        super(Date, self).__init__(default_value=default_value, **kwargs)
        self.tag(**date_serialization)


def convert_to_date(array, fmt='%m-%d-%Y'):
    # If array is a np.ndarray with type == np.datetime64, the array can be
    # returned as such. If it is an np.ndarray of dtype 'object' then conversion
    # to string is tried according to the fmt parameter.

    if isinstance(array, np.ndarray) and np.issubdtype(array.dtype, np.datetime64):
        # no need to perform any conversion in this case
        return array
    elif isinstance(array, list) or (isinstance(array, np.ndarray) and array.dtype == 'object'):
        return_value = []
        # Pandas to_datetime handles all the cases where the passed in
        # data could be any of the combinations of
        #            [list, nparray] X [python_datetime, np.datetime]
        # Because of the coerce=True flag, any non-compatible datetime type
        # will be converted to pd.NaT. By this comparison, we can figure
        # out if it is date castable or not.
        if len(np.shape(array)) == 2:
            for elem in array:
                temp_val = pd.to_datetime(
                    elem, errors='coerce', infer_datetime_format=True)
                temp_val = elem if isinstance(temp_val[0], type(pd.NaT)) else temp_val
                return_value.append(temp_val)
        elif isinstance(array, list):
            temp_val = pd.to_datetime(
                array, errors='coerce', infer_datetime_format=True)
            return_value = array if isinstance(temp_val[0], type(pd.NaT)) else temp_val
        else:
            temp_val = pd.to_datetime(
                array, errors='coerce', infer_datetime_format=True)
            return_value = array if isinstance(temp_val[0], type(pd.NaT)) else temp_val
        return return_value
    elif isinstance(array, np.ndarray):
        warnings.warn("Array could not be converted into a date")
        return array


def array_from_json(value, obj=None):
    if value is not None:
        # this will accept regular json data, like an array of values, which can be useful it you want
        # to link bqplot to other libraries that use that
        if isinstance(value, list):
            if len(value) > 0 and (isinstance(value[0], dict) and 'value' in value[0]):
                subarrays = [array_from_json(k) for k in value]
                if len(subarrays) > 0:
                    expected_length = len(subarrays[0])
                    # if a 'ragged' array, we should explicitly pass dtype=object
                    if any(len(k) != expected_length for k in subarrays[1:]):
                        return np.array(subarrays, dtype=object)
                return np.array(subarrays)
            elif len(value) > 0 and isinstance(value[0], list):
                return np.array(value, dtype=object)
            else:
                return np.array(value)
        elif 'value' in value:
            try:
                ar = np.frombuffer(value['value'], dtype=value['dtype']).reshape(value['shape'])
            except AttributeError:
                # in some python27/numpy versions it does not like the memoryview
                # we go the .tobytes() route, but since i'm not 100% sure memory copying
                # is happening or not, we one take this path if the above fails.
                ar = np.frombuffer(value['value'].tobytes(), dtype=value['dtype']).reshape(value['shape'])
            if value.get('type') == 'date':
                assert value['dtype'] == 'float64'
                ar = ar.astype('datetime64[ms]')
            return ar


def array_to_json(ar, obj=None, force_contiguous=True):
    if ar is None:
        return None

    array_type = None

    if ar.dtype.kind == 'O':
        # Try to serialize the array of objects
        is_string = np.vectorize(lambda x: isinstance(x, six.string_types))
        is_timestamp = np.vectorize(lambda x: isinstance(x, pd.Timestamp))
        is_array_like = np.vectorize(lambda x: isinstance(x, (list, np.ndarray)))

        if np.all(is_timestamp(ar)):
            ar = ar.astype('datetime64[ms]').astype(np.float64)
            array_type = 'date'
        elif np.all(is_string(ar)):
            ar = ar.astype('U')
        elif np.all(is_array_like(ar)):
            return [array_to_json(np.array(row), obj, force_contiguous) for row in ar]
        else:
            raise ValueError("Unsupported dtype object")

    if ar.dtype.kind in ['S', 'U']:  # strings to as plain json
        return ar.tolist()

    if ar.dtype.kind == 'M':
        # since there is no support for int64, we'll use float64 but as ms
        # resolution, since that is the resolution the js Date object understands
        ar = ar.astype('datetime64[ms]').astype(np.float64)
        array_type = 'date'

    if ar.dtype.kind not in ['u', 'i', 'f']:  # ints and floats, and datetime
        raise ValueError("Unsupported dtype: %s" % (ar.dtype))

    if ar.dtype == np.int64:  # JS does not support int64
        ar = ar.astype(np.int32)

    if force_contiguous and not ar.flags["C_CONTIGUOUS"]:  # make sure it's contiguous
        ar = np.ascontiguousarray(ar)

    if not ar.dtype.isnative:
        dtype = ar.dtype.newbyteorder()
        ar = ar.astype(dtype)

    return {'value': memoryview(ar), 'dtype': str(ar.dtype), 'shape': ar.shape, 'type': array_type}


array_serialization = dict(to_json=array_to_json, from_json=array_from_json)


def array_squeeze(trait, value):
    if len(value.shape) > 1:
        return np.squeeze(value)
    else:
        return value


def array_dimension_bounds(mindim=0, maxdim=np.inf):
    def validator(trait, value):
        dim = len(value.shape)
        if dim < mindim or dim > maxdim:
            raise TraitError('Dimension mismatch for trait %s of class %s: expected an \
                array of dimension comprised in interval [%s, %s] and got an array of shape %s' % (
                trait.name, trait.this_class, mindim, maxdim, value.shape))
        return value
    return validator


def array_supported_kinds(kinds='biufMSUO'):
    def validator(trait, value):
        if value.dtype.kind not in kinds:
            raise TraitError('Array type not supported for trait %s of class %s: expected a \
                array of kind in list %r and got an array of type %s (kind %s)' % (
                trait.name, trait.this_class, list(kinds), value.dtype, value.dtype.kind))
        return value
    return validator


# DataFrame

def dataframe_from_json(value, obj):
    if value is None:
        return None
    else:
        return pd.DataFrame(value)


def dataframe_to_json(df, obj):
    if df is None:
        return None
    else:
        # Replacing NaNs with None as it's not valid JSON
        cleandf = df.fillna(np.nan).replace([np.nan], [None])
        return cleandf.to_dict(orient='records')


dataframe_serialization = dict(to_json=dataframe_to_json, from_json=dataframe_from_json)

# dataframe validators


def dataframe_warn_indexname(trait, value):
    if value.index.name is not None:
        warnings.warn("The '%s' dataframe trait of the %s instance disregards the index name" % (trait.name, trait.this_class))
        value = value.reset_index()
    return value

# Series


def series_from_json(value, obj):
    return pd.Series(value)


def series_to_json(value, obj):
    return value.to_dict()


series_serialization = dict(to_json=series_to_json, from_json=series_from_json)


def _array_equal(a, b):
    """Really tests if arrays are equal, where nan == nan == True"""
    try:
        return np.allclose(a, b, 0, 0, equal_nan=True)
    except (TypeError, ValueError):
        return False
