import {
    expect
} from 'chai';

import {
    DummyManager
} from './dummy-manager';

import * as bqplot from '..';

import {
    create_figure_image, create_model
} from './widget-utils'

import {
    testX, testY, pixelRed, redPngData, redPngDataUrl
} from './common';

import * as d3Timer from 'd3-timer';

describe("image >", () => {
    beforeEach(async function() {
        this.manager = new DummyManager({bqplot: bqplot});
    });

    it("image buffer", async function() {
        let png_buffer = new DataView((new Uint8Array(redPngData)).buffer);
        let ipywidgetImage = await create_model(this.manager, '@jupyter-widgets/controls', 'ImageModel', 'ImageView', 'im1', {
            value: png_buffer, format: "png"
        });
        let {figure} = await create_figure_image(this.manager, ipywidgetImage);

        d3Timer.timerFlush(); // this makes sure the animations are all executed
        const canvas = await figure.get_rendered_canvas();
        const context = canvas.getContext("2d");
        const pixel = context.getImageData(testX, testY, 1, 1);
        expect(Array.prototype.slice.call(pixel.data)).to.deep.equals(pixelRed);
    });
    it("image data url", async function() {
        let png_buffer = new DataView((new TextEncoder().encode(redPngDataUrl)).buffer);
        let ipywidgetImage = await create_model(this.manager, '@jupyter-widgets/controls', 'ImageModel', 'ImageView', 'im1', {
            value: png_buffer, format: "url"
        });
        let {figure} = await create_figure_image(this.manager, ipywidgetImage);

        d3Timer.timerFlush(); // this makes sure the animations are all executed
        const canvas = await figure.get_rendered_canvas();
        const context = canvas.getContext("2d");
        const pixel = context.getImageData(testX, testY, 1, 1);
        expect(Array.prototype.slice.call(pixel.data)).to.deep.equals(pixelRed);
    });
});
