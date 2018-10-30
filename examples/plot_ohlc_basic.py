"""
Open-high-low-close chart
=========================

A simple OHLC chart
"""
import numpy as np
from bqplot import pyplot as plt
import datetime as dt


dates = np.arange(dt.datetime(2014, 1, 2), dt.datetime(2014, 1, 30), dt.timedelta(days=1))

prices = np.array([[ 187.21  ,  187.4   ,  185.2   ,  185.53  ],
       [ 185.83  ,  187.35  ,  185.3   ,  186.64  ],
       [ 187.15  ,  187.355 ,  185.3   ,  186.    ],
       [ 186.39  ,  190.35  ,  186.38  ,  189.71  ],
       [ 189.33  ,  189.4175,  187.26  ,  187.97  ],
       [ 189.02  ,  189.5   ,  186.55  ,  187.38  ],
       [ 188.31  ,  188.57  ,  186.28  ,  187.26  ],
       [ 186.26  ,  186.95  ,  183.86  ,  184.16  ],
       [ 185.06  ,  186.428 ,  183.8818,  185.92  ],
       [ 185.82  ,  188.65  ,  185.49  ,  187.74  ],
       [ 187.53  ,  188.99  ,  186.8   ,  188.76  ],
       [ 188.04  ,  190.81  ,  187.86  ,  190.09  ],
       [ 190.23  ,  190.39  ,  186.79  ,  188.43  ],
       [ 181.28  ,  183.5   ,  179.67  ,  182.25  ],
       [ 181.43  ,  183.72  ,  180.71  ,  182.73  ],
       [ 181.25  ,  182.8141,  179.64  ,  179.64  ],
       [ 179.605 ,  179.65  ,  177.66  ,  177.9   ],
       [ 178.05  ,  178.45  ,  176.16  ,  176.85  ],
       [ 175.98  ,  178.53  ,  175.89  ,  176.4   ],
       [ 177.17  ,  177.86  ,  176.36  ,  177.36  ]])
plt.figure(title='Open-high-low-close chart')
plt.ohlc(dates, prices)
plt.show()