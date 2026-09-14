#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo "1/3 payload"  && python3 payload.py
echo "2/3 assemble" && python3 assemble.py
echo "3/3 audit"    && node audit.js | tail -3
