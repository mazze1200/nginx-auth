#!/bin/bash

CONTAINER_ROOT=$(cd $(dirname "${BASH_SOURCE[0]}") && pwd)

podman run -d --name nginx-test --rm --net test -p 80:80 \
    -v "$CONTAINER_ROOT/nginx:/etc/nginx" \
    docker.io/library/nginx:1.27