import * as selector from './Selector';
import {drag} from "d3-drag";
const d3GetEvent = function(){return require("d3-selection").event}.bind(this);

/*
    good resource: https://en.wikipedia.org/wiki/Ellipse
    Throughout we use rx==a and ry==b, assuming like the article above:
    x**2/a**2 + y**2/b**2==1

    Useful equations:
        y = +/- b/a * sqrt(a**2 -x**2)
        a = sqrt(y**2 a**2/b**2 + x**2)
        x = a cos(t)
        y = b sin(t) (where t is called the eccentric anomaly or just 'angle)
        y/x = b/a sin(t)/cos(t) = b/a tan(t)
        a y/ b x = a/b cos(t)/sin(t) = tan(t)
        t = atan2(a y, b x)
*/
export class BrushEllipseSelector extends selector.BaseXYSelector {
    brush: d3.BrushBehavior<unknown>;
    brushsel: any;
    private d3ellipse: any;
    private d3ellipseHandle: any;
    // for testing purposes we need to keep track of this at the instance level
    private brushStartPosition = {x:0, y: 0};
    private moveStartPosition = {x: 0, y:0};
    private reshapeStartAngle = 0;
    private reshapeStartRadii = {rx: 0, ry: 0};

    async render() {
        super.render();
        const scale_creation_promise = this.create_scales();
        await Promise.all([this.mark_views_promise, scale_creation_promise]);

        this.d3ellipseHandle = this.d3el.append("ellipse");
        this.d3ellipse = this.d3el.attr("class", "selector brushintsel").append("ellipse");

        // events for brushing (a new ellipse)
        this.parent.bg_events.call(drag().on("start", () => {
            const e = d3GetEvent();
            this._brushStart({x: e.x, y:e.y})
        }).on("drag", () => {
            const e = d3GetEvent();
            this._brushDrag({x: e.x, y:e.y})
        }).on("end", () => {
            const e = d3GetEvent();
            this._brushEnd({x: e.x, y:e.y})
        }));


        // events for moving the existing ellipse
        this.d3ellipse.call(drag().on("start", () => {
            const e = d3GetEvent();
            this._moveStart({x: e.x, y:e.y})
        }).on("drag", () => {
            const e = d3GetEvent();
            this._moveDrag({x: e.x, y:e.y})
        }).on("end", () => {
            const e = d3GetEvent();
            this._moveEnd({x: e.x, y:e.y})
        }));

        // events for reshaping the existing ellipse
        this.d3ellipseHandle.call(drag().on("start", () => {
            const e = d3GetEvent();
            this._reshapeStart({x: e.x, y:e.y})
        }).on("drag", () => {
            const e = d3GetEvent();
            this._reshapeDrag({x: e.x, y:e.y})
        }).on("end", () => {
            const e = d3GetEvent();
            this._reshapeEnd({x: e.x, y:e.y})
        }));
        this.updateEllipse();
        this.syncSelectionToMarks();
        this.listenTo(this.model, 'change:selected_x change:selected_y change:color change:style change:border_style', () => this.updateEllipse());
        this.listenTo(this.model, 'change:selected_x change:selected_y', this.syncSelectionToMarks);
    }
    remove() {
        super.remove()
        // detach the event listener for dragging, since they are attached to the parent
        this.parent.bg_events.on(".start .drag .end", null);
    }
    // these methods are not private, but are used for testing, they should not be used as a public API.
    _brushStart({x, y}) {
        console.log('start', x, y)
        this.brushStartPosition = {x, y}
        this.model.set("brushing", true);
        this.touch();
    }
    _brushDrag({x, y}) {
        console.log('drag', x, y)
        this._brush({x, y})
    }
    _brushEnd({x, y}) {
        console.log('end', x, y)
        this._brush({x, y})
        this.model.set("brushing", false);
        this.touch();
    }
    _brush({x, y}) {
        const cx = this.brushStartPosition.x;
        const cy = this.brushStartPosition.y;
        const relX = Math.abs(x - cx);
        const relY = Math.abs(y - cy);
        if(!this.model.get('pixel_aspect') && ((relX == 0) || (relY == 0))) {
            console.log('cannot draw ellipse')
            this.model.set('selected_x', null);
            this.model.set('selected_y', null);
            this.touch();
            return; // we can't draw an ellipse or circle
        }

        // if 'feels' natural to have a/b == relX/relY, meaning the aspect ratio of the ellipse equals that of the pixels moved
        // but the aspect can be overridden by the model, to draw for instance circles
        let ratio = this.model.get('pixel_aspect') || (relX / relY)
        // using ra = a = sqrt(y**2 a**2/b**2 + x**2) we can solve a, from x, y, and the ratio a/b
        const rx = Math.sqrt(relY*relY * ratio*ratio + relX*relX);
        // and from that solve ry == b
        const ry = rx / ratio;
        // bounding box of the ellipse in pixel coordinates:
        const [px1, px2, py1, py2] = [cx - rx, cx + rx, cy - ry, cy + ry];
        // we don't want a single click to trigger an empty selection
        if(!((px1 == px2) && (py1 == py2))) {
            let selectedX = [px1, px2].map((pixel) => this.x_scale.scale.invert(pixel));
            let selectedY = [py1, py2].map((pixel) => this.y_scale.scale.invert(pixel));
            this.model.set('selected_x', new Float32Array(selectedX));
            this.model.set('selected_y', new Float32Array(selectedY));
            this.touch();
        } else {
            this.model.set('selected_x', null);
            this.model.set('selected_y', null);
            this.touch();
        }
    }
    _moveStart({x, y}) {
        this.moveStartPosition = {x, y}
        this.model.set("brushing", true);
        this.touch();
    }
    _moveDrag({x, y}) {
        this._move({dx: x - this.moveStartPosition.x, dy: y - this.moveStartPosition.y})
        this.moveStartPosition = {x, y}
    }
    _moveEnd({x, y}) {
        this._move({dx: x - this.moveStartPosition.x, dy: y - this.moveStartPosition.y})
        this.model.set("brushing", false);
        this.touch();
    }
    _move({dx, dy}) {
        // move is in pixels, so we need to transform to the domain
        const {px1, px2, py1, py2} = this.calculatePixelCoordinates();
        let selectedX = [px1, px2].map((pixel) => this.x_scale.scale.invert(pixel + dx));
        let selectedY = [py1, py2].map((pixel) => this.y_scale.scale.invert(pixel + dy));
        this.model.set('selected_x', new Float32Array(selectedX));
        this.model.set('selected_y', new Float32Array(selectedY));
        this.touch();
    }
    _reshapeStart({x, y}) {
        const {cx, cy, rx, ry} = this.calculatePixelCoordinates();
        const ratio = this.model.get('pixel_aspect');
        if (ratio) {
            // reshaping with an aspect ratio is done equivalent to starting a new brush on the current ellipse coordinate
            this._brushStart({x: cx, y: cy});
            this._brushDrag({x, y});
        } else {
            const relX = x - cx;
            const relY = y - cy;
            // otherwise, we deform the ellipse by 'dragging' the ellipse at the angle we grab it
            this.reshapeStartAngle = Math.atan2(rx * relY,  ry * relX);
            this.reshapeStartRadii = {rx, ry};
        }
        this.model.set("brushing", true);
        this.touch();
    }
    _reshapeDrag({x, y}) {
        const ratio = this.model.get('pixel_aspect');
        if (ratio) {
            this._brushDrag({x, y});
        } else {
            this._reshape({x: x, y: y, angle: this.reshapeStartAngle})
        }
    }
    _reshapeEnd({x, y}) {
        const ratio = this.model.get('pixel_aspect');
        if (ratio) {
            this._brushEnd({x, y})
        } else {
            this._reshape({x: x, y: y, angle: this.reshapeStartAngle})
        }
        this.model.set("brushing", false);
        this.touch();
    }
    _reshape({x, y, angle}) {
        const {cx, cy} = this.calculatePixelCoordinates();
        // if we are within -10,+10 degrees within 0, 90, 180, 270, or 360 degrees
        // 'round' to that angle
        angle = (angle + Math.PI*2) % (Math.PI*2);
        for(let i = 0; i < 5; i++) {
            const angleTest = Math.PI * i / 2;
            const angle1 = angleTest - 10 * Math.PI / 180;
            const angle2 = angleTest + 10 * Math.PI / 180;
            console.log('test angle', angleTest, angle1, angle2, ((angle > angle1) && (angle < angle2)))
            if((angle > angle1) && (angle < angle2)) {
                angle = angleTest;
            }
        }
        angle = (angle + Math.PI*2) % (Math.PI*2);
        const relX = (x - cx);
        const relY = (y - cy);
        /*
           Solve, for known t=angle
           relX = rx cos(t)
           relY = ry sin(t) (where t is called the eccentric anomaly or just 'angle)
        */
        let ratio = this.model.get('pixel_aspect');
        let rx = relX / (Math.cos(angle)) ;
        let ry = relY / (Math.sin(angle));
        // if we are at one of the 4 corners, we fix rx, ry, or scaled by the ratio
        if( (angle == Math.PI/2) || (angle == Math.PI*3/2)) {
            if(ratio) {
                rx = ry / ratio;
            } else {
                rx = this.reshapeStartRadii.rx;
            }
        }
        if( (angle == 0) || (angle == Math.PI)) {
            if(ratio) {
                ry = rx * ratio;
            } else {
                ry = this.reshapeStartRadii.ry;
            }
        }

        // // bounding box of the ellipse in pixel coordinates:
        const [px1, px2, py1, py2] = [cx - rx, cx + rx, cy - ry, cy + ry];
        let selectedX = [px1, px2].map((pixel) => this.x_scale.scale.invert(pixel));
        let selectedY = [py1, py2].map((pixel) => this.y_scale.scale.invert(pixel));
        this.model.set('selected_x', new Float32Array(selectedX));
        this.model.set('selected_y', new Float32Array(selectedY));
        this.touch();

    }
    reset() {
        this.model.set('selected_x', null);
        this.model.set('selected_y', null);
        this.touch()
    }
    selected_changed() {
        // I don't think this should be an abstract method we should implement
        // would be good to refactor the interact part a bit
    }
    private canDraw() {
        const selectedX = this.model.get('selected_x');
        const selectedY = this.model.get('selected_y');
        return Boolean(selectedX) && Boolean(selectedY);
    }

