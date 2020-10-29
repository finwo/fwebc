#!/bin/sh
# npm install -g uglify-es
uglifyjs --compress --mangle < fwebc.js > fwebc.min.js
