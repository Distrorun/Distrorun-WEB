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
async function test() {
    const res1 = await pool.query('SELECT * FROM session;');
    console.log("SESSIONS BEFORE:", res1.rows.length);
    if(res1.rows.length === 0) return pool.end();

    const userId = res1.rows[0].userId;
    // We simulate the component: token from the FIRST session
    const currentToken = res1.rows[0].token;

    try {
        const query = await pool.query('DELETE FROM session WHERE "userId" = $1 AND token != $2 RETURNING *', [userId, currentToken]);
        console.log("DELETED ROWS:", query.rows.length);
    } catch(e) {
        console.error(e);
    }
    const res2 = await pool.query('SELECT * FROM session;');
    console.log("SESSIONS AFTER:", res2.rows.length);
    pool.end();
}
test();
