import { execSync } from 'child_process';

const DB_NAME = 'djflowerz-db';

const tables = {
  chat_messages: ['file_url', 'file_type'],
  chat_sessions: [
    'whatsapp_number', 
    'whatsapp_notified', 
    'human_requested_at', 
    'last_agent_response_at', 
    'sla_failed_notified', 
    'ticket_number'
  ]
};

function checkAndAddCols() {
  for (const [table, cols] of Object.entries(tables)) {
    console.log(`Checking table: ${table}`);
    const info = execSync(`npx wrangler d1 execute ${DB_NAME} --remote --command "PRAGMA table_info(${table});" --format=json`).toString();
    const existingCols = JSON.parse(info)[0].results.map(r => r.name);
    
    for (const col of cols) {
      if (!existingCols.includes(col)) {
        console.log(`Adding column ${col} to ${table}...`);
        try {
          execSync(`npx wrangler d1 execute ${DB_NAME} --remote --command "ALTER TABLE ${table} ADD COLUMN ${col} ${col.includes('notified') ? 'INTEGER DEFAULT 0' : 'TEXT'};" -y`);
          console.log(`Successfully added ${col}`);
        } catch (e) {
          console.error(`Failed to add ${col}: ${e.message}`);
        }
      } else {
        console.log(`Column ${col} already exists in ${table}`);
      }
    }
  }
}

checkAndAddCols();
