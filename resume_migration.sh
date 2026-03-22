#!/bin/bash
# Script to resume Music Pool migration in safe chunks
for i in {9..260}; do
  if [ -f "migration_chunk_$i.sql" ]; then
    echo "Processing chunk $i..."
    # Check if DB is busy before starting
    until npx wrangler d1 execute djflowerz-db --remote --command="SELECT 1" &>/dev/null; do
      echo "DB is busy, waiting 30 seconds..."
      sleep 30
    done
    yes y | npx wrangler d1 execute djflowerz-db --remote --file="migration_chunk_$i.sql"
    echo "Chunk $i finished, waiting 60 seconds for server-side processing..."
    sleep 60
  fi
done
