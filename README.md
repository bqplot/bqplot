# bqplot

[![Travis](https://travis-ci.com/bqplot/bqplot.svg?branch=master)](https://travis-ci.com/bqplot/bqplot)
[![Documentation](https://readthedocs.org/projects/bqplot/badge/?version=latest)](http://bqplot.readthedocs.org)
[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/bqplot/bqplot/stable?filepath=examples/Index.ipynb)
[![Chat](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/jupyter-widgets/Lobby)

2-D plotting library for Project Jupyter

## Introduction

bqplot is a 2-D visualization system for Jupyter, based on the constructs of
the *Grammar of Graphics*.

## Usage

[![Wealth of Nations](./wealth-of-nations.gif)](https://github.com/bqplot/bqplot/blob/master/examples/Applications/Wealth%20Of%20Nations/Bubble%20Chart.ipynb)

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

[![Binder](docs/source/binder-logo.svg)](https://mybinder.org/v2/gh/bqplot/bqplot/stable?filepath=examples/Index.ipynb)

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

To enable bqplot for JupyterLab version 1 or 2 (not needed for JupyterLab 3.0):

```
$ jupyter labextension install @jupyter-widgets/jupyterlab-manager bqplot
```


For a development installation (requires npm (version >= 3.8) and node (version >= 4.0)):

```
$ git clone https://github.com/bqplot/bqplot.git
$ cd bqplot
$ pip install -e .
$ jupyter nbextension install --py --overwrite --symlink --sys-prefix bqplot
$ jupyter nbextension enable --py --sys-prefix bqplot
```

Note for developers: the `--symlink` argument on Linux or OS X allows one to
modify the JavaScript code in-place. This feature is not available
with Windows.

For the experimental JupyterLab extension, install the Python package, make sure the Jupyter widgets extension is installed, and install the bqplot extension:

```
$ pip install "ipywidgets>=7.6"
$ jupyter labextension develop . --overwrite
```

Whenever you make a change of the JavaScript code, you will need to rebuild:

```
cd js
yarn run build
```

Then refreshing the JupyterLab/Jupyter Notebook is enough to reload the changes.

### Loading `bqplot`

```python
# In a Jupyter notebook
import bqplot
```

That's it! You're ready to go!

## Examples

### Using the `pyplot` API

[![Pyplot Screenshot](/pyplot.png)](https://github.com/bqplot/bqplot/blob/master/examples/Basic%20Plotting/Pyplot.ipynb)

### Using the `bqplot` internal object model

[![Bqplot Screenshot](/bqplot.png)](https://github.com/bqplot/bqplot/blob/master/examples/Advanced%20Plotting/Advanced%20Plotting.ipynb)

## Documentation

To get started with using `bqplot`, check out the full documentation

https://bqplot.readthedocs.io/

## Install a previous bqplot version (Only for JupyterLab <= 2)

In order to install a previous bqplot version, you need to know which front-end version (JavaScript) matches with the back-end version (Python).

For example, in order to install bqplot `0.11.9`, you need the labextension version `0.4.9`.

```
$ pip install bqplot==0.11.9
$ jupyter labextension install bqplot@0.4.9
```

Versions lookup table:

| `back-end (Python)` | `front-end (JavaScript)` |
|---------------------|--------------------------|
| 0.12.14             | 0.5.14                   |
| 0.12.13             | 0.5.13                   |
| 0.12.12             | 0.5.12                   |
| 0.12.11             | 0.5.11                   |
| 0.12.10             | 0.5.10                   |
| 0.12.9              | 0.5.9                    |
| 0.12.8              | 0.5.8                    |
| 0.12.7              | 0.5.7                    |
| 0.12.6              | 0.5.6                    |
| 0.12.4              | 0.5.4                    |
| 0.12.3              | 0.5.3                    |
| 0.12.2              | 0.5.2                    |
| 0.12.1              | 0.5.1                    |
| 0.12.0              | 0.5.0                    |
| 0.11.9              | 0.4.9                    |
| 0.11.8              | 0.4.8                    |
| 0.11.7              | 0.4.7                    |
| 0.11.6              | 0.4.6                    |
| 0.11.5              | 0.4.5                    |
| 0.11.4              | 0.4.5                    |
| 0.11.3              | 0.4.4                    |
| 0.11.2              | 0.4.3                    |
| 0.11.1              | 0.4.1                    |
| 0.11.0              | 0.4.0                    |

## Development

See our [contributing guidelines](CONTRIBUTING.md) to know how to contribute and set up a development environment.

## License

This software is licensed under the Apache 2.0 license. See the [LICENSE](LICENSE) file
for details.
