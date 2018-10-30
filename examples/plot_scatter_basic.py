"""
Scatter
=======

A simple scatter plot

Using the pylab API
-------------------
"""
import bqplot.pyplot as plt
import numpy as np
# create some random data
N = 1000
x, y = np.random.normal(0, 1, (2, N))

fig = plt.figure(title='Scatter plot')
s = plt.scatter(x, y, default_size=100)
plt.show()


################################################
# Using the object model
# ----------------------
# A similar result can be obtained using the object model.


import bqplot
scales = {'x': bqplot.LinearScale(), 'y': bqplot.LinearScale()}

scatter = bqplot.Scatter(x=x, y=y, default_size=100, scales=scales)

axis_x = bqplot.Axis(scale=scales['x'], grid_lines='solid', label='X')
axis_y = bqplot.Axis(scale=scales['y'], orientation='vertical', tick_format='0.2f',
            grid_lines='solid', label='Y')

fig = bqplot.Figure(marks=[scatter], axes=[axis_x, axis_y], title='Scatter plot')
fig.interaction = bqplot.PanZoom(scales={'x': [scales['x']], 'y': [scales['y']]})
fig

