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

# -*- coding: utf-8 -*-
import glob
import os
import re
import sys

from IPython.testing import iptestcontroller

test_root = os.path.join(os.path.dirname(__file__), 'tests/')


class JSController(iptestcontroller.JSController):

    def __init__(self, section, xunit=True, engine='phantomjs', url=None):
        iptestcontroller.TestController.__init__(self)
        self.engine = engine
        self.section = section
        self.xunit = xunit
        self.url = url
        self.slimer_failure = re.compile('^FAIL.*', flags=re.MULTILINE)
        js_test_dir = iptestcontroller.get_js_test_dir()
        includes = '--includes=' + os.path.join(js_test_dir, 'util.js')
        # Only differs from the base class ctor at the following line:
        test_cases = ' '.join(glob.glob(os.path.join(test_root, 'test_*.js')))
        self.cmd = ['casperjs', 'test', includes, test_cases, '--engine=%s' % self.engine]


def test_bqplot(options):
    engine = 'slimerjs' if options.slimerjs else 'phantomjs'
    controller = JSController('bqplot', xunit=options.xunit, engine=engine)
    exitcode = 1
    try:
        controller.setup()
        controller.launch(buffer_output=False)
        exitcode = controller.wait()
    except Exception as err:
        print(err)
        exitcode = 1
    finally:
        controller.cleanup()
    assert exitcode == 0


if __name__ == '__main__':
    options = iptestcontroller.default_options()
    sys.exit(test_bqplot(options))
