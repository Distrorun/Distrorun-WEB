const { Pool } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
for (const line of env.split('\n')) {
if (line.startsWith('DATABASE_URL=')) {
    process.env.DATABASE_URL = line.substring(line.indexOf('=')+1).trim();
    if(process.env.DATABASE_URL.startsWith('"') && process.env.DATABASE_URL.endsWith('"')) {
        process.env.DATABASE_URL = process.env.DATABASE_URL.slice(1, -1);
    }
}
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema=\'public\';', (err, res) => {
if (err) console.error(err);
else console.log("Tables:", res.rows.map(r => r.table_name));

pool.query('SELECT * FROM session LIMIT 2;', (err2, res2) => {
    if (err2) console.error("Session Table Error:", err2);
    else console.log("Sessions:", res2.rows);
    pool.end();
});
});
