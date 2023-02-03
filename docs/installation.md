# Installation

Using pip
```shell
pip install bqplot
```

Using conda
```shell
conda install -c conda-forge bqplot
```

If you are using JupyterLab <= 2
```shell
jupyter labextension install @jupyter-widgets/jupyterlab-manager bqplot
```

### Development installation

Development installation (requires JupyterLab version >= 3 and yarn):
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
Refreshing the JupyterLab/Jupyter Notebook is enough to reload the changes.

### Running tests

You can install the dependencies necessary to run the tests with:

```bash
    conda env update -f test-environment.yml
```

And run it with for Python tests:

```bash
    pytest
```

And `cd js` to run the JS tests with:

```bash
yarn run test
```

Every time you make a change on your tests it's necessary to rebuild the JS side:

```bash
yarn run build
```

### Installation Of Older Versions

(Only for JupyterLab <= 2)
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

### License

This software is licensed under the Apache 2.0 license. See the [LICENSE](LICENSE) file
for details.
