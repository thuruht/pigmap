#!/bin/bash

echo "Deploying PigMap Cloudflare Worker with improved static asset handling..."

# Ensure dependencies are installed
npm install

# Copy required libraries to public/lib directory
echo "Copying libraries to public/lib..."
./copy-libs.sh

# Check if wrangler is installed
if ! command -v npx wrangler &> /dev/null; then
  echo "Installing wrangler globally..."
  npm install -g wrangler
fi

# Clear browser cache message
echo "IMPORTANT: After deployment, please clear your browser cache to ensure all assets load correctly."
echo "You can do this by pressing Ctrl+Shift+Delete in most browsers."

# Deploy the worker
echo "Deploying to Cloudflare Workers..."
npx wrangler deploy

echo "Deployment complete. Check for any errors in the output above."
echo "If successful, your static assets should now be properly served without error 1016."
echo "Remember to clear your browser cache if you still see the previous errors."
