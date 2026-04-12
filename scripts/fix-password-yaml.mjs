// Fix YAML configs for official OS entries:
// Adds "- " before "password:" keys that don't already have it in the users list.
//
// Run with: node scripts/fix-password-yaml.mjs
//           (requires DATABASE_URL and MINIO env vars)

import pg from "pg";
import * as Minio from "minio";

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:distrorun@localhost:5432/postgres",
});

const minio = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || "localhost",
    port: parseInt(process.env.MINIO_PORT || "9000"),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY || "distrorun",
    secretKey: process.env.MINIO_SECRET_KEY || "distrorun-secret",
});

const BUCKET = process.env.MINIO_BUCKET || "distrorun-registry";

async function downloadObject(key) {
    const stream = await minio.getObject(BUCKET, key);
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
}

async function uploadObject(key, content) {
    const buf = Buffer.from(content, "utf-8");
    await minio.putObject(BUCKET, key, buf, buf.length, {
        "Content-Type": "text/yaml",
    });
}

function fixPasswordYaml(yaml) {
    // Add "- " before "password:" lines that are not already list items
    // Matches lines like "    password: ..." and turns them into "    - password: ..."
    const lines = yaml.split("\n");
    const fixed = lines.map(line => {
        // Match indented password lines that are NOT already a list item (no "- " before password)
        const match = line.match(/^(\s+)password:\s/);
        if (match && !line.match(/^\s+-\s+password:/)) {
            const indent = match[1];
            return `${indent}- password:${line.slice(line.indexOf("password:") + "password:".length)}`;
        }
        return line;
    });
    return fixed.join("\n");
}

try {
    // Get all official packages with their latest version YAML keys
    const result = await pool.query(
        `SELECT rp.name, rp.latest_version, pv.yaml_key
         FROM registry_packages rp
         JOIN package_versions pv ON rp.id = pv.package_id AND rp.latest_version = pv.version
         WHERE rp.official = TRUE`
    );

    if (result.rows.length === 0) {
        console.log("No official OS entries found.");
        process.exit(0);
    }

    console.log(`Found ${result.rows.length} official OS entries.\n`);

    let updated = 0;
    for (const row of result.rows) {
        const { name, latest_version, yaml_key } = row;
        console.log(`Processing: ${name} (v${latest_version})`);

        const yaml = await downloadObject(yaml_key);
        const fixed = fixPasswordYaml(yaml);

        if (fixed !== yaml) {
            await uploadObject(yaml_key, fixed);
            console.log(`  Updated YAML for ${name}`);
            updated++;
        } else {
            console.log(`  No changes needed for ${name}`);
        }
    }

    console.log(`\nDone. Updated ${updated}/${result.rows.length} entries.`);
    process.exit(0);
} catch (err) {
    console.error("Failed:", err.message);
    process.exit(1);
}
