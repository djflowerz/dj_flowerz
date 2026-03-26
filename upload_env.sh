#!/bin/bash
while IFS= read -r line || [[ -n "$line" ]]; do
  if [[ -z "$line" ]] || [[ "$line" == \#* ]]; then continue; fi
  if [[ "$line" == VERCEL_* ]] || [[ "$line" == NX_* ]] || [[ "$line" == TURBO_* ]]; then continue; fi
  KEY="${line%%=*}"
  VAL="${line#*=}"
  VAL="${VAL%\"}"
  VAL="${VAL#\"}"
  for ENV in production preview development; do
    echo "Adding $KEY to $ENV..."
    echo -n "$VAL" | npx vercel env add "$KEY" "$ENV" 2>&1 | tail -1
  done
done < .env.dj-flowerz
