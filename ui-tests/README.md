# Visual regression tests using Galata

This directory contains visual regression tests for bqplot, using Galata.

In order to run them, you need to install dependencies:

```bash
conda install -c conda-forge jupyterlab=4

jlpm install
```

Then start JupyterLab in one terminal (you need to check that it properly starts on port 8888):
```bash
jlpm run start-jlab
```

Finally, run the galata tests:
```bash
jlpm run test
```

If bqplot visuals change, you can re-generate reference images by running:
```bash
jlpm run update-references
```

## Notebooks directory

The `tests/notebooks` directory contains the test notebooks. For most notebooks (*e.g.* `bars.ipynb`, `scatter.ipynb`) Galata will run them cell by cell and take a screenshot of each output, comparing with the reference images.

When running notebooks named `*_update.ipynb`, Galata will always take the first cell output as reference which must contain the plot, later cells will only be used to update the plot, those notebooks are checking that bqplot is properly taking updates into account on already-created plots.

## Add a new test

You can add a new test by simply adding a new notebook to the `tests/notebooks` directory and updating the references. If you want to test updating plots, create notebook named `*_update.ipynb`, create a plot in your first cell then update the plot in later cells.
