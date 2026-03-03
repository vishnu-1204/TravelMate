const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('auth.db');
const fs = require('fs');
const path = require('path');

async function queryTable(tableName) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function toMarkdownTable(rows) {
  if (!rows || rows.length === 0) return '_No data found._\n';
  const headers = Object.keys(rows[0]);
  const headerRow = `| ${headers.join(' | ')} |`;
  const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
  const bodyRows = rows.map(row => {
    return `| ${headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string') return val.replace(/\n/g, '<br>').replace(/\|/g, '\\|');
      return val;
    }).join(' | ')} |`;
  }).join('\n');
  return `${headerRow}\n${separatorRow}\n${bodyRows}\n`;
}

async function main() {
  try {
    const tables = ['users', 'bookings', 'packages', 'itineraries', 'contact_messages', 'booking_email_failures'];
    let content = '# SQLite Database Dump (auth.db)\n\n';
    
    for (const table of tables) {
      content += `## Table: ${table}\n`;
      const rows = await queryTable(table);
      content += toMarkdownTable(rows);
      content += '\n';
    }

    // Determine the artifact path - using the one from the prompt metadata
    const artifactPath = path.join('C:\\Users\\acer\\.gemini\\antigravity\\brain\\b47f9767-ae28-48a0-81a9-d90265daa808', 'sqlite_data_dump.md');
    fs.writeFileSync(artifactPath, content);
    console.log(`Successfully wrote dump to ${artifactPath}`);
  } catch (err) {
    console.error('Error during dump:', err);
  } finally {
    db.close();
  }
}

main();
