// Run this script ONCE after signing up as Talfaza to set yourself as admin:
// node scripts/promote-admin.mjs <your-email>

import pg from "pg";
const { Pool } = pg;

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/promote-admin.mjs <email>");
  process.exit(1);
}

const pool = new Pool({
  connectionString: "postgresql://postgres:distrorun@localhost:5432/postgres",
});

try {
  const res = await pool.query(
    'UPDATE "user" SET role = $1 WHERE email = $2 RETURNING id, name, email, role',
    ["admin", email]
  );
  if (res.rowCount === 0) {
    console.error(`No user found with email: ${email}`);
    console.log("Make sure you have signed up first at /auth");
  } else {
    console.log(`✅ Promoted to admin:`, res.rows[0]);
  }
} finally {
  await pool.end();
}
