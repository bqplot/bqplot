#!/bin/bash
set -e

yarn install --verbose

echo Will run 'wait-for-it' $*
$(dirname $0)/wait-for-it.sh $*
