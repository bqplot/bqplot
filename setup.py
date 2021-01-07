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

from setuptools import setup, find_packages

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
from distutils import log

here = os.path.dirname(os.path.abspath(__file__))

# due to https://github.com/jupyterlab/jupyterlab/blob/136d2ec216ebfc429a696e6ee75fee5f8ead73e2/jupyterlab/federated_labextensions.py#L347
# we should not print out anything, otherwise setup.py --name gives noise
# log.set_verbosity(log.ERROR)
# log.info('setup.py entered')
# log.info('$PATH=%s' % os.environ['PATH'])

name = 'bqplot'

LONG_DESCRIPTION = """
BQPlot
======

Plotting system for the Jupyter notebook based on the interactive Jupyter widgets.

Installation
============

.. code-block:: bash

    pip install bqplot
    jupyter nbextension enable --py bqplot


Usage
=====

.. code-block:: python

    from bqplot import pyplot as plt
    import numpy as np

    plt.figure(1)
    n = 200
    x = np.linspace(0.0, 10.0, n)
    y = np.cumsum(np.random.randn(n))
    plt.plot(x,y, axes_options={'y': {'grid_lines': 'dashed'}})
    plt.show()
"""

# Get bqplot version
version = get_version(pjoin(name, '_version.py'))

js_dir = pjoin(here, 'js')

# Representative files that should exist after a successful build
jstargets = [
    pjoin('share', 'jupyter', 'nbextensions', 'bqplot', 'index.js'),
    pjoin('share', 'jupyter', 'labextensions', 'bqplot', 'package.json'),
]

data_files_spec = [
    ('share/jupyter/nbextensions/bqplot', 'share/jupyter/nbextensions/bqplot', '*.js'),
    ('share/jupyter/labextensions/bqplot/', 'share/jupyter/labextensions/bqplot/', '**'),
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


setup_args = dict(
    name=name,
    version=version,
    description='Interactive plotting for the Jupyter notebook, using d3.js and ipywidgets.',
    long_description=LONG_DESCRIPTION,
    license='Apache',
    author='The BQplot Development Team',
    url='https://github.com/bloomberg/bqplot',
    include_package_data=True,
    cmdclass=cmdclass,
    install_requires=[
        'ipywidgets>=7.5.0',
        'traitlets>=4.3.0',
        'traittypes>=0.0.6',
        'numpy>=1.10.4',
        'pandas'],
    packages=find_packages(exclude=["tests"]),
    zip_safe=False,
    keywords=[
        'ipython',
        'jupyter',
        'widgets',
        'graphics',
        'plotting',
        'd3',
    ],
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'Intended Audience :: Science/Research',
        'Topic :: Multimedia :: Graphics',
        'License :: OSI Approved :: Apache Software License',
        'Programming Language :: Python :: 2',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.3',
        'Programming Language :: Python :: 3.4',
        'Programming Language :: Python :: 3.5',
    ],
)

setup(**setup_args)
