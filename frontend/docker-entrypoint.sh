#!/bin/sh

# Replace placeholders in env.template.js with environment variables
envsubst < /usr/share/nginx/html/assets/env.template.js > /usr/share/nginx/html/assets/env.js

# Execute the CMD passed to the docker container
exec "$@"
