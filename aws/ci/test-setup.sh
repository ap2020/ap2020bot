#!/bin/bash -eu
set -eu
pushd $(dirname $0)

if [[ ! -f ../.env.local.json ]]; then
    echo '{}' > ../.env.local.json
fi

popd
