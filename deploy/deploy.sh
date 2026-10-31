#!/usr/bin/env bash
# Builds the site here (the server has too little memory to build it) and deploys the current commit.
# Usage: deploy/deploy.sh [ssh-host]
set -euo pipefail

HOST="${1:-eric-vps}"
cd "$(git rev-parse --show-toplevel)"

if [ -n "$(git status --porcelain)" ]; then
  echo "Commit your changes first, so the server runs a known version." >&2
  exit 1
fi

RELEASE="$(date -u +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD)"
DIR="/opt/ezdsviewer/releases/$RELEASE"

(cd frontend && npm ci --no-audit --no-fund && npm run build)

ssh "$HOST" "mkdir -p '$DIR'"
git archive HEAD backend | ssh "$HOST" "tar -x -C '$DIR' --no-same-owner"
COPYFILE_DISABLE=1 tar -c frontend/build | ssh "$HOST" "tar -x -C '$DIR' --no-same-owner"

ssh "$HOST" "bash -s '$DIR'" <<'REMOTE'
set -euo pipefail
DIR="$1"
chmod -R a+rX "$DIR"
/opt/ezdsviewer/venv/bin/pip install --quiet -r "$DIR/backend/requirements.txt"
(cd "$DIR/backend" && PYTHONDONTWRITEBYTECODE=1 /opt/ezdsviewer/venv/bin/python -m unittest discover -s tests -t . 2>&1 | tail -3)

PREVIOUS="$(readlink /opt/ezdsviewer/current || true)"
ln -sfn "$DIR" /opt/ezdsviewer/current.new
mv -T /opt/ezdsviewer/current.new /opt/ezdsviewer/current
systemctl restart ezdsviewer-web

for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS -o /dev/null "http://127.0.0.1:8000/api/run?cmd=array"; then
    echo "Live: $DIR"
    ls -1dt /opt/ezdsviewer/releases/* | tail -n +4 | xargs -r rm -rf
    exit 0
  fi
  sleep 1
done

echo "New version didn't start." >&2
if [ -n "$PREVIOUS" ]; then
  ln -sfn "$PREVIOUS" /opt/ezdsviewer/current.new
  mv -T /opt/ezdsviewer/current.new /opt/ezdsviewer/current
  systemctl restart ezdsviewer-web
  echo "Rolled back to $PREVIOUS" >&2
fi
exit 1
REMOTE