    private calculatePixelCoordinates() {
        if(!this.canDraw()) {
            throw new Error("No selection present")
        }
        const selectedX = this.model.get('selected_x');
        const selectedY = this.model.get('selected_y');
        var sortFunction = (a: number, b: number) => a - b;
        let x = [...selectedX].sort(sortFunction);
        let y = [...selectedY].sort(sortFunction);
        // convert to pixel coordinates
        let [px1, px2] = x.map((v) => this.x_scale.scale(v));
        let [py1, py2] = y.map((v) => this.y_scale.scale(v));
        // bounding box, and svg coordinates
        return {px1, px2, py1, py2, cx: (px1 + px2)/2, cy: (py1 + py2)/2, rx: Math.abs(px2 - px1)/2, ry: Math.abs(py2 - py1)/2}
    }
    private updateEllipse(offsetX = 0, offsetY = 0, extraRx=0, extraRy=0) {
        if(!this.canDraw()) {
            this.d3el.node().style.visibility = 'hidden';
        } else {
            const {cx, cy, rx, ry} = this.calculatePixelCoordinates();
            this.d3ellipse
                .attr("cx", cx + offsetX)
                .attr("cy", cy + offsetY)
                .attr("rx", rx + extraRx)
                .attr("ry", ry + extraRy)
                .styles(this.model.get('style'))
            ;
            this.d3ellipseHandle
                .attr("cx", cx + offsetX)
                .attr("cy", cy + offsetY)
                .attr("rx", rx + extraRx)
                .attr("ry", ry + extraRy)
                .styles(this.model.get('border_style'))
            ;
            this.d3el.node().style.visibility = 'visible';
        }
    }

    private syncSelectionToMarks() {
        if(!this.canDraw()) return
        const {cx, cy, rx, ry} = this.calculatePixelCoordinates();

        const point_selector = function(p) {
            const [pointX, pointY] = p;
            const dx = (cx - pointX)/rx;
            const dy = (cy - pointY)/ry;
            const insideCircle = (dx * dx + dy * dy) <= 1;
            return insideCircle;
        };
        const rect_selector = function(xy) {
             // TODO: Leaving this to someone who has a clear idea on how this should be implemented
             // and who needs it. I don't see a good use case for this (Maarten Breddels).
            console.error('Rectangle selector not implemented')
            return false;
        };

        this.mark_views.forEach((markView) => {
            markView.selector_changed(point_selector, rect_selector);
        });

    }

}