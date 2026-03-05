#!/bin/bash
ssh root@187.77.232.237 << 'REMOTE_EOF'
  curl -sSL https://raw.githubusercontent.com/marceloricardo/lexhub-saas/main/scripts/setup-vps.sh | bash
REMOTE_EOF
