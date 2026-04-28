#!/bin/bash
# Fix module guards for campaigns.js and polls.js
# Run with: bash fix_module_guards.sh (as root or with sudo)

set -e

ROUTES_DIR="/home/styapo/Projet/SEVEN-T/backend/routes"

echo "=== Patching campaigns.js ==="
python3 - <<'PYEOF'
path = "/home/styapo/Projet/SEVEN-T/backend/routes/campaigns.js"
with open(path, 'r') as f:
    content = f.read()

# Add requireModule import
old = "import { authenticateToken } from '../middleware/auth.js';"
new = "import { authenticateToken } from '../middleware/auth.js';\nimport { requireModule } from '../middleware/requireModule.js';"
content = content.replace(old, new, 1)

# Add router.use middleware after router creation
old = "const router = Router();\n\n// Get all campaigns"
new = "const router = Router();\n\n// All campaign routes require authentication + campaigns module\nrouter.use(authenticateToken);\nrouter.use(requireModule('campaigns'));\n\n// Get all campaigns"
content = content.replace(old, new, 1)

# Remove redundant per-route authenticateToken
content = content.replace(', authenticateToken, async', ', async')

with open(path, 'w') as f:
    f.write(content)
print("campaigns.js patched OK")
PYEOF

echo "=== Patching polls.js ==="
python3 - <<'PYEOF'
path = "/home/styapo/Projet/SEVEN-T/backend/routes/polls.js"
with open(path, 'r') as f:
    content = f.read()

# Add requireModule import
old = "import { authenticateToken } from '../middleware/auth.js';"
new = "import { authenticateToken } from '../middleware/auth.js';\nimport { requireModule } from '../middleware/requireModule.js';"
content = content.replace(old, new, 1)

# Add requireModule guard after existing authenticateToken
old = "router.use(authenticateToken);\n\n// Bulk delete polls"
new = "router.use(authenticateToken);\nrouter.use(requireModule('polls'));\n\n// Bulk delete polls"
content = content.replace(old, new, 1)

with open(path, 'w') as f:
    f.write(content)
print("polls.js patched OK")
PYEOF

echo "=== Fixing file ownership ==="
chown styapo:styapo "$ROUTES_DIR/campaigns.js" "$ROUTES_DIR/polls.js"

echo "=== Done! ==="
