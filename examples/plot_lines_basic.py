"""
Line chart
==========

A simple line chart
"""
import numpy as np
from bqplot import pyplot as plt

np.random.seed(0)
n = 200
x = np.linspace(0.0, 10.0, n)
y = np.cumsum(np.random.randn(n))


fig = plt.figure(title='Line Chart')
plt.plot(x, y)
plt.show()

################################################
# Using the object model
# ----------------------
# A similar result can be obtained using the object model.

import bqplot
scales = {'x': bqplot.LinearScale(), 'y': bqplot.LinearScale()}

scatter = bqplot.Lines(x=x, y=y, default_size=100, scales=scales)

axis_x = bqplot.Axis(scale=scales['x'], grid_lines='solid', label='X')
axis_y = bqplot.Axis(scale=scales['y'], orientation='vertical', tick_format='0.2f',
            grid_lines='solid', label='Y')

fig = bqplot.Figure(marks=[scatter], axes=[axis_x, axis_y], title='Line Chart')
fig.interaction = bqplot.PanZoom(scales={'x': [scales['x']], 'y': [scales['y']]})
fig


