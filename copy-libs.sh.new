#!/bin/bash
# Script to copy dependencies from node_modules to public/lib for browser access

# Create lib directory if it doesn't exist
mkdir -p public/lib/ol
mkdir -p public/lib/gsap

# Copy OpenLayers files
cp -r node_modules/ol/* public/lib/ol/

# Copy GSAP files
cp -r node_modules/gsap/* public/lib/gsap/

# Copy ES Module Shims
cp node_modules/es-module-shims/dist/es-module-shims.js public/lib/

# Copy rbush (create simple wrapper)
echo 'import RBush from "../../node_modules/rbush/index.js"; export default RBush; export { RBush };' > public/lib/rbush.js

echo "Dependencies copied successfully to public/lib/"
