#!/bin/bash

inotifywait -m -r  -e close_write nginx/ | while read path action file; do
    echo "Reload $path $action $file"
    ./reload.sh; 
done