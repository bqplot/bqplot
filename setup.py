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

from __future__ import print_function

from setuptools import setup

from jupyter_packaging import (
    create_cmdclass,
    install_npm,
    ensure_targets,
    combine_commands,
    get_version,
    skip_if_exists,
)

import os
from os.path import join as pjoin

here = os.path.dirname(os.path.abspath(__file__))
version = get_version(pjoin('bqplot', '_version.py'))

js_dir = pjoin(here, 'js')

# Representative files that should exist after a successful build
jstargets = [
    pjoin('share', 'jupyter', 'nbextensions', 'bqplot', 'index.js'),
    pjoin('share', 'jupyter', 'labextensions', 'bqplot', 'package.json'),
]

data_files_spec = [
    ('share/jupyter/nbextensions/bqplot', 'share/jupyter/nbextensions/bqplot', '*.js'),
    ('share/jupyter/labextensions/bqplot/', 'share/jupyter/labextensions/bqplot/', '**'),
    ('share/jupyter/labextensions/bqplot/', here, 'install.json'),
    ('etc/jupyter/nbconfig/notebook.d', 'etc/jupyter/nbconfig/notebook.d', 'bqplot.json'),
]

js_command = combine_commands(
    install_npm(js_dir, build_dir='share/jupyter/', source_dir='js/src', build_cmd='build'), ensure_targets(jstargets),
)

# Adding "map_data" as package_data manually, this should not be needed because it's already
# specified in MANIFEST and include_package_data=True. This might be a bug in jupyter-packaging?
cmdclass = create_cmdclass('jsdeps', data_files_spec=data_files_spec, package_data_spec={"bqplot": ["map_data/*.json"]})
is_repo = os.path.exists(os.path.join(here, '.git'))
if is_repo:
    cmdclass['jsdeps'] = js_command
else:
    cmdclass['jsdeps'] = skip_if_exists(jstargets, js_command)

setup(version=version, cmdclass=cmdclass)
