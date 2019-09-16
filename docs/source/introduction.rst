.. _introduction:

Introduction
============

bqplot is a Grammar of Graphics-based interactive plotting framework for the Jupyter notebook.

.. image:: ../../wealth-of-nations.gif

In bqplot, every single attribute of the plot is an interactive widget. This allows the user to integrate any plot with IPython widgets to create a complex and feature rich GUI from just a few simple lines of Python code.

Goals
-----

 - provide a unified framework for 2-D visualizations with a pythonic API.
 - provide a sensible API for adding user interactions (panning, zooming, selection, etc)

Two APIs are provided

 - Users can build custom visualizations using the internal object model, which is inspired by the constructs of the Grammar of Graphics (figure, marks, axes, scales), and enrich their visualization with our Interaction Layer.
 - Or they can use the context-based API similar to Matplotlib's pyplot, which provides sensible default choices for most parameters.

Installation
------------

Using pip:

.. code:: bash

    pip install bqplot
    jupyter nbextension enable --py --sys-prefix bqplot  # can be skipped for notebook version 5.3 and above

Using conda

.. code:: bash

    conda install -c conda-forge bqplot
