// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.


//import * as widgets from '../../lib';
import * as services from '@jupyterlab/services';
import * as Backbone from 'backbone';
import * as widgets from '@jupyter-widgets/base';
import * as sinon from 'sinon';

let numComms = 0;

export
class MockComm {
    constructor() {
        this.comm_id = `mock-comm-id-${numComms}`;
        numComms += 1;
    }
    on_open(fn) {
        this._on_open = fn;
    }
    on_close(fn) {
        this._on_close = fn;
    }
    on_msg(fn) {
        this._on_msg = fn;
    }
    _process_msg(msg) {
        if (this._on_msg) {
            return this._on_msg(msg);
        } else {
            return Promise.resolve();
        }
    }
    open() {
        if (this._on_open) {
            this._on_open();
        }
        return '';
    }
    close() {
        if (this._on_close) {
            this._on_close();
        }
        return '';
    }
    send() {
        return '';
    }
    comm_id: string;
    target_name: string;
    _on_msg: Function = null;
    _on_open: Function = null;
    _on_close: Function = null;
}

export
class DummyManager extends widgets.ManagerBase<HTMLElement> {
    constructor(library: any) {
        super();
        this.el = window.document.createElement('div');
        window.document.body.appendChild(this.el)
        this.library = library;
    }

    display_view(msg: services.KernelMessage.IMessage, view: Backbone.View<Backbone.Model>, options: any) {
        // TODO: make this a spy
        // TODO: return an html element
        return Promise.resolve(view).then(view => {
            this.el.appendChild(view.el);
            view.on('remove', () => console.log('view removed', view));
            (<any>window).last_view = view
            //view.render()
            view.trigger('displayed')
            return view.el;
        });
    }


    protected loadClass(className: string, moduleName: string, moduleVersion: string): Promise<any> {
        if (moduleName === '@jupyter-widgets/controls') {
            if (widgets[className]) {
                return Promise.resolve(widgets[className]);
            } else {
                return Promise.reject(`Cannot find class ${className}`)
            }
        } else if (moduleName === 'test-widgets') {
            if (testWidgets[className]) {
                return Promise.resolve(testWidgets[className]);
            } else {
                return Promise.reject(`Cannot find class ${className}`)
            }
        } else if(moduleName in this.library) {
            return Promise.resolve(this.library[moduleName][className]);
        } else {
            return Promise.reject(`Cannot find module ${moduleName}`);
        }
    }

    _get_comm_info() {
        return Promise.resolve({});
    }

    _create_comm() {
        return Promise.resolve(new MockComm());
    }

    el: HTMLElement;
    library: any;
}

// Dummy widget with custom serializer and binary field

let typesToArray = {
    int8: Int8Array,
    int16: Int16Array,
    int32: Int32Array,
    uint8: Uint8Array,
    uint16: Uint16Array,
    uint32: Uint32Array,
    float32: Float32Array,
    float64: Float64Array
}

let JSONToArray = function(obj, manager) {
    return new typesToArray[obj.dtype](obj.buffer.buffer);
}

let arrayToJSON = function(obj, manager) {
    let dtype = Object.keys(typesToArray).filter(
        i=>typesToArray[i]===obj.constructor)[0]
    return {dtype, buffer: obj}
}

let array_serialization = {
    deserialize: JSONToArray,
    serialize: arrayToJSON
};


class TestWidget extends widgets.WidgetModel {
    defaults() {
        return {...super.defaults(),
            _model_module: "test-widgets",
            _model_name: "TestWidget",
            _model_module_version: '1.0.0',
            _view_module: "test-widgets",
            _view_name: "TestWidgetView",
            _view_module_version: '1.0.0',
            _view_count: null,
        }
    }
}

class TestWidgetView extends widgets.WidgetView {
    render() {
        this._rendered += 1;
        super.render();
    }
    remove() {
        this._removed +=1;
        super.remove();
    }
    _removed = 0
    _rendered = 0;
}

let testWidgets = {TestWidget, TestWidgetView};
