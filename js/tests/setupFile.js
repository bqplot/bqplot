// This is needed for ipywidgets
import $ from 'jquery';
import jestConfig from '../jest.config';
$.ui = {};
$.widget = () => {};
global.$ = global.jQuery = $;
