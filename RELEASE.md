To release a new version of bqplot on PyPI:

Update _version.py (set release version, remove 'dev')
Update bqplot/js/package.json version
git clean -dfx
python setup.py sdist
python setup.py bdist_wheel --universal
twine upload dist/*
cd js/
npm publish
cd ../jslab
npm publish

git add and git commit
git tag -a X.X.X -m 'comment'
Update _version.py (add 'dev' and increment minor)
git add and git commit
git push
git push --tags
