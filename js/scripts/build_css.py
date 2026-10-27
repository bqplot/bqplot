import re
import json
import subprocess
from pathlib import Path

# paths
root = Path(__file__).parent.parent
package_json = root / "package.json"
less_input = root / "less" / "bqplot.less"
tmp_less_input = root / "less" / "bqplot.tmp.less"
css_output = root / "css" / "bqplot.css"

# load version from package.json
with package_json.open() as f:
    pkg = json.load(f)

version = pkg.get('version')
clean_version = re.sub(r'[^0-9A-Za-z]+', '_', version)

with open(less_input, 'r') as fobj:
    less_code = fobj.read().replace('@{version}', clean_version)

with open(tmp_less_input, 'w') as fobj:
    fobj.write(less_code)

cmd = [
    "lessc",
    str(tmp_less_input),
    str(css_output),
]

print(f"Run command {' '.join(cmd)}")

# run lessc with modify-var
subprocess.run(cmd, check=True)

print(f"Built CSS for bqplot version {version} {clean_version}")
