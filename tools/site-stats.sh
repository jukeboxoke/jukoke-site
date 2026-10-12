#!/usr/bin/env bash
# Download counts for the Jukoke installers and resolver, from GitHub releases.
# Needs the GitHub CLI (gh), logged in. Run from the site repo root.
# Usage: tools/site-stats.sh
set -euo pipefail
cfg="$(dirname "$0")/../js/config.js"
val() { grep -E "^[[:space:]]*$1:" "$cfg" | head -1 | sed -E 's/.*"([^"]*)".*/\1/'; }
show() {
  local owner="$1" repo="$2"
  echo "== $owner/$repo =="
  gh api "repos/$owner/$repo/releases" --paginate \
    --jq '.[] | .tag_name as $t | .assets[] | [$t, .name, .download_count] | @tsv' |
    awk -F'\t' '{printf "%-18s %-28s %6d\n",$1,$2,$3; n[$2]+=$3} END{print "-- totals --"; for(k in n) printf "%-47s %6d\n",k,n[k]}'
}
show "$(val githubOwner)" "$(val releasesRepo)"
r="$(val resolverRepo)"; [ -n "$r" ] && show "$(val resolverOwner)" "$r"
