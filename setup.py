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
from setuptools import setup, find_packages, Command
from setuptools.command.build_py import build_py
from setuptools.command.sdist import sdist
from subprocess import check_call
import os
import sys
import platform

here = os.path.abspath(os.path.dirname(__file__))

LONG_DESCRIPTION = """
BQPlot
======

Plotting system for the Jupyter notebook based on the interactive HTML.

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

try:
    from shutil import which
except ImportError:
    # The which() function is copied from Python 3.4.3
    # PSF license version 2 (Python Software Foundation License Version 2)
    def which(cmd, mode=os.F_OK | os.X_OK, path=None):
        """Given a command, mode, and a PATH string, return the path which
        conforms to the given mode on the PATH, or None if there is no such
        file.

        `mode` defaults to os.F_OK | os.X_OK. `path` defaults to the result
        of os.environ.get("PATH"), or can be overridden with a custom search
        path.

        """
        # Check that a given file can be accessed with the correct mode.
        # Additionally check that `file` is not a directory, as on Windows
        # directories pass the os.access check.
        def _access_check(fn, mode):
            return (os.path.exists(fn) and os.access(fn, mode)
                    and not os.path.isdir(fn))

        # If we're given a path with a directory part, look it up directly rather
        # than referring to PATH directories. This includes checking relative to the
        # current directory, e.g. ./script
        if os.path.dirname(cmd):
            if _access_check(cmd, mode):
                return cmd
            return None

        if path is None:
            path = os.environ.get("PATH", os.defpath)
        if not path:
            return None
        path = path.split(os.pathsep)

        if sys.platform == "win32":
            # The current directory takes precedence on Windows.
            if not os.curdir in path:
                path.insert(0, os.curdir)

            # PATHEXT is necessary to check on Windows.
            pathext = os.environ.get("PATHEXT", "").split(os.pathsep)
            # See if the given file matches any of the expected path extensions.
            # This will allow us to short circuit when given "python.exe".
            # If it does match, only test that one, otherwise we have to try
            # others.
            if any(cmd.lower().endswith(ext.lower()) for ext in pathext):
                files = [cmd]
            else:
                files = [cmd + ext for ext in pathext]
        else:
            # On other platforms you don't have things like PATHEXT to tell you
            # what file suffixes are executable, so just pass on cmd as-is.
            files = [cmd]

        seen = set()
        for dir in path:
            normdir = os.path.normcase(dir)
            if not normdir in seen:
                seen.add(normdir)
                for thefile in files:
                    name = os.path.join(dir, thefile)
                    if _access_check(name, mode):
                        return name
        return None


class Bower(Command):
    description = "fetch static components with bower"

    user_options = []

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def get_inputs(self):
        return []

    def get_outputs(self):
        return []

    def run(self):
        try:
            if which('bower'):
                if platform.system() == 'Windows':
                    cmd = 'bower.cmd'
                else:
                    cmd = 'bower'
                check_call(
                    [cmd, 'install', '--allow-root', '--config.interactive=false'],
                    cwd=here,
                    env=os.environ.copy(),
                )

        except OSError as e:
            print("Failed to run bower: %s" % e, file=sys.stderr)
            raise


class custom_build_py(build_py):

    def run(self):
        self.run_command('js')
        return build_py.run(self)


class custom_sdist(sdist):

    def run(self):
        self.run_command('js')
        return sdist.run(self)


setup_args = {
    'name': 'bqplot',
    'version': '0.3.7',
    'description': 'Interactive plotting for the Jupyter notebook, using d3.js and ipywidgets.',
    'long_description': LONG_DESCRIPTION,
    'License': 'Apache',
    'include_package_data': True,
    'install_requires': ['ipywidgets', 'numpy', 'pandas'],
    'packages': find_packages(),
    'zip_safe': False,
    'cmdclass': {
        'js': Bower,
        'build_py': custom_build_py,
        'sdist': custom_sdist,
    },
    'author': 'BQplot Development Team',
    'url': 'https://github.com/bloomberg/bqplot',
    'keywords': [
        'ipython',
        'jupyter',
        'widgets',
        'graphics',
        'plotting',
        'd3',
    ],
    'classifiers': [
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
    ],
}

setup(**setup_args)
