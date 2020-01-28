To release a new version of bqplot on PyPI:

## Create a new environment for the release

```sh
conda create -c conda-forge --override-channels -y -n bqplotrelease jupyterlab nodejs twine ipywidgets pip
conda activate bqplotrelease
```

## Check out a fresh copy of the repo

We check out a fresh copy in a `release/` subdirectory to make sure we do not
overwrite our development repo.

```sh
mkdir -p release
cd release
# Delete any previous checkout we have here.
rm -rf bqplot


git clone git@github.com:bloomberg/bqplot.git
cd bqplot
```

## Release the npm package

```sh
cd js/
npm version [Major/minor/patch]
npm install
npm publish
cd ..
```

## Release the pypi package

Update _version.py (bump both the python package version, and if needed, the Javascript version)

```
git clean -dfx
python setup.py sdist
python setup.py bdist_wheel
twine upload dist/*
```

## Tag the repository

Check to make sure the only changes are to the `package.json`, `package-lock.json`, and `_version.py` files:

```sh
git diff
```

Commit the changes in git

```sh
git commit -sa
```

Tag the release

```sh
git tag [version, like 0.12.4]
```

Push your change to a new PR and ask for a review to merge the PR.

## Update the recipe on conda-forge and set the stable branch to the newly tagged commit

Update the [conda-forge feedstock](https://github.com/conda-forge/bqplot-feedstock/).
