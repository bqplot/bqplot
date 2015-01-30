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

define(["widgets/js/manager", "widgets/js/widget", "d3"], function(WidgetManager, widget, d3) {
     var Scale = widget.WidgetView.extend({
         render: function(){
             this.offset = 0;
         },
         create_event_listeners: function() {
             this.listenTo(this.model, "domain_changed", this.model_domain_changed, this);
             this.listenTo(this.model, "highlight_axis", this.highlight_axis, this);
             this.listenTo(this.model, "unhighlight_axis", this.unhighlight_axis, this);
         },
         set_range: function(range, padding) {
             this.scale.range(range);
         },
         compute_and_set_domain: function(array, id) {
             this.model.compute_and_set_domain(array, id);
         },
         set_domain: function(array, id) {
             this.model.set_domain(array, id);
         },
         model_domain_changed: function() {
             this.scale.domain(this.model.domain);
             this.trigger("domain_changed");
         },
         highlight_axis: function() {
             this.trigger("highlight_axis");
         },
         unhighlight_axis: function() {
             this.trigger("unhighlight_axis");
         },
         expand_domain: function(old_range, new_range) {
             // Base class function. No implementation.
             // Implementation is particular to the child class
             // if you have a current range and then a new range and want to
             // expand the domain to expand to the new range but keep it
             // consistent with the previous one, this is the function you use.
         },
     });
    WidgetManager.WidgetManager.register_widget_view("Scale", Scale);
    return [Scale];
});
