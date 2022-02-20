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

export * from './Axis';
export * from './GridHeatMapModel';
export * from './Mark';
export * from './AxisModel';
export * from './HandDraw';
export * from './MarkModel';
export * from './Bars';
export * from './HandDrawModel';
export * from './OHLC';
export * from './BarsModel';
export * from './Hist';
export * from './OHLCModel';
export * from './HistModel';
export * from './SelectorModel';
export * from './Boxplot';
export * from './IndexSelector';
export * from './BoxplotModel';
export * from './Interaction';
export * from './Label';
export * from './LabelModel';
export * from './BrushSelector';
export * from './LassoSelector';
export * from './PanZoom';
export * from './ColorAxis';
export * from './lasso_test';
export * from './PanZoomModel';
export * from './colorbrewer';
export * from './Pie';
export * from './ColorUtils';
export * from './PieModel';
export * from './Lines';
export * from './Scatter';
export * from './LinesModel';
export * from './ScatterModel';
export * from './FastIntervalSelector';
export * from './Selector';
export * from './Figure';
export * from './FigureModel';
export * from './Map';
export * from './Tooltip';
export * from './TooltipModel';
export * from './FlexLine';
export * from './MapModel';
export * from './Markers';
export * from './utils';
export * from './serialize';
export * from './MarketMap';
export * from './GridHeatMap';
export * from './MarketMapModel';
export * from './HeatMap';
export * from './HeatMapModel';
export * from './Toolbar';
export * from './GraphModel';
export * from './Graph';
export * from './Image';
export * from './ImageModel';

// Temporary for backward compatibility
export * from 'bqscales';

import packageJson from '../package.json';

const { version } = packageJson;

export { version };
