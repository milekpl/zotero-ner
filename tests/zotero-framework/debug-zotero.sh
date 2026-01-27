#!/bin/bash
rm -f /tmp/zotero-ner-test-results.json

echo "Starting Zotero..."
timeout 15 xvfb-run -a /tmp/Zotero_linux-x86_64/zotero \
  --profile /mnt/d/git/zotero-ner/tests/zotero-framework/profile 2>&1 &

ZOTERO_PID=$!
echo "Zotero PID: $ZOTERO_PID"

sleep 10

echo "=== Check processes ==="
ps aux | grep -i zotero | grep -v grep | head -3 || echo "No zotero process"

echo "=== Check results ==="
cat /tmp/zotero-ner-test-results.json 2>/dev/null || echo "No results file"

echo "=== Done ==="
