# Contributing to bqplot

## Fork and clone

Fork the repository on GitHub, then clone your fork and add the main repository
as `upstream`:

```bash
git clone https://github.com/<your-github-user>/bqplot.git
cd bqplot
git remote add upstream https://github.com/bqplot/bqplot.git
git remote -v
```

Before starting a change, sync your local `master` branch with upstream and
create a feature branch:

```bash
git switch master
git fetch upstream
git rebase upstream/master
git switch -c <branch-name>
```

## Conforming with linters

This project uses both [eslint](https://eslint.org/) and [prettier](https://github.com/prettier/prettier) and the plugin that creates the integration between both, [eslint-plugin-prettier](https://github.com/prettier/eslint-plugin-prettier) to lint its code.

Currently there has been an active effort on making the project comply with all eslint rules so the eslint rules are currently not enforced.

Prettier rules are enforced, and you can run them in the `js` folder with:

```bash
yarn prettier --write .
```

The configuration of this project linters were based in the [widgets-cookiecutter](https://github.com/jupyter-widgets/widget-ts-cookiecutter/tree/master/%7B%7Bcookiecutter.github_project_name%7D%7D).

## Development installation

For a development installation (requires JupyterLab (version >= 4) and yarn):

```bash
pip install -e .
```

If you're using **Jupyter Notebook < 7**, you may need to run the following to
enable the nbextension:

```bash
jupyter nbextension install --py --overwrite --symlink --sys-prefix bqplot
jupyter nbextension enable --py --sys-prefix bqplot
```

Note for developers: the `--symlink` argument on Linux or OS X allows one to
modify the JavaScript code in-place. This feature is not available with
Windows.

For the experimental JupyterLab extension, install the Python package, make
sure the Jupyter widgets extension is installed, and install the `bqplot`
extension:

```bash
pip install "ipywidgets>=7.6"
jupyter labextension develop . --overwrite
```

Whenever you make a change of the JavaScript code, you will need to rebuild:

```bash
cd js
jlpm run build
```

Then refreshing the JupyterLab/Jupyter Notebook is enough to reload the
changes.

## Running tests

You can install the dependencies necessary to run the tests with:

```bash
conda env update -f test-environment.yml
```

Run the Python tests with:

```bash
pytest
```

Run the JS tests from the `js` directory with:

```bash
cd js
jlpm run test
```

Every time you make a change to your tests, it is necessary to rebuild the JS
side:

```bash
jlpm run build
```

## Governance and code of conduct

`bqplot` is subject to the [bqplot governance](https://github.com/bqplot/governance/blob/master/governance.md) and the [bqplot code of conduct](https://github.com/bqplot/governance/blob/master/code_of_conduct.md).

## Questions

Should you have any questions, please do not hesitate to reach out to us on the [ipywidgets gitter chat](https://gitter.im/jupyter-widgets/Lobby).

## Help / Documentation

- API reference documentation: [![Read the documentation of the stable version](https://readthedocs.org/projects/pip/badge/?version=stable)](http://bqplot.readthedocs.org/en/stable/) [![Read the documentation of the development version](https://readthedocs.org/projects/pip/badge/?version=latest)](http://bqplot.readthedocs.org/en/latest/)

- Talk to us on the `ipywidgets` Gitter chat: [![Join the chat at https://gitter.im/ipython/ipywidgets](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ipython/ipywidgets?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
