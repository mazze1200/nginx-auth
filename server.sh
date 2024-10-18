#!/bin/bash

CONTAINER_ROOT=$(cd $(dirname "${BASH_SOURCE[0]}") && pwd)

podman run -it --name server --rm --net test -p 3000:3000 \
    -v "$CONTAINER_ROOT:$CONTAINER_ROOT" \
    --workdir "$CONTAINER_ROOT" \
    node:alpine \
    server.js