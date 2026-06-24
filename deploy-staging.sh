#!/bin/bash

# Exit on error
set -e

echo "==============================================="
echo "   iNeeda Staging Deployment Script"
echo "==============================================="

# Verify gcloud CLI location with common path fallbacks for non-interactive shells
GCLOUD_CMD="gcloud"

if ! command -v "$GCLOUD_CMD" &> /dev/null; then
    # Fallback 1: Local user installation (default for Google Cloud SDK install script)
    if [ -f "$HOME/google-cloud-sdk/bin/gcloud" ]; then
        GCLOUD_CMD="$HOME/google-cloud-sdk/bin/gcloud"
    # Fallback 2: System installation library
    elif [ -f "/usr/lib/google-cloud-sdk/bin/gcloud" ]; then
        GCLOUD_CMD="/usr/lib/google-cloud-sdk/bin/gcloud"
    # Fallback 3: Snap packages on Ubuntu/Debian
    elif [ -f "/snap/bin/gcloud" ]; then
        GCLOUD_CMD="/snap/bin/gcloud"
    # Fallback 4: Standard system paths in case PATH is restricted
    elif [ -f "/usr/bin/gcloud" ]; then
        GCLOUD_CMD="/usr/bin/gcloud"
    elif [ -f "/usr/local/bin/gcloud" ]; then
        GCLOUD_CMD="/usr/local/bin/gcloud"
    else
        echo "ERROR: gcloud CLI is not found on your system PATH."
        echo "If you have Google Cloud SDK installed, please ensure it is added to your PATH"
        echo "or installed in one of the standard directories (e.g., $HOME/google-cloud-sdk/bin/gcloud)."
        exit 1
    fi
fi

echo "Using gcloud CLI binary at: $GCLOUD_CMD"

# Automatically retrieve Staging Project ID from .env or config
PROJECT_ID=$(node -e "
try {
  const fs = require('fs');
  if (fs.existsSync('.env')) {
    const env = fs.readFileSync('.env', 'utf8');
    const match = env.match(/STAGING_PROJECT_ID\s*=\s*[\"']?([^\"'\r\n]+)[\"']?/);
    if (match) {
      console.log(match[1]);
      process.exit(0);
    }
  }
  console.log(require('./firebase-applet-config.json').projectId);
} catch(e) {
  console.error('Could not resolve project ID:', e.message);
  process.exit(1);
}
")

echo "Target Project ID: $PROJECT_ID"
read -p "Deploy staging service to project '$PROJECT_ID'? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Set up cleanup trap to restore the original config file on exit
cleanup() {
    if [ -f firebase-applet-config.backup.json ]; then
        echo "Restoring original firebase-applet-config.json..."
        mv firebase-applet-config.backup.json firebase-applet-config.json
    fi
}
trap cleanup EXIT

# Back up the current active config and copy the staging config
cp firebase-applet-config.json firebase-applet-config.backup.json
cp firebase-applet-config.staging.json firebase-applet-config.json

# Compile the local build to ensure zero type errors exist
echo "Verifying local production build..."
npm run build

IMAGE_NAME="gcr.io/$PROJECT_ID/ineeda-staging:latest"

# Build image using Google Cloud Build (does not require local Docker install)
echo "Submitting build to Google Cloud Build: $IMAGE_NAME..."
"$GCLOUD_CMD" builds submit --project "$PROJECT_ID" --tag "$IMAGE_NAME" .

# Create a temporary env-vars YAML file to securely pass secrets
echo "Parsing environment variables..."
node -e "
const fs = require('fs');
if (!fs.existsSync('.env')) {
  console.log('No local .env file found. Deploying without env variables.');
  process.exit(0);
}
const content = fs.readFileSync('.env', 'utf8');
const yamlLines = [];
content.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const match = trimmed.match(/^([^=]+)=(.*)$/);
  if (!match) return;
  const key = match[1].trim();
  let val = match[2].trim();
  if ((val.startsWith('\"') && val.endsWith('\"')) || (val.startsWith('\'') && val.endsWith('\''))) {
    val = val.substring(1, val.length - 1);
  }
  yamlLines.push(\`\${key}: \${JSON.stringify(val)}\`);
});
fs.writeFileSync('temp-env.yaml', yamlLines.join('\n'));
"

# Deploy to Cloud Run
echo "Deploying to Google Cloud Run..."
if [ -f temp-env.yaml ]; then
    "$GCLOUD_CMD" run deploy ineeda-staging \
      --project "$PROJECT_ID" \
      --image "$IMAGE_NAME" \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --port 3000 \
      --min-instances 0 \
      --max-instances 3 \
      --env-vars-file temp-env.yaml
    
    # Remove the temporary file containing raw secrets
    rm -f temp-env.yaml
else
    "$GCLOUD_CMD" run deploy ineeda-staging \
      --project "$PROJECT_ID" \
      --image "$IMAGE_NAME" \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --port 3000 \
      --min-instances 0 \
      --max-instances 3
fi

echo "==============================================="
echo "   Deployment Completed Successfully!"
echo "==============================================="
