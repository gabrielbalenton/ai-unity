#!/usr/bin/env bash
# Disposable GitHub Actions PostgreSQL schema contract test.
# Never supply a production or client-owned DATABASE_URL to this script.
set -euo pipefail
if [[ "${UNITY_EPHEMERAL_DATABASE:-}" != "1" ]]; then
 echo "Refusing to run SQL contract tests without UNITY_EPHEMERAL_DATABASE=1" >&2
 exit 2
fi
if [[ "${PGHOST:-}" != "127.0.0.1" && "${PGHOST:-}" != "localhost" ]]; then
 echo "Only a local disposable PostgreSQL host is allowed" >&2
 exit 2
fi
if [[ "${PGDATABASE:-}" != "unity_contract" ]]; then
 echo "Only the designated disposable unity_contract database may be used" >&2
 exit 2
fi
for file in \
 tests/db/bootstrap.sql \
 supabase/migrations/0001_core.sql \
 supabase/schema-proposals/runtime.sql \
 supabase/schema-proposals/memory-approval.sql \
 supabase/schema-proposals/github-webhook-deliveries.sql \
 supabase/schema-proposals/durable-jobs.sql \
 supabase/schema-proposals/model-dispatch-ledger.sql \
 tests/db/isolation.sql \
 tests/db/worker.sql \
 tests/db/model-ledger.sql; do
 echo "Validating ${file}"
 psql --no-psqlrc --set ON_ERROR_STOP=on --file "${file}"
done
echo "PASS: all disposable PostgreSQL schema, RLS and queue tests"
