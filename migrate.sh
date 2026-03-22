#!/bin/bash
for i in {6..260}; do
  if [ -f "migration_chunk_$i.sql" ]; then
    echo "Processing chunk $i..."
    until yes y | npx wrangler d1 execute DB --remote --file="migration_chunk_$i.sql"; do
      echo "Chunk $i failed, retrying in 30 seconds..."
      sleep 30
    done
    echo "Chunk $i finished, waiting 10 seconds before next chunk..."
    sleep 10
  fi
done
