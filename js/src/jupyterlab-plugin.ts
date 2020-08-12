/* Copyright 2015 Bloomberg Finance L.P.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

require("../css/bqplot.css");

import * as base from "@jupyter-widgets/base";

/**
 * The widget manager provider.
 */
module.exports = {
  id: "bqplot",
  requires: [base.IJupyterWidgetRegistry],
  exports: function () {
    return new Promise(function (resolve, reject) {
      require.ensure(
        ["./index"],
        function (require) {
          resolve(require("./index"));
        },
        function (err) {
          console.error(err);
          reject(err);
        },
        "bqlot"
      );
    });
  },
  autoStart: true,
};
