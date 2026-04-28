# Releasing bqplot

The release process is automated via GitHub Actions and trusted publishers.
The legacy manual process is documented at the bottom of this file as a
fallback.

## Automated release flow

Both PyPI and the npm package are published from the same artifact that the
`build` job produces in CI, so what ships is exactly what was tested by the
visual-regression suite.

### One-time setup (already configured)

- PyPI Trusted Publisher entry on https://pypi.org/manage/project/bqplot/settings/publishing/
  pointing at workflow `build.yml` and environment `release-pypi`.
- npm Trusted Publisher entry on npmjs.com pointing at workflow `build.yml`
  and environment `release-npm`.
- GitHub Environments `release-pypi` and `release-npm` configured in the
  repo, optionally with required reviewers for an extra approval gate.

### Cutting a release

1. On the appropriate branch (`0.12.x` for the 0.12.x line, `master` for the
   next major), bump the versions:
   - `bqplot/_version.py` — Python package version (e.g. `0.12.46`)
   - `js/package.json` — npm package version (e.g. `0.5.47`); also update
     `js/package-lock.json` by running `yarn install`
   - If the JS major/minor changed, update `__frontend_version__` in
     `bqplot/_version.py` to match.

2. Commit the bump and open a PR. Wait for CI to go green — the publish jobs
   run in dry-run mode (`twine check`, `npm publish --dry-run`) so any
   metadata problem is caught before release.

3. Merge the PR.

4. Create a GitHub Release on the merge commit:
   - **Tag**: the Python version, no `v` prefix (e.g. `0.12.46`). The tag
     must match `bqplot/_version.py` — CI will fail the publish step
     otherwise.
   - **Target**: the branch you merged into (e.g. `0.12.x`).
   - **Title** and notes: as you like.

5. Publishing the release fires the workflow with `event_name == 'release'`.
   The workflow rebuilds the wheel/sdist/tgz, re-runs the visual-regression
   tests on the built wheel, then `publish-pypi` and `publish-npm` upload
   via OIDC. If you set required reviewers on the environments, GitHub will
   pause for your approval before each upload.

6. Update the [conda-forge feedstock](https://github.com/conda-forge/bqplot-feedstock/)
   (still manual).

### If a publish step fails

The `dist/` artifact from the run is preserved on the workflow run page. Fix
the underlying issue (typically a misconfigured trusted publisher entry on
PyPI/npm), then click **Re-run failed jobs** — no rebuild or retag needed.

---

## Legacy manual release process (deprecated)

Kept for reference / emergency use only. Prefer the automated flow above.

### Create a new environment for the release

```sh
conda create -c conda-forge --override-channels -y -n bqplotrelease "jupyterlab=3.2" "nodejs=16" twine ipywidgets pip jupyter_packaging "yarn<2"
conda activate bqplotrelease
```

### Check out a fresh copy of the repo

```sh
mkdir -p release
cd release
rm -rf bqplot
git clone git@github.com:bqplot/bqplot.git
cd bqplot
```

### Release the npm package

```sh
cd js/
npm version [Major/minor/patch]
yarn install
npm publish
cd ..
```

### Release the pypi package

Update `_version.py` (bump both the python package version, and if needed,
the Javascript version).

```
git clean -dfx
python setup.py sdist
python setup.py bdist_wheel
twine upload dist/*
```

### Tag the repository

Check that the only changes are to `package.json`, `package-lock.json`, and
`_version.py`:

```sh
git diff
```

Commit and tag:

```sh
git commit -sa -m "Release 0.12.42"
git tag [version, like 0.12.42]
git push origin 0.12.x 0.12.42
```

### Update conda-forge

Update the [conda-forge feedstock](https://github.com/conda-forge/bqplot-feedstock/).
