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

define(["./d3", "./MarkModel"], function(d3, MarkModelModule) {
    "use strict";

    var OHLCModel = MarkModelModule.MarkModel.extend({
        initialize: function() {
            OHLCModel.__super__.initialize.apply(this);
            this.on_some_change(["x", "y"], this.update_data, this);
            this.on_some_change(["preserve_domain"], this.update_domains, this);
            this.on("change:format", this.update_format, this);
            this.px = { open: -1, high: -1, low: -1, close: -1 };
            this.mark_data = [];
        },
        update_format: function() {
            this.update_data();
            this.trigger("format_updated");
        },
        update_data: function() {
            var x_data = this.get_typed_field("x");
            var y_data = this.get_typed_field("y");
            var format = this.get("format")
            this.px = { open: -1, high: -1, low: -1, close: -1 };

            // Local private function to report errors in format
            function print_bad_format(format) {
                if(console) {
                    console.error("Invalid OHLC format: '" + format + "'");
                }
            }
 
            // We should have at most 4 data points (o,h,l,c)
            // This avoids iterating over a huge string
            if(format.length !== 4 && format.length !== 2) {
                print_bad_format(format);
                x_data = [];
                y_data = [];
            } else {
                for(var i = 0; i < format.length; i++) {
                    switch(format[i]) {
                      case 'o':
                        if(this.px.open === -1) {
                            this.px.open = i;
                        } else {
                            print_bad_format(format);
                            x_data = [];
                            y_data = [];
                        }
                        break;
                      case 'h':
                        if(this.px.high === -1) {
                            this.px.high = i;
                        } else {
                            print_bad_format(format);
                            x_data = [];
                            y_data = [];
                        }
                        break;
                      case 'l':
                        if(this.px.low === -1) {
                            this.px.low = i;
                        } else {
                            print_bad_format(format);
                            x_data = [];
                            y_data = [];
                        }
                        break;
                      case 'c':
                        if(this.px.close === -1) {
                            this.px.close = i;
                        } else {
                            print_bad_format(format);
                            x_data = [];
                            y_data = [];
                        }
                        break;
                      default: // Invalid character
                        print_bad_format(format);
                        x_data = [];
                        y_data = [];
                        break;
                    }
                }
            }

            if(x_data.length > y_data.length) {
                x_data = x_data.slice(0, y_data.length);
            } else if(x_data.length < y_data.length) {
                y_data = y_data.slice(0, x_data.length);
            }

            // Verify that our OHLC data is valid
            if(this.px.open !== -1 && this.px.close !== -1
            && this.px.high !== -1 && this.px.low !== -1)
            {
                for(var i = 0; i < y_data.length; i++) {
                    if(y_data[i].length !== format.length
                    || y_data[i][this.px.high] < y_data[i][this.px.open]
                    || y_data[i][this.px.high] < y_data[i][this.px.close]
                    || y_data[i][this.px.low] > y_data[i][this.px.open]
                    || y_data[i][this.px.low] > y_data[i][this.px.close])
                    {
                        // Truncate and notify console of error in data
                        y_data = [];
                        x_data = [];
                        if(console) {
                            console.error("Invalid OHLC data at index " + i);
                        }
                    }
                }
            } else if(this.px.high !== -1 && this.px.low !== -1) {
                for(var i = 0; i < y_data.length; i++) {
                    if(y_data[i].length !== format.length
                    || y_data[i][this.px.high] < y_data[i][this.px.low])
                    {
                        y_data = [];
                        x_data = [];
                        if(console) {
                            console.error("Invalid OHLC data at index " + i);
                        }
                    }
                }
            } else if(this.px.close !== -1 && this.px.open !== -1) {
                for(var i = 0; i < y_data.length; i++) {
                    if(y_data[i].length !== format.length) {
                        if(console) {
                            console.error("Invalid OHLC data at index " + i);
                        }
                    }
                }
            } else {
                x_data = [];
                y_data = [];
                if(console) {
                    console.error("Invalid OHLC data at index " + i);
                }
            }

            this.mark_data = _.zip(x_data, y_data);
            this.update_domains();
            this.trigger("data_updated");
        },
        update_domains: function() {
            if(!this.mark_data) {
                return;
            }
            var that = this;
            var scales = this.get("scales");
            var x_scale = scales["x"], y_scale = scales["y"];
            var min_x_dist = Number.POSITIVE_INFINITY;
            var max_y_height = 0, dist = 0, height = 0;

            /*
             * Compute the minimum x distance between the data points. We will
             * use this to pad either side of the x domain.
             * Also compute the maximum height of all of the marks (i.e. maximum
             * distance from high to low) and use that to pad the y domain.
             */
            for(var i = 0; i < this.mark_data.length; i++) {
                if(i > 0) {
                    dist = this.mark_data[i][0] - this.mark_data[i-1][0];
                    if(dist < min_x_dist) min_x_dist = dist;
                }
                height = this.mark_data[i][this.px.high] -
                            this.mark_data[i][this.px.low];
                if(height > max_y_height) max_y_height = height;
            }
            if(this.mark_data.length < 2) {
                min_x_dist = 0;
            }

            if((!this.get("preserve_domain")["x"]) && this.mark_data.length !== 0) {
                var min = d3.min(this.mark_data.map(function(d) {
                    return d[0];
                }));
                var max = d3.max(this.mark_data.map(function(d) {
                    return d[0];
                }));
                if(max instanceof Date) max = max.getTime();
                x_scale.set_domain([min - min_x_dist/2, max + min_x_dist/2], this.id);
            } else {
                x_scale.del_domain([], this.id);
            }

            if((!this.get("preserve_domain")["y"]) && this.mark_data.length !== 0) {
                // Remember that elem contains OHLC data here so we cannot use
                // compute_and_set_domain
                var top = this.px.high;
                var bottom = this.px.low;
                if(top === -1 || bottom === -1) {
                    top = this.px.open;
                    bottom = this.px.close;
                }
                var min = d3.min(this.mark_data.map(function(d) {
                    return (d[1][bottom] < d[1][top]) ? d[1][bottom] : d[1][top];
                }));
                var max = d3.max(this.mark_data.map(function(d) {
                    return (d[1][top] > d[1][bottom]) ? d[1][top] : d[1][bottom];
                }));
                if(max instanceof  Date) max = max.getTime();
                y_scale.set_domain([min - max_y_height, max + max_y_height], this.id);
            } else {
                y_scale.del_domain([], this.id);
            }
        },
    });

    return {
        OHLCModel: OHLCModel,
    };
});

