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

=============
Custom Traits
=============

.. currentmodule:: bqplot.traits

.. autosummary::
   :toctree: generate/

   BoundedFloat
   BoundedInt
   CInstance
   Date
   NdArray
   PandasDataFrame
   PandasSeries
   isrgbcolor
   safe_directional_link
   safe_dlink
"""

from IPython.utils.traitlets import Instance, Int, Float, TraitError, TraitType

import numpy as np
import pandas as pd
import contextlib


class safe_directional_link(object):

    """Link the trait of a source object with traits of target objects.

    Parameters
    ----------
    source : pair of object, name
    targets : pairs of objects/attributes

    Examples
    --------

    # >>> c = directional_link((src, 'value'), (tgt1, 'value'),
    # (tgt2, 'value'))
    # >>> src.value = 5  # updates target objects
    # >>> tgt1.value = 6 # does not update other objects
    """
    updating = False

    def __init__(self, source, *targets, **kwargs):
        self.source = source
        self.targets = targets
        self.status = kwargs.get('status')
        self.readout = kwargs.get('readout')

        # Update current value
        src_attr_value = getattr(source[0], source[1])
        if self.status is not None:
            setattr(self.status[0], self.status[1], True)
        if self.readout is not None:
            setattr(self.readout[0], self.readout[1], "")
        try:
            for obj, attr in targets:
                setattr(obj, attr, src_attr_value)
        except TraitError as e:
            if self.status is not None:
                setattr(self.status[0], self.status[1], False)
            if self.readout is not None:
                setattr(self.readout[0], self.readout[1], e.message)
        finally:
            self.source[0].on_trait_change(self._update, self.source[1])

    @contextlib.contextmanager
    def _busy_updating(self):
        self.updating = True
        try:
            yield
        finally:
            self.updating = False

    def _update(self, name, old, new):
        if self.updating:
            return
        with self._busy_updating():
            if self.status is not None:
                setattr(self.status[0], self.status[1], True)
            if self.readout is not None:
                setattr(self.readout[0], self.readout[1], "")
            try:
                for obj, attr in self.targets:
                    setattr(obj, attr, new)
            except TraitError as e:
                if self.status is not None:
                    setattr(self.status[0], self.status[1], False)
                if self.readout is not None:
                    setattr(self.readout[0], self.readout[1], e.message)

    def unlink(self):
        self.source[0].on_trait_change(self._update, self.source[1],
                                       remove=True)
        self.source = None
        self.targets = []


def safe_dlink(source, *targets, **kwargs):
    """Shorter helper function returning a directional_link object"""
    return safe_directional_link(source, *targets, **kwargs)


class BoundedInt(Int):

    """
    A bounded integer trait
    """

    def __init__(self, default_value=0, **metadata):
        self.min = metadata.setdefault('min', 0)
        self.max = metadata.setdefault('max',  float('inf'))
        super(BoundedInt, self).__init__(default_value, **metadata)

    def info(self):
        return "an int between %s and %s" % (self.min, self.max)

    def validate(self, obj, value):
        if isinstance(value, int) and (value >= self.min) and (value <= self.max):
            return value
        self.error(obj, value)


class BoundedFloat(Float):

    """
    A bounded float trait
    """

    def __init__(self, default_value=0, **metadata):
        self.min = metadata.setdefault('min', 0)
        self.max = metadata.setdefault('max',  float('inf'))
        super(BoundedFloat, self).__init__(default_value, **metadata)

    def info(self):
        return "a float between %s and %s" % (self.min, self.max)

    def validate(self, obj, value):
        if isinstance(value, (float, int)) and (value >= self.min) and (value <= self.max):
            if isinstance(value, float):
                return value
            else:
                return float(value)
        self.error(obj, value)


# Numpy and Pandas Traitlets
class CInstance(Instance):

    def _cast(self, value):
        return self.klass(value)

    def validate(self, obj, value):
        if isinstance(value, self.klass):
            return value
        else:
            return self._cast(value)


from datetime import date as dt
import datetime as dtime


class Date(TraitType):

    """
    A date trait. Converts the passed date into a string format
    easily understandable by javasscript
    """
    klass = dtime.datetime

    def validate(self, obj, value):
        try:
            if(isinstance(value, dt)
               or np.issubdtype(np.dtype(value), np.datetime64)):
                return value
        except Exception:
            self.error(obj, value)
        self.error(obj, value)

    def __init__(self, default_value=dt.today(), **kwargs):
        args = (default_value,)
        self.default_value = default_value
        kwargs.setdefault('to_json', Date.to_json)
        kwargs.setdefault('from_json', Date.from_json)
        super(Date, self).__init__(args=args, **kwargs)

    @staticmethod
    def to_json(value):
        if value is None:
            return value
        # Convert to a numpy datetime first. Then the string representation
        # gives the desired format
        if(isinstance(value, dt)):
            value = np.datetime64(value)
        return str(value)

    @staticmethod
    def from_json(value):
        return np.datetime64(value)


class NdArray(CInstance):
    klass = np.ndarray
    info_text = 'type aware numpy array'

    @staticmethod
    def _to_json(a):
        if a is not None:
            if a.dtype is float:
                # replace nan with None
                a = np.where(np.isnan(a), None, a)
                dtype = a.dtype
            elif a.dtype in (int, np.int64):
                a = a.astype('float')
                dtype = 'float'
            elif np.issubdtype(a.dtype, np.datetime64):
                a = a.astype('string')
                dtype = 'date'
            else:
                dtype = a.dtype
            return {'values': a.tolist(), 'type': dtype}
        else:
            return {'values': a, 'type': None}

    def _set_value(self, value):
        if value is None or len(value) == 0:
            return np.asarray(value)
        return_value = []
        if (isinstance(value, list) or
           (isinstance(value, np.ndarray) and value.dtype == 'object')):
            # Pandas to_datetime handles all the cases where the passed in
            # data could be any of the combinations of
            #            [list, nparray] X [python_datetime, np.datetime]
            # Because of the coerce=True flag, any non-compatible datetime type
            # will be converted to pd.NaT. By this comparision, we can figure
            # out if it is date castable or not.
            if(len(np.shape(value)) == 2):
                for elem in value:
                    temp_val = pd.to_datetime(elem, coerce=True, box=False,
                                              infer_datetime_format=True)
                    temp_val = elem if (temp_val[0] == np.datetime64('NaT')) else temp_val
                    return_value.append(temp_val)
            elif(isinstance(value, list)):
                temp_val = pd.to_datetime(value, coerce=True, box=False,
                                          infer_datetime_format=True)
                return_value = value if (temp_val[0] == np.datetime64('NaT')) else temp_val
            else:
                temp_val = pd.to_datetime(value, coerce=True, box=False,
                                          infer_datetime_format=True)
                temp_val = value if (temp_val[0] == np.datetime64('NaT')) else temp_val
                return_value = temp_val
        else:
            return_value = value
        return np.asarray(return_value)

    def validate(self, obj, value):
        ## If it is an object, I have to check if it can be cast into a date
        if (not isinstance(value, self.klass) or value.dtype == 'object'):
            value = self._cast(value)
        min_dim = self._metadata.get('min_dim', 0)
        max_dim = self._metadata.get('max_dim', np.inf)
        dim = 0 if value is None else len(np.shape(value))
        if dim > max_dim or dim < min_dim:
            raise TraitError("Dimension mismatch")
        return value

    @staticmethod
    def _asarray(value):
        if value is not None:
            array_dtype = (np.datetime64 if (value.get('type') == 'date')
                           else object)
            return np.asarray(value['values'], dtype=array_dtype)

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('from_json', NdArray._asarray)
        kwargs.setdefault('to_json', NdArray._to_json)
        kwargs.setdefault('args', (0,))
        super(NdArray, self).__init__(*args, **kwargs)

    _cast = _set_value


class PandasDataFrame(Instance):

    """
    traitlet for pandas data frame. json representation is array of dicts
    which is amenable for consumption by JavaScript. also note that index name
    is ignored and when deserializing will use the 'index' attribute as an
    index for the df. This means if the data frame has a column called 'index'
    then there's a problem
    """
    klass = pd.DataFrame
    info_text = 'a pandas DataFrame'

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('from_json', self._from_json)
        kwargs.setdefault('to_json', self._to_json)
        kwargs.setdefault('args', ())
        super(PandasDataFrame, self).__init__(*args, **kwargs)

    def _from_json(self, value):
        if value is not None:
            df = pd.DataFrame(value)
            df = df.set_index('index')
            df.index.name = None
        else:
            df = pd.DataFrame()
        return df

    def _to_json(self, df):
        if df is not None:
            return df.reset_index().to_dict(outtype='records')
        else:
            return []

    def validate(self, obj, value):
        value = super(PandasDataFrame, self).validate(obj, value)
        if self._metadata.get('lexsort'):
            if isinstance(value.columns, pd.MultiIndex):
                value = value.sortlevel(0, axis=1)
        return value

    _cast = _from_json


class PandasSeries(Instance):

    """
    traitlet for pandas series. json representation is array of dicts
    which is amenable for consumption by JavaScript. also note that index name
    is ignored and when deserializing will use the 'index' attribute as an
    index for the df. This means if the data frame has a column called 'index'.
    then there's a problem.
    """
    klass = pd.Series
    info_text = 'a pandas series'

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('from_json', self._from_json)
        kwargs.setdefault('to_json', self._to_json)
        kwargs.setdefault('args', ())
        super(PandasSeries, self).__init__(*args, **kwargs)

    def _from_json(self, value):
        return pd.Series(value)

    def _to_json(self, s):
        return s.to_dict()
