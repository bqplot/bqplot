import { Interaction } from './Interaction';
import { WidgetModel, unpack_models } from '@jupyter-widgets/base';
import { drag } from "d3-drag";
import { clientPoint } from "d3-selection";
const d3GetEvent = function(){return require("d3-selection").event}.bind(this);
import { semver_range } from './version';

export class MouseInteractionModel extends WidgetModel {
    defaults() {
        return {...WidgetModel.prototype.defaults(),
            _model_name: "MouseInteractionModel",
            _view_name: "MouseInteraction",
            _model_module: "bqplot",
            _view_module: "bqplot",
            _model_module_version: semver_range,
            _view_module_version: semver_range,
            scale_x: null,
            scale_y: null,
            cursor: 'auto',
        };
    }

    static serializers = {
        ...WidgetModel.serializers,
        x_scale: { deserialize: unpack_models },
        y_scale: { deserialize: unpack_models },
    }
}

export class MouseInteraction extends Interaction {
    x_scale: any;
    y_scale: any;
    async render() {
        // events for dragging etc
        const eventElement = this.d3el;
        super.render();
        this.x_scale = await this.create_child_view(this.model.get("x_scale"));
        this.y_scale = await this.create_child_view(this.model.get("y_scale"));

        this.parent.on("margin_updated", this.updateScaleRanges, this);
        this.updateScaleRanges();
        const updateCursor = () => {
            eventElement.node().style.cursor = this.model.get('cursor');
        }
        this.listenTo(this.model, "change:cursor", updateCursor);
        updateCursor();

        eventElement.call(drag().on("start", () => {
            const e = d3GetEvent();
            this._emit('dragstart', {x: e.x, y:e.y})
        }).on("drag", () => {
            const e = d3GetEvent();
            this._emit('dragmove', {x: e.x, y:e.y})
        }).on("end", () => {
            const e = d3GetEvent();
            this._emit('dragend', {x: e.x, y:e.y})
        }));

        // and click events
        ['click', 'dblclick'].forEach(eventName => {
            eventElement.on(eventName, () => {
                const e = d3GetEvent();
                // to be consistent with drag events, we need to user clientPoint
                const [x, y] = clientPoint(eventElement.node(), e);
                this._emit(eventName, {x, y})
            });
        });
    }
    updateScaleRanges() {
        this.x_scale.set_range(this.parent.padded_range("x", this.x_scale.model));
        this.y_scale.set_range(this.parent.padded_range("y", this.y_scale.model));
    }
    remove() {
        super.remove()
        this.parent.off('margin_updated', this.updateScaleRanges)
    }
    _emit(name, {x, y}) {
        let domain = {x: this.x_scale.scale.invert(x), y: this.y_scale.scale.invert(y)};
        this.send({event: name, pixel: {x, y}, domain: domain});
    }
}