import { expect } from 'chai';
import {DummyManager} from './dummy-manager';
import * as bqplot from '../index';
import {create_figure_scatter} from './widget-utils'


describe("scatter mega >", () => {
    beforeEach(async function() {
        this.manager = new DummyManager({bqplot: bqplot});
    });

    it("basics", async function() {
        const x_array = new Float32Array([0, 1]);
        const y_array = new Float32Array([2, 3]);
        const x = {dtype: 'float32', value: new DataView(x_array.buffer)};
        const y = {dtype: 'float32', value: new DataView(y_array.buffer)};
        const objects = await create_figure_scatter(this.manager, x, y, true);
        const scatter = objects.scatter;

        expect(scatter.x.array).to.deep.equal(x_array);
        expect(scatter.x.itemSize).to.equal(1);
        expect(scatter.x.meshPerAttribute).to.equal(1);

        expect(scatter.x_previous.array).to.deep.equal(x_array);
        expect(scatter.x_previous.itemSize).to.equal(1);
        expect(scatter.x_previous.meshPerAttribute).to.equal(1);

        expect(scatter.y.array).to.deep.equal(y_array);
        expect(scatter.y.itemSize).to.equal(1);
        expect(scatter.y.meshPerAttribute).to.equal(1);

        expect(scatter.y_previous.array).to.deep.equal(y_array);
        expect(scatter.y_previous.itemSize).to.equal(1);
        expect(scatter.y_previous.meshPerAttribute).to.equal(1);

        const new_x = new Float32Array([1, 2]);
        scatter.model.set('x', new_x);
        expect(scatter.x.array).to.deep.equal(new_x);
        expect(scatter.x_previous.array).to.deep.equal(x_array);

        const new_y = new Float32Array([34, 1]);
        scatter.model.set('y', new_y);
        expect(scatter.y.array).to.deep.equal(new_y);
        expect(scatter.y_previous.array).to.deep.equal(y_array);
    });

    it("size", async function() {
        const x = {dtype: 'float32', value: new DataView((new Float32Array([0, 1])).buffer)};
        const y = {dtype: 'float32', value: new DataView((new Float32Array([2, 3])).buffer)};
        const objects = await create_figure_scatter(this.manager, x, y, true);
        const scatter = objects.scatter;
        const default_size = scatter.model.get('default_size');

        expect(scatter.size.array).to.deep.equal(new Float32Array([default_size]));
        expect(scatter.size.meshPerAttribute).to.equal(2); // Same size fore the two markers
        expect(scatter.size_previous.array).to.deep.equal(scatter.size.array);
        expect(scatter.size_previous.meshPerAttribute).to.equal(2);

        scatter.model.set('default_size', default_size * 2);
        expect(scatter.size.array).to.deep.equal(new Float32Array([default_size * 2]));
        expect(scatter.size.meshPerAttribute).to.equal(2);
        expect(scatter.size_previous.array).to.deep.equal(new Float32Array([default_size]));
        expect(scatter.size_previous.meshPerAttribute).to.equal(2);

        // We push an array, the previous should be a scalar
        const new_size = new Float32Array([0., 0.5]);
        scatter.model.set('size', new_size);
        expect(scatter.size.array).to.deep.equal(new_size);
        expect(scatter.size.meshPerAttribute).to.equal(1); // Each marker has its own size
        expect(scatter.size_previous.array).to.deep.equal(new Float32Array([default_size * 2]));
        expect(scatter.size_previous.meshPerAttribute).to.equal(2);

        // We push an array that is too short, default_size should be used
        const new_size2 = new Float32Array([0.]);
        scatter.model.set('size', new_size2);
        expect(scatter.size.array).to.deep.equal(new Float32Array([0., default_size * 2]));
        expect(scatter.size.meshPerAttribute).to.equal(1);
        expect(scatter.size_previous.array).to.deep.equal(new_size);
        expect(scatter.size_previous.meshPerAttribute).to.equal(1);
    });

    it("opacity", async function() {
        const x = {dtype: 'float32', value: new DataView((new Float32Array([0, 1, 2])).buffer)};
        const y = {dtype: 'float32', value: new DataView((new Float32Array([2, 3, 3])).buffer)};
        const objects = await create_figure_scatter(this.manager, x, y, true);
        const scatter = objects.scatter;

        const default_opacities = new Float32Array([1.]);
        expect(scatter.opacity.array).to.deep.equal(default_opacities);
        expect(scatter.opacity.meshPerAttribute).to.equal(3);
        expect(scatter.opacity_previous.array).to.deep.equal(default_opacities);
        expect(scatter.opacity_previous.meshPerAttribute).to.equal(3);

        const default_opacities2 = new Float32Array([0.5]);
        scatter.model.set('default_opacities', default_opacities2);
        expect(scatter.opacity.meshPerAttribute).to.equal(3);
        expect(scatter.opacity.array).to.deep.equal(default_opacities2);
        expect(scatter.opacity_previous.array).to.deep.equal(default_opacities);
        expect(scatter.opacity.meshPerAttribute).to.equal(3);

        // We push an array of size 2 for the default_opacities. We have 3 markers
        // so the default_opacities should be used periodicly
        scatter.model.set('default_opacities', new Float32Array([0.5, 1.0]));
        expect(scatter.opacity.array).to.deep.equal(new Float32Array([0.5, 1.0, 0.5]));
        expect(scatter.opacity.meshPerAttribute).to.equal(1);
        expect(scatter.opacity_previous.meshPerAttribute).to.equal(3);
        expect(scatter.opacity_previous.array).to.deep.equal(default_opacities2);

        const new_opacity = new Float32Array([0.5, 1.0, 0.8]);
        scatter.model.set('opacity', new_opacity);
        expect(scatter.opacity.array).to.deep.equal(new_opacity);
        expect(scatter.opacity.meshPerAttribute).to.equal(1);
        expect(scatter.opacity_previous.array).to.deep.equal(new Float32Array([0.5, 1.0, 0.5]))
        expect(scatter.opacity_previous.meshPerAttribute).to.equal(1);

        // We push an array that is too short, default_opacities should be used
        scatter.model.set('opacity', new Float32Array([0.8]));
        expect(scatter.opacity.array).to.deep.equal(new Float32Array([0.8, 1.0, 0.5]));
        expect(scatter.opacity.meshPerAttribute).to.equal(1);
        expect(scatter.opacity_previous.array).to.deep.equal(new_opacity);
        expect(scatter.opacity_previous.meshPerAttribute).to.equal(1);
    });

    it("colors", async function() {
        const x = {dtype: 'float32', value: new DataView((new Float32Array([0, 1, 2, 1])).buffer)};
        const y = {dtype: 'float32', value: new DataView((new Float32Array([2, 3, 4, 3])).buffer)};
        const objects = await create_figure_scatter(this.manager, x, y, true);
        const scatter = objects.scatter;

        const red = new Float32Array([1., 0., 0.]);
        const blue = new Float32Array([0., 0., 1.]);
        const steelblue = new Float32Array([0.27450981736183167, 0.5098039507865906, 0.7058823704719543]);

        expect(scatter.color.array).to.deep.equal(steelblue);
        expect(scatter.color.itemSize).to.equal(3);
        expect(scatter.color.meshPerAttribute).to.equal(4);
        expect(scatter.scatter_material.defines['USE_COLORMAP']).to.be.false;

        scatter.model.set('colors', ['red']);
        expect(scatter.color.array).to.deep.equal(red);
        expect(scatter.color.itemSize).to.equal(3);
        expect(scatter.color.meshPerAttribute).to.equal(4);
        expect(scatter.scatter_material.defines['USE_COLORMAP']).to.be.false;

        // We push an array of two colors. We have 4 markers
        // so the colors should be used periodicly
        scatter.model.set('colors', ['red', 'blue']);
        expect(scatter.color.array).to.deep.equal(new Float32Array([
            red[0], red[1], red[2], blue[0], blue[1], blue[2],
            red[0], red[1], red[2], blue[0], blue[1], blue[2]
        ]));
        expect(scatter.color.itemSize).to.equal(3);
        expect(scatter.color.meshPerAttribute).to.equal(1);
        expect(scatter.scatter_material.defines['USE_COLORMAP']).to.be.false;

        const new_color = new Float32Array([0.5, 1., 0.3, 0.1]);
        scatter.model.set('color', new_color);
        expect(scatter.color.array).to.deep.equal(new_color);
        expect(scatter.color.itemSize).to.equal(1);
        expect(scatter.color.meshPerAttribute).to.equal(1);
        expect(scatter.scatter_material.defines['USE_COLORMAP']).to.be.true;
        expect(scatter.scatter_material.uniforms['domain_color'].value).to.deep.equal([new_color[3], new_color[1]])

        const new_color2 = new Float32Array([0.5, 2., 0.6, -0.3]);
        scatter.model.set('color', new_color2);
        expect(scatter.scatter_material.uniforms['domain_color'].value).to.deep.equal([new_color2[3], new_color2[1]])

        scatter.model.set('color', null);
        // TODO: now the min/max are undefined, or is there a good default?
        scatter.scales.color.model.set('min', 1)
        scatter.scales.color.model.set('max', 3)
        expect(scatter.scatter_material.uniforms['domain_color'].value).to.deep.equal([1, 3])
        scatter.scales.color.model.set('min', -1)
        expect(scatter.scatter_material.uniforms['domain_color'].value).to.deep.equal([-1, 3])
    });

    it("selection", async function() {
        const x = {dtype: 'float32', value: new DataView((new Float32Array([0, 1])).buffer)};
        const y = {dtype: 'float32', value: new DataView((new Float32Array([2, 3])).buffer)};
        const objects = await create_figure_scatter(this.manager, x, y, true);
        const scatter = objects.scatter;

        expect(scatter.selected.array).to.deep.equal(new Float32Array([0]));
        expect(scatter.selected.itemSize).to.equal(1);
        expect(scatter.selected.meshPerAttribute).to.equal(2);
        expect(scatter.scatter_material.uniforms['has_selection'].value).to.be.false;

        // 2 is 'out of bounds', we only have two markers
        scatter.model.set('selected', [1, 2]);
        expect(scatter.selected.array).to.deep.equal(new Float32Array([0, 1]));
        expect(scatter.selected.itemSize).to.equal(1);
        expect(scatter.selected.meshPerAttribute).to.equal(1);
        expect(scatter.scatter_material.uniforms['has_selection'].value).to.be.true;

        scatter.model.set('selected', [0, 1]);
        expect(scatter.selected.array).to.deep.equal(new Float32Array([1, 1]));
        expect(scatter.scatter_material.uniforms['has_selection'].value).to.be.true;

        scatter.model.set('selected', [0]);
        expect(scatter.selected.array).to.deep.equal(new Float32Array([1, 0]));
        expect(scatter.scatter_material.uniforms['has_selection'].value).to.be.true;
    });

    it("rotation", async function() {
        const x = {dtype: 'float32', value: new DataView((new Float32Array([0, 1])).buffer)};
        const y = {dtype: 'float32', value: new DataView((new Float32Array([2, 3])).buffer)};
        const objects = await create_figure_scatter(this.manager, x, y, true);
        const scatter = objects.scatter;

        expect(scatter.rotation.array).to.deep.equal(new Float32Array([0]));
        expect(scatter.rotation.itemSize).to.equal(1);
        expect(scatter.rotation.meshPerAttribute).to.equal(2);

        scatter.model.set('rotation', [60, 180]);
        expect(scatter.rotation.array).to.deep.equal(new Float32Array([60, 180]));
        expect(scatter.rotation.itemSize).to.equal(1);
        expect(scatter.rotation.meshPerAttribute).to.equal(1);
    });

    it("markers number increase", async function() {
        const x_array = new Float32Array([0, 1]);
        const y_array = new Float32Array([2, 3]);
        const x = {dtype: 'float32', value: new DataView(x_array.buffer)};
        const y = {dtype: 'float32', value: new DataView(y_array.buffer)};
        const objects = await create_figure_scatter(this.manager, x, y, true);
        const scatter = objects.scatter;

        const steelblue = new Float32Array([0.27450981736183167, 0.5098039507865906, 0.7058823704719543]);
        const default_size = scatter.model.get('default_size');
        const default_opacities = new Float32Array([1.]);

        expect(scatter.markers_number).to.equal(2);
        expect(scatter.instanced_geometry.maxInstancedCount).to.equal(2);

        // Checking size/opacity/color/selected attributes
        expect(scatter.size.array).to.deep.equal(new Float32Array([default_size]));
        expect(scatter.size.meshPerAttribute).to.equal(2);

        expect(scatter.opacity.array).to.deep.equal(default_opacities);
        expect(scatter.opacity.meshPerAttribute).to.equal(2);

        expect(scatter.color.array).to.deep.equal(steelblue);
        expect(scatter.color.itemSize).to.equal(3);
        expect(scatter.color.meshPerAttribute).to.equal(2);

        expect(scatter.selected.array).to.deep.equal(new Float32Array([0]));
        expect(scatter.selected.itemSize).to.equal(1);
        expect(scatter.selected.meshPerAttribute).to.equal(2);

        // Increasing x length
        // `x_previous` should have the right new size, but the markers
        // should not increase until y has increased
        const new_x = new Float32Array([3, 2, 10]);
        scatter.model.set('x', new_x);
        expect(scatter.x.array).to.deep.equal(new_x);
        expect(scatter.x_previous.array).to.deep.equal(new Float32Array([0, 1, 10]));

        expect(scatter.markers_number).to.equal(2);
        expect(scatter.instanced_geometry.maxInstancedCount).to.equal(2);

        // Increasing y length
        // the markers number should be updated
        const new_y = new Float32Array([4, 2, 2]);
        scatter.model.set('y', new_y);
        expect(scatter.x.array).to.deep.equal(new_x);
        expect(scatter.x_previous.array).to.deep.equal(new Float32Array([0, 1, 10]));

        expect(scatter.y.array).to.deep.equal(new_y);
        expect(scatter.y_previous.array).to.deep.equal(new Float32Array([2, 3, 2]));

        expect(scatter.markers_number).to.equal(3);
        expect(scatter.instanced_geometry.maxInstancedCount).to.equal(3);

        // Checking size/opacity/color/selected attributes
        expect(scatter.size.array).to.deep.equal(new Float32Array([default_size]));
        expect(scatter.size.meshPerAttribute).to.equal(3);

        expect(scatter.opacity.array).to.deep.equal(default_opacities);
        expect(scatter.opacity.meshPerAttribute).to.equal(3);

        expect(scatter.color.array).to.deep.equal(steelblue);
        expect(scatter.color.itemSize).to.equal(3);
        expect(scatter.color.meshPerAttribute).to.equal(3);

        expect(scatter.selected.array).to.deep.equal(new Float32Array([0]));
        expect(scatter.selected.itemSize).to.equal(1);
        expect(scatter.selected.meshPerAttribute).to.equal(3);
    });

    it("markers number decrease", async function() {
        const x_array = new Float32Array([0, 1]);
        const y_array = new Float32Array([2, 3]);
        const x = {dtype: 'float32', value: new DataView(x_array.buffer)};
        const y = {dtype: 'float32', value: new DataView(y_array.buffer)};
        const objects = await create_figure_scatter(this.manager, x, y, true);
        const scatter = objects.scatter;

        const steelblue = new Float32Array([0.27450981736183167, 0.5098039507865906, 0.7058823704719543]);
        const default_size = scatter.model.get('default_size');
        const default_opacities = new Float32Array([1.]);

        expect(scatter.markers_number).to.equal(2);
        expect(scatter.instanced_geometry.maxInstancedCount).to.equal(2);

        // Checking size/opacity/color/selected attributes
        expect(scatter.size.array).to.deep.equal(new Float32Array([default_size]));
        expect(scatter.size.meshPerAttribute).to.equal(2);

        expect(scatter.opacity.array).to.deep.equal(default_opacities);
        expect(scatter.opacity.meshPerAttribute).to.equal(2);

        expect(scatter.color.array).to.deep.equal(steelblue);
        expect(scatter.color.itemSize).to.equal(3);
        expect(scatter.color.meshPerAttribute).to.equal(2);

        expect(scatter.selected.array).to.deep.equal(new Float32Array([0]));
        expect(scatter.selected.itemSize).to.equal(1);
        expect(scatter.selected.meshPerAttribute).to.equal(2);

        // Decreasing x length
        // it is fine if `x_previous` has not the right size, but the markers number
        // should decrease
        const new_x = new Float32Array([3]);
        scatter.model.set('x', new_x);
        expect(scatter.x.array).to.deep.equal(new_x);
        expect(scatter.x_previous.array).to.deep.equal(new Float32Array([0, 1]));

        expect(scatter.markers_number).to.equal(1);
        expect(scatter.instanced_geometry.maxInstancedCount).to.equal(1);

        // Checking size/opacity/color/selected attributes
        // The meshPerAttribute parameter should not change, as it would trigger
        // a creation of a new attribute (ThreeJS does not support dynamic
        // meshPerAttribute change on an Attribute)
        expect(scatter.size.array).to.deep.equal(new Float32Array([default_size]));
        expect(scatter.size.meshPerAttribute).to.equal(2);

        expect(scatter.opacity.array).to.deep.equal(default_opacities);
        expect(scatter.opacity.meshPerAttribute).to.equal(2);

        expect(scatter.color.array).to.deep.equal(steelblue);
        expect(scatter.color.itemSize).to.equal(3);
        expect(scatter.color.meshPerAttribute).to.equal(2);

        expect(scatter.selected.array).to.deep.equal(new Float32Array([0]));
        expect(scatter.selected.itemSize).to.equal(1);
        expect(scatter.selected.meshPerAttribute).to.equal(2);

        // Decreasing y length
        const new_y = new Float32Array([4]);
        scatter.model.set('y', new_y);
        expect(scatter.x.array).to.deep.equal(new_x);
        expect(scatter.x_previous.array).to.deep.equal(new Float32Array([0, 1]));

        expect(scatter.y.array).to.deep.equal(new_y);
        expect(scatter.y_previous.array).to.deep.equal(new Float32Array([2, 3]));

        expect(scatter.markers_number).to.equal(1);
        expect(scatter.instanced_geometry.maxInstancedCount).to.equal(1);
    });
});
