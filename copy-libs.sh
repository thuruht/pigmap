#!/bin/bash
# Script to copy dependencies from node_modules to public/lib for browser access

# Create lib directory if it doesn't exist
mkdir -p public/lib/leaflet
mkdir -p public/lib/gsap

# Copy Leaflet files (CDN is used in HTML, but we'll have a local copy as backup)
cp -r node_modules/leaflet/dist/* public/lib/leaflet/

# Copy GSAP files
cp -r node_modules/gsap/* public/lib/gsap/

# Copy ES Module Shims
cp node_modules/es-module-shims/dist/es-module-shims.js public/lib/

echo "Dependencies copied successfully to public/lib/"
