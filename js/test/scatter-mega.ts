import { expect } from 'chai';
import {DummyManager} from './dummy-manager';
import * as bqplot from '..';
import {create_model, create_model_bqplot, create_view, create_figure_scatter} from './widget-utils'
import * as d3 from 'd3';
import {Color} from 'three';


let r = [1., 0., 0.];
let g = [0., 1., 0.];
let b = [0., 0., 1.];
// let sb_color = new Color('steelblue');
let sb = [0.27450981736183167, 0.5098039507865906, 0.7058823704719543];


describe("scatter mega >", () => {
    beforeEach(async function() {
        this.manager = new DummyManager({bqplot: bqplot});
    });

    it("size", async function() {
        let x = {dtype: 'float32', value: new DataView((new Float32Array([0,1])).buffer)}
        let y = {dtype: 'float32', value: new DataView((new Float32Array([2,3])).buffer)}
        let objects = await create_figure_scatter(this.manager, x, y, true);
        let scatter = objects.scatter;
        let default_size = scatter.model.get('default_size')

        expect(scatter.attributes.scalar['size']).to.equal(default_size)
        expect(scatter.attributes_previous.scalar['size']).to.equal(default_size)
        
        scatter.model.set('default_size', default_size*2)
        expect(scatter.attributes.scalar['size']).to.equal(default_size*2)
        expect(scatter.attributes_previous.scalar['size']).to.equal(default_size)

        // we push an array, the previous should be a scalar
        scatter.model.set('size', new Float32Array([0., 0.5]))
        expect(Array.from(scatter.attributes.array['size'])).to.deep.equal([0., 0.5])
        expect(scatter.attributes.scalar['size']).to.be.undefined
        expect(scatter.attributes_previous.scalar['size']).to.equal(default_size*2)
        expect(scatter.attributes_previous.array['size']).to.be.undefined
        
        scatter.model.set('size', new Float32Array([0.5, 1.0]))
        expect(Array.from(scatter.attributes.array['size'])).to.deep.equal([0.5, 1.0])
        expect(Array.from(scatter.attributes_previous.array['size'])).to.deep.equal([0., 0.5])
        expect(scatter.attributes.scalar['size']).to.be.undefined
        expect(scatter.attributes_previous.scalar['size']).to.be.undefined

    })
    it("opacity", async function() {
        let x = {dtype: 'float32', value: new DataView((new Float32Array([0,1,2])).buffer)}
        let y = {dtype: 'float32', value: new DataView((new Float32Array([2,3,3])).buffer)}
        let objects = await create_figure_scatter(this.manager, x, y, true);
        let scatter = objects.scatter;

        expect(scatter.attributes         .array      ['opacity']).to.be.undefined
        expect(scatter.attributes         .array_vec3 ['opacity']).to.be.undefined
        // expect(scatter.attributes         .scalar     ['opacity']).to.be.undefined
        expect(scatter.attributes         .scalar_vec3['opacity']).to.be.undefined
        expect(scatter.attributes_previous.array      ['opacity']).to.be.undefined
        expect(scatter.attributes_previous.array_vec3 ['opacity']).to.be.undefined
        // expect(scatter.attributes_previous.scalar     ['opacity']).to.be.undefined
        expect(scatter.attributes_previous.scalar_vec3['opacity']).to.be.undefined
        expect(Array.from(scatter.attributes         .scalar['opacity'])).to.deep.equal([1.])
        expect(Array.from(scatter.attributes_previous.scalar['opacity'])).to.deep.equal([1.])

        scatter.model.set('default_opacities', new Float32Array([0.5]))
        expect(scatter.attributes         .array      ['opacity']).to.be.undefined
        expect(scatter.attributes         .array_vec3 ['opacity']).to.be.undefined
        // expect(scatter.attributes         .scalar     ['opacity']).to.be.undefined
        expect(scatter.attributes         .scalar_vec3['opacity']).to.be.undefined
        expect(scatter.attributes_previous.array      ['opacity']).to.be.undefined
        expect(scatter.attributes_previous.array_vec3 ['opacity']).to.be.undefined
        // expect(scatter.attributes_previous.scalar     ['opacity']).to.be.undefined
        expect(scatter.attributes_previous.scalar_vec3['opacity']).to.be.undefined
        expect(Array.from(scatter.attributes         .scalar['opacity'])).to.deep.equal([0.5])
        expect(Array.from(scatter.attributes_previous.scalar['opacity'])).to.deep.equal([1.0])

        scatter.model.set('default_opacities', new Float32Array([0.5, 1.0]))
        // expect(scatter.attributes         .array      ['opacity']).to.be.undefined
        expect(scatter.attributes         .array_vec3 ['opacity']).to.be.undefined
        expect(scatter.attributes         .scalar     ['opacity']).to.be.undefined
        expect(scatter.attributes         .scalar_vec3['opacity']).to.be.undefined
        expect(scatter.attributes_previous.array      ['opacity']).to.be.undefined
        expect(scatter.attributes_previous.array_vec3 ['opacity']).to.be.undefined
        // expect(scatter.attributes_previous.scalar     ['opacity']).to.be.undefined
        expect(scatter.attributes_previous.scalar_vec3['opacity']).to.be.undefined
        expect(Array.from(scatter.attributes         .array['opacity'])).to.deep.equal([0.5, 1.0, 0.5])
        expect(Array.from(scatter.attributes_previous.scalar['opacity'])).to.deep.equal([0.5])

        scatter.model.set('opacity', new Float32Array([0.5, 1.0, 2.0]))
        // expect(scatter.attributes         .array      ['opacity']).to.be.undefined
        expect(scatter.attributes         .array_vec3 ['opacity']).to.be.undefined
        expect(scatter.attributes         .scalar     ['opacity']).to.be.undefined
        expect(scatter.attributes         .scalar_vec3['opacity']).to.be.undefined
        // expect(scatter.attributes_previous.array      ['opacity']).to.be.undefined
        expect(scatter.attributes_previous.array_vec3 ['opacity']).to.be.undefined
        expect(scatter.attributes_previous.scalar     ['opacity']).to.be.undefined
        expect(scatter.attributes_previous.scalar_vec3['opacity']).to.be.undefined
        expect(Array.from(scatter.attributes         .array['opacity'])).to.deep.equal([0.5, 1.0, 2.0])
        expect(Array.from(scatter.attributes_previous.array['opacity'])).to.deep.equal([0.5, 1.0, 0.5])


    });
    it("colors", async function() {
        let x = {dtype: 'float32', value: new DataView((new Float32Array([0,1])).buffer)}
        let y = {dtype: 'float32', value: new DataView((new Float32Array([2,3])).buffer)}
        let objects = await create_figure_scatter(this.manager, x, y, true);
        let scatter = objects.scatter;

        expect(scatter.attributes         .array      ['color']).to.be.undefined
        expect(scatter.attributes         .array_vec3 ['color']).to.be.undefined
        expect(scatter.attributes         .scalar     ['color']).to.be.undefined
        // expect(scatter.attributes         .scalar_vec3['color']).to.be.undefined
        expect(scatter.attributes_previous.array      ['color']).to.be.undefined
        expect(scatter.attributes_previous.array_vec3 ['color']).to.be.undefined
        expect(scatter.attributes_previous.scalar     ['color']).to.be.undefined
        // expect(scatter.attributes_previous.scalar_vec3['color']).to.be.undefined
        expect(Array.from(scatter.attributes         .scalar_vec3['color'])).to.deep.equal(sb)
        expect(Array.from(scatter.attributes_previous.scalar_vec3['color'])).to.deep.equal(sb)

        scatter.model.set('colors', ['red'])
        expect(scatter.attributes         .array      ['color']).to.be.undefined
        expect(scatter.attributes         .array_vec3 ['color']).to.be.undefined
        expect(scatter.attributes         .scalar     ['color']).to.be.undefined
        // expect(scatter.attributes         .scalar_vec3['color']).to.be.undefined
        expect(scatter.attributes_previous.array      ['color']).to.be.undefined
        expect(scatter.attributes_previous.array_vec3 ['color']).to.be.undefined
        expect(scatter.attributes_previous.scalar     ['color']).to.be.undefined
        // expect(scatter.attributes_previous.scalar_vec3['color']).to.be.undefined
        expect(Array.from(scatter.attributes         .scalar_vec3['color'])).to.deep.equal(r)
        expect(Array.from(scatter.attributes_previous.scalar_vec3['color'])).to.deep.equal(sb)

        scatter.model.set('color', new Float32Array([0.5, 1.]))
        // expect(scatter.attributes         .array      ['color']).to.be.undefined
        expect(scatter.attributes         .array_vec3 ['color']).to.be.undefined
        expect(scatter.attributes         .scalar     ['color']).to.be.undefined
        expect(scatter.attributes         .scalar_vec3['color']).to.be.undefined
        expect(scatter.attributes_previous.array      ['color']).to.be.undefined
        expect(scatter.attributes_previous.array_vec3 ['color']).to.be.undefined
        expect(scatter.attributes_previous.scalar     ['color']).to.be.undefined
        // expect(scatter.attributes_previous.scalar_vec3['color']).to.be.undefined
        expect(Array.from(scatter.attributes         .array['color'])).to.deep.equal([0.5, 1.0])
        expect(Array.from(scatter.attributes_previous.scalar_vec3['color'])).to.deep.equal(r)


    });
    it("selection", async function() {
        let x = {dtype: 'float32', value: new DataView((new Float32Array([0,1])).buffer)}
        let y = {dtype: 'float32', value: new DataView((new Float32Array([2,3])).buffer)}
        let objects = await create_figure_scatter(this.manager, x, y, true);
        let scatter = objects.scatter;


        // 2 is 'out of bounds'
        scatter.model.set('selected', [1,2])
        scatter.update_geometry()
        expect(Array.from(scatter.attributes                .array['selected'])).to.deep.equal([0,1,1])
        expect(Array.from(scatter.attributes_previous.       array['selected'])).to.deep.equal([0,1,1])
        expect(Array.from(scatter.attributes_active         .array['selected'])).to.deep.equal([0,1])
        expect(Array.from(scatter.attributes_active_previous.array['selected'])).to.deep.equal([0,1])

        scatter.model.set('x', new Float32Array([3,2,10,20]))
        scatter.model.set('y', new Float32Array([4,2,2,3]))
        // we don't want the length of selected to hold us back
        expect(scatter.attributes.length).to.equal(4)
        expect(scatter.attributes_previous.length).to.equal(2)
        expect(Array.from(scatter.attributes                .array['selected'])).to.deep.equal([0,1,1,0])
        expect(Array.from(scatter.attributes_previous       .array['selected'])).to.deep.equal([0,1,1,0])
        expect(Array.from(scatter.attributes_active         .array['selected'])).to.deep.equal([0,1,1,0])
        expect(Array.from(scatter.attributes_active_previous.array['selected'])).to.deep.equal([0,1,1,0])
        expect(scatter.attributes_active.length).to.equal(4)
        expect(scatter.attributes_active_previous.length).to.equal(4)

        scatter.model.set('selected', [2])
        expect(Array.from(scatter.attributes         .array['selected'])).to.deep.equal([0,0,1,0])
        expect(Array.from(scatter.attributes_previous.array['selected'])).to.deep.equal([0,0,1,0])
        expect(scatter.attributes.length).to.equal(4)
        expect(scatter.attributes_previous.length).to.equal(2)
        expect(scatter.attributes_active.length).to.equal(4)
        expect(scatter.attributes_active_previous.length).to.equal(4)

    });
    it("basics", async function() {
        let x = {dtype: 'float32', value: new DataView((new Float32Array([0,1])).buffer)}
        let y = {dtype: 'float32', value: new DataView((new Float32Array([2,3])).buffer)}
        let objects = await create_figure_scatter(this.manager, x, y, true);
        let scatter = objects.scatter;


        // expect(scatter.attributes         .array      ['x']).to.be.undefined
        expect(scatter.attributes         .array_vec3 ['x']).to.be.undefined
        expect(scatter.attributes         .scalar     ['x']).to.be.undefined
        expect(scatter.attributes         .scalar_vec3['x']).to.be.undefined
        // expect(scatter.attributes_previous.array      ['x']).to.be.undefined
        expect(scatter.attributes_previous.array_vec3 ['x']).to.be.undefined
        expect(scatter.attributes_previous.scalar     ['x']).to.be.undefined
        expect(scatter.attributes_previous.scalar_vec3['x']).to.be.undefined
        expect(Array.from(scatter.attributes         .array['x'])).to.deep.equal([0,1])
        expect(Array.from(scatter.attributes_previous.array['x'])).to.deep.equal([0,1])


        scatter.model.set('x', new Float32Array([1,2]))
        expect(Array.from(scatter.attributes         .array['x'])).to.deep.equal([1,2])
        expect(Array.from(scatter.attributes_previous.array['x'])).to.deep.equal([0,1])
        expect(scatter.attributes.length).to.equal(2)
        expect(scatter.attributes_previous.length).to.equal(2)

        scatter.model.set('x', new Float32Array([3,2,10]))
        scatter.model.set('y', new Float32Array([4,2,2]))
        expect(scatter.attributes.length).to.equal(3)
        expect(scatter.attributes_previous.length).to.equal(2)
        expect(scatter.attributes_active.length).to.equal(3)
        expect(scatter.attributes_active_previous.length).to.equal(3)
        expect(Array.from(scatter.attributes_active         .array['x'])).to.deep.equal([3,2,10])
        expect(Array.from(scatter.attributes_active_previous.array['x'])).to.deep.equal([1,2,10])
        let s = scatter.model.get('default_size')
        expect(Array.from(scatter.attributes_active         .array['size'])).to.deep.equal([s,s,s])
        expect(Array.from(scatter.attributes_active_previous.array['size'])).to.deep.equal([s,s,0])

        scatter.model.set('x', new Float32Array([9]))
        scatter.model.set('y', new Float32Array([8]))
        expect(scatter.attributes.length).to.equal(1)
        expect(scatter.attributes_previous.length).to.equal(3)
        expect(scatter.attributes_active.length).to.equal(3)
        expect(scatter.attributes_active_previous.length).to.equal(3)
        expect(Array.from(scatter.attributes_active         .array['x'])).to.deep.equal([9,2,10])
        expect(Array.from(scatter.attributes_active_previous.array['x'])).to.deep.equal([3,2,10])
        expect(Array.from(scatter.attributes_active         .array['size'])).to.deep.equal([s,0,0])
        expect(Array.from(scatter.attributes_active_previous.array['size'])).to.deep.equal([s,s,s])

    });
});