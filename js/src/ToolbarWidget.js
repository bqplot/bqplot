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

var widgets = require("@jupyter-widgets/base");
var controls = require("@jupyter-widgets/controls");
var phosphor_widget = require('@phosphor/widgets');
var phosphor_messaging = require('@phosphor/messaging');
var screenfull = require("screenfull")

var _ = require("underscore");
var semver_range = "^" + require("../package.json").version;

var ToolbarWidgetModel = widgets.DOMWidgetModel.extend({

    defaults: function() {
        return _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
            _model_name: "ToolbarWidgetModel",
            _view_name: "ToolbarWidget",
            _model_module: "bqplot",
            _view_module: "bqplot",
            _model_module_version: semver_range,
            _view_module_version: semver_range,

            // figure: null,
            interacts: [],
            interact_active: null,
            interact_index: null,
        });
    },
    initialize: function() {
        ToolbarWidgetModel.__super__.initialize.apply(this, arguments);
        this.on('change:interact_index', () => {
            var interacts = this.get('interacts');
            if(!interacts) {
                console.error('interacts is null');
                return;
            }
            var index = this.get('interact_index')
            if(index === null) {
                this.set('interact_active', null);
                this.save_changes();
                return;
            }
            if((index < 0) || (index >= interacts.length)) {
                console.error('interact_index out of bound')
                return;
            }
            console.log('set', interacts[index])
            this.set('interact', interacts[index]);
            this.save_changes();
        })
    }


}, {
    serializers: _.extend({
        child: { deserialize: widgets.unpack_models },
        // actions: { deserialize: widgets.unpack_models },
        toolbar_widgets: { deserialize: widgets.unpack_models },
        // interacts: { deserialize: widgets.unpack_models },
        // interact: { deserialize: widgets.unpack_models },
    }, widgets.DOMWidgetModel.serializers)
});

var ToolbarWidget = widgets.DOMWidgetView.extend({

    fullscreen: function() {
        var el = this.childView.el;
        var old_width = el.style.width
        var old_height = el.style.height
        var restore = () => {
            if(!screenfull.isFullscreen) {
                el.style.width = old_width;
                el.style.height = old_height
                screenfull.off('change', restore)
            } else {
                el.style.width = '100vw'
                el.style.height = '100vh'
            }
            phosphor_messaging.MessageLoop.postMessage(this.childView.pWidget, phosphor_widget.Widget.ResizeMessage.UnknownSize);
        }
        screenfull.onchange(restore)
        screenfull.request(el);

    },
    render: function() {
        this.el.classList.add("jupyter-widgets");
        this.el.classList.add('widget-container')
        // this.el.classList.add('widget-box')
        this.el_toolbar = document.createElement('div')
        this.el_content = document.createElement('div')
        this.el_toolbar.classList.add('jupyter-widgets')
        this.el_toolbar.classList.add('widget-container')
        this.el_toolbar.classList.add('widget-toolbar')
        this.el.appendChild(this.el_toolbar)
        this.el.appendChild(this.el_content)
        
        // var toolbarWidgetsViewList = new widgets.ViewList((model, index) => {
        //     var viewPromise = this.create_child_view(model);
        //     viewPromise.then((view) => {
        //         this.el_toolbar.appendChild(view.el)
        //     })

        // }, () => {

        // });
        // toolbarWidgetsViewList.update(this.model.get('toolbar_widgets'));


        var actionButtonViewList = new widgets.ViewList((model, index) => {
            var viewPromise = this.create_child_view(model);
            viewPromise.then((view) => {
                if(view.el.nodeName === 'BUTTON') {
                    view.el.onclick = () => {
                        console.log('click', index)
                        var action = model.get('default_action');
                        if(!action)
                            return;
                        var command = action.get('command');
                        if(!command)
                            return;
                        if(this.childView[command]) {
                            this.childView[command]()
                        } else if(this[command]) {
                            this[command]();
                        } else if(!handler) {
                            console.log('no event handler found for command, sending event ', command);
                            this.childView.trigger(command)
                            return;
                        }
                    }
                }
                this.el_toolbar.appendChild(view.el)
                this.displayed.then(() => {
                    view.trigger('displayed', this);
                });
            });

        }, () => {

        });
        actionButtonViewList.update(this.model.get('toolbar_widgets'));//.map((tuple) => tuple[0]));



        this.create_child_view(this.model.get("child")).then((view) => {
            this.childView = view;
            this.el_content.appendChild(view.el)
            phosphor_messaging.MessageLoop.postMessage(view.pWidget, phosphor_widget.Widget.ResizeMessage.UnknownSize);
        })
    }
});



module.exports = {
    ToolbarWidget: ToolbarWidget,
    ToolbarWidgetModel: ToolbarWidgetModel
};
