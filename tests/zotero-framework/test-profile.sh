#!/bin/bash
timeout 3 xvfb-run -a /tmp/Zotero_linux-x86_64/zotero -profile /mnt/d/git/zotero-ner/tests/zotero-framework/profile &
PID=$!

sleep 2

echo "Processes:"
ps aux | grep -i zotero | grep -v grep | head -3

echo ""
echo "Profile:"
ls -la /mnt/d/git/zotero-ner/tests/zotero-framework/profile/

echo ""
echo "Extensions.json exists:"
test -f /mnt/d/git/zotero-ner/tests/zotero-framework/profile/extensions.json && echo "YES" || echo "NO"
