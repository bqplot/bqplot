To release a new version of bqplot on PyPI:

## Cleanup the repository

git clean -fdx

## Release the npm package

cd js/
npm version [Major/minor/patch]
npm install
npm publish

## Release the pypi package

Update _version.py (set release version, remove 'dev')
git clean -dfx
python setup.py sdist
python setup.py bdist_wheel
twine upload dist/*

## Tag the repository

git add and git commit
git tag -a X.X.X -m 'comment'
git push upstream
git push upstream --tags

## Update the recipe on conda-forge and set the stable branch to the newly tagged commit

git checkout stable
git reset master
git push upstream stable

## Back to dev

git checkout master
Update _version.py (add 'dev' and increment minor)
git add and git commit
git push upstream master
