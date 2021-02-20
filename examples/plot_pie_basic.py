"""
Pie chart
=========

A simple pie chart
"""
import numpy as np
from bqplot import pyplot as plt

np.random.seed(0)
n = 5
y = np.cumsum(np.random.randn(n))

fig = plt.figure(title='Pie Chart')
plt.pie(y)
plt.show()
