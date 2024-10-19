#!/bin/bash

CONTAINER_ROOT=$(cd $(dirname "${BASH_SOURCE[0]}") && pwd)

podman run -dt --name whoami --rm --net test  \
    traefik/whoami

