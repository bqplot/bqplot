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

define(["widgets/js/manager", "d3", "./Scale"], function(WidgetManager, d3, ScaleView) {
    var BaseScale = ScaleView[0];
    var LinearScale = BaseScale.extend({
         render: function(){
             this.scale = d3.scale.linear();
             if(this.model.domain.length > 0)
                 this.scale.domain(this.model.domain);
             this.offset = 0;
             this.ticks = this.model.ticks;
             this.create_event_listeners();
         },
         expand_domain: function(old_range, new_range) {
             // if you have a current range and then a new range and want to
             // expand the domain to expand to the new range but keep it
             // consistent with the previous one, this is the function you use.

             // the following code is required to make a copy of the actual
             // state of the scale. Referring to the model domain and then
             // setting the range to be the old range in case it is not.
             var unpadded_scale = this.scale.copy();
             unpadded_scale.domain(this.model.domain);
             unpadded_scale.range(old_range);
             this.scale.domain(new_range.map(function(limit) {
                 return unpadded_scale.invert(limit);
             }));
         },
     });
    WidgetManager.WidgetManager.register_widget_view("LinearScale", LinearScale);
    return [LinearScale];
});
