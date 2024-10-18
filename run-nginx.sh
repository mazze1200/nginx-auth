#!/bin/bash

CONTAINER_ROOT=$(cd $(dirname "${BASH_SOURCE[0]}") && pwd)

podman run -dt --name nginx-test --rm --net test -p 80:80 \
    -v "${CONTAINER_ROOT}/nginx:/etc/nginx" \
    -v "${CONTAINER_ROOT}/var/log/nginx:/var/log/nginx" \
    docker.io/library/nginx:1.27