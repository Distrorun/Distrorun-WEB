// Run the registry migration
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:distrorun@localhost:5432/postgres",
});

const sql = fs.readFileSync(path.join(__dirname, "migrate-registry.sql"), "utf-8");

try {
    await pool.query(sql);
    console.log("Migration complete! Tables created:");
    const result = await pool.query(
        `SELECT tablename FROM pg_tables WHERE tablename IN ('registry_packages','package_versions','api_tokens','device_codes') ORDER BY tablename`
    );
    result.rows.forEach(r => console.log("  -", r.tablename));
    process.exit(0);
} catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
}
