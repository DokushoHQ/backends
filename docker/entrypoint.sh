#!/usr/bin/env sh
set -eu

ROLE="${1:-server}"
if [ "$#" -gt 0 ]; then
	shift
fi

case "$ROLE" in
	migrate)
		exec prisma migrate deploy --schema=./prisma/schema "$@"
		;;
	server)
		exec node .output/server/index.mjs "$@"
		;;
	workers|worker)
		exec node .output/server/workers/index.mjs "$@"
		;;
	*)
		exec "$ROLE" "$@"
		;;
esac
