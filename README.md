# bqplot

[![Travis](https://travis-ci.com/bloomberg/bqplot.svg?branch=master)](https://travis-ci.com/bloomberg/bqplot)
[![Documentation](https://readthedocs.org/projects/bqplot/badge/?version=latest)](http://bqplot.readthedocs.org)
[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/bloomberg/bqplot/stable?filepath=examples/Index.ipynb)
[![Chat](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/jupyter-widgets/Lobby)

2-D plotting library for Project Jupyter

## Introduction

bqplot is a 2-D visualization system for Jupyter, based on the constructs of
the *Grammar of Graphics*.

## Usage

[![Wealth of Nations](./wealth-of-nations.gif)](https://github.com/bloomberg/bqplot/blob/master/examples/Applications/Wealth%20of%20Nations.ipynb)

In bqplot, every component of a plot is an interactive widget. This allows the
user to integrate visualizations with other Jupyter interactive widgets to
create integrated GUIs with a few simple lines of Python code.

## Goals

-   provide a unified framework for 2-D visualizations with a pythonic API.
-   provide a sensible API for adding user interactions (panning, zooming, selection, etc)

Two APIs are provided

- Users can build custom visualizations using the internal object model, which
  is inspired by the constructs of the Grammar of Graphics (figure, marks, axes,
  scales), and enrich their visualization with our Interaction Layer.
- Or they can use the context-based API similar to Matplotlib's pyplot, which
  provides sensible default choices for most parameters.

## Trying it online

To try out bqplot interactively in your web browser, just click on the binder
link:

[![Binder](docs/source/binder-logo.svg)](https://mybinder.org/v2/gh/bloomberg/bqplot/0.11.x?filepath=examples/Index.ipynb)

### Dependencies

This package depends on the following packages:

- `ipywidgets` (version >=7.0.0, <8.0)
- `traitlets` (version >=4.3.0, <5.0)
- `traittypes` (Version >=0.2.1, <0.3)
- `numpy`
- `pandas`

### Installation

Using pip:

```
$ pip install bqplot
```

Using conda

```
$ conda install -c conda-forge bqplot
```

To enable bqplot with Jupyter lab:

```
$ jupyter labextension install bqplot
```


For a development installation (requires npm (version >= 3.8) and node (version >= 4.0)):

```
$ git clone https://github.com/bloomberg/bqplot.git
$ cd bqplot
$ pip install -e .
$ jupyter nbextension install --py --symlink --sys-prefix bqplot
$ jupyter nbextension enable --py --sys-prefix bqplot
```

Note for developers: the `--symlink` argument on Linux or OS X allows one to
modify the JavaScript code in-place. This feature is not available
with Windows.

For the experimental JupyterLab extension, install the Python package, make sure the Jupyter widgets extension is installed, and install the bqplot extension:

```
$ pip install bqplot
$ jupyter labextension install @jupyter-widgets/jupyterlab-manager # install the Jupyter widgets extension
$ jupyter labextension install bqplot
```

### Loading `bqplot`

```python
# In a Jupyter notebook
import bqplot
```

That's it! You're ready to go!

## Examples

### Using the `pyplot` API

[![Pyplot Screenshot](/pyplot.png)](https://github.com/bloomberg/bqplot/blob/master/examples/Basic%20Plotting/Pyplot.ipynb)

### Using the `bqplot` internal object model

[![Bqplot Screenshot](/bqplot.png)](https://github.com/bloomberg/bqplot/blob/master/examples/Advanced%20Plotting/Advanced%20Plotting.ipynb)

## Documentation

To get started with using `bqplot`, check out the full documentation

https://bqplot.readthedocs.io/

## License

This software is licensed under the Apache 2.0 license. See the [LICENSE](LICENSE) file
for details.

