To release a new version of bqplot on PyPI:

## Create a new environment for the release

```sh
conda create -c conda-forge --override-channels -y -n bqplotrelease "jupyterlab=3.2" "nodejs=16" twine ipywidgets pip jupyter_packaging "yarn<2"
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
yarn install
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
git commit -sa -m "Release 0.12.42"
```

Tag the release

```sh
git tag [version, like 0.12.42]
```

Push the changes:
```
git push origin 0.12.x 0.12.42
```

## Update the recipe on conda-forge and set the stable branch to the newly tagged commit

Update the [conda-forge feedstock](https://github.com/conda-forge/bqplot-feedstock/).
