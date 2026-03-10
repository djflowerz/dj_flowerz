#!/bin/bash

# Script to execute all generated SQL import files against Cloudflare D1
DB_NAME="djflowerz-db"
IMPORT_DIR="migrations/pool_imports"

echo "Starting SQL import into D1 database: $DB_NAME"

for i in $(seq -f "%03g" 1 53); do
  FILE="$IMPORT_DIR/import_pool_$i.sql"
  if [ -f "$FILE" ]; then
    echo "--------------------------------------------------"
    echo "Executing batch $i: $FILE"
    npx wrangler d1 execute "$DB_NAME" --remote --file="$FILE"
    if [ $? -eq 0 ]; then
      echo "Successfully executed batch $i"
    else
      echo "Failed to execute batch $i. Stopping."
      exit 1
    fi
  else
    echo "File $FILE not found. Skipping."
  fi
done

echo "--------------------------------------------------"
echo "All import batches executed successfully."
