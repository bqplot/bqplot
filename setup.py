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
    'version': '0.3.3',
    'description': 'Interactive plotting for the Jupyter notebook, using d3.js and ipywidgets.',
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
