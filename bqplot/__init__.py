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

from .figure import *  # noqa
from .axes import *  # noqa
from .marks import *  # noqa
from bqscales import *  # noqa
from .toolbar import *  # noqa
from .plotting_widgets import *  # noqa
from .default_tooltip import *  # noqa
from ._version import version_info, __version__  # noqa


def _prefix():
    import sys
    from pathlib import Path
    prefix = sys.prefix
    here = Path(__file__).parent
    # for when in dev mode
    if (here.parent / 'share/jupyter/nbextensions/bqplot').parent.exists():
        prefix = here.parent
    return prefix


def _jupyter_labextension_paths():
    return [{
        'src': f'{_prefix()}/share/jupyter/labextensions/bqplot/',
        'dest': 'bqplot',
    }]


def _jupyter_nbextension_paths():
    return [{
        'section': 'notebook',
        'src': f'{_prefix()}/share/jupyter/nbextensions/bqplot/',
        'dest': 'bqplot',
        'require': 'bqplot/extension'
    }]
