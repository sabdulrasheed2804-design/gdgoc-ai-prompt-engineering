#!/bin/bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/f5f8c5df6c9fdde247c397f40daf6b8d/workers/scripts/gdgoc-prompt-eng-grading" \
  -H "Authorization: Bearer $(cat ../.cloudflare-token)" \
  -F "metadata=@metadata.json;type=application/json" \
  -F "index.js=@dist/index.js;type=application/javascript+module"
