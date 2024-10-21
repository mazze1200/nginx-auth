#!/bin/bash

CONTAINER_ROOT=$(cd $(dirname "${BASH_SOURCE[0]}") && pwd)

podman run -dt --name nginx-test --rm --net test -p 80:80 \
    -v "${CONTAINER_ROOT}/nginx-sample-config/nginx.conf:/etc/nginx/nginx.conf" \
    -v "${CONTAINER_ROOT}/nginx-sample-config/default.conf:/etc/nginx/conf.d/default.conf" \
    -v "${CONTAINER_ROOT}/src/:/etc/nginx/github_auth/" \
    -v "${CONTAINER_ROOT}/var/log/nginx:/var/log/nginx" \
    docker.io/library/nginx:1.27