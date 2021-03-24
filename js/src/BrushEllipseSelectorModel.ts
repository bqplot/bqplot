import {BrushSelectorModel} from './SelectorModel';

export class BrushEllipseSelectorModel extends BrushSelectorModel {

    defaults() {
        return {...BrushSelectorModel.prototype.defaults(),
            _model_name: "BrushEllipseSelectorModel",
            _view_name: "BrushEllipseSelector",
            pixel_aspect: null,
            style: {
                fill: "green",
                opacity: 0.3,
                cursor: "grab",
            },
            border_style: {
                fill: "none",
                stroke: "green",
                opacity: 0.3,
                cursor: "col-resize",
                "stroke-width": "3px",
            }
        }
    }

    static serializers = {...BrushSelectorModel.serializers,
    }
}
