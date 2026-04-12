import pool from "./db";
import crypto from "crypto";
import { uploadYaml, uploadSbom, downloadObject, objectExists, deletePackageObjects, yamlKey, sbomKey } from "./minio";

// ── Helpers ──────────────────────────────────────────────────────────────────

function hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
}

function generateDeviceCode(): string {
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const digits = "0123456789";
    let code = "";
    for (let i = 0; i < 3; i++) code += letters[Math.floor(Math.random() * letters.length)];
    code += "-";
    for (let i = 0; i < 4; i++) code += digits[Math.floor(Math.random() * digits.length)];
    return code;
}

// ── Device Code Flow ─────────────────────────────────────────────────────────

export async function createDeviceCode() {
    const code = generateDeviceCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
        `INSERT INTO device_codes (code, status, expires_at) VALUES ($1, 'pending', $2)`,
        [code, expiresAt]
    );

    return { code, expiresAt: expiresAt.toISOString() };
}

export async function getDeviceCode(code: string) {
    const result = await pool.query(
        `SELECT * FROM device_codes WHERE code = $1 AND expires_at > NOW()`,
        [code]
    );
    return result.rows[0] || null;
}

export async function approveDeviceCode(code: string, userId: string, userEmail: string, userName: string) {
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
        `INSERT INTO api_tokens (token_hash, user_id, user_email, user_name, expires_at) VALUES ($1, $2, $3, $4, $5)`,
        [tokenHash, userId, userEmail, userName, expiresAt]
    );

    // Store raw token temporarily so CLI can retrieve it via poll
    await pool.query(
        `UPDATE device_codes SET status = 'approved', user_id = $1, token_hash = $2 WHERE code = $3`,
        [userId, token, code]
    );

    return { token, expiresAt: expiresAt.toISOString(), email: userEmail, name: userName };
}

export async function pollDeviceCode(code: string) {
    const result = await pool.query(
        `SELECT status, token_hash, user_id FROM device_codes WHERE code = $1 AND expires_at > NOW()`,
        [code]
    );

    if (!result.rows[0]) return { status: "expired" as const };

    const row = result.rows[0];
    if (row.status === "approved" && row.token_hash) {
        const rawToken = row.token_hash;
        const realHash = hashToken(rawToken);

        const tokenResult = await pool.query(
            `SELECT user_email, user_name, expires_at FROM api_tokens WHERE token_hash = $1`,
            [realHash]
        );

        // Clear the raw token (one-time read)
        await pool.query(
            `UPDATE device_codes SET token_hash = NULL WHERE code = $1`,
            [code]
        );

        const tokenRow = tokenResult.rows[0];
        return {
            status: "approved" as const,
            token: rawToken,
            email: tokenRow?.user_email || "",
            name: tokenRow?.user_name || "",
            expiresAt: tokenRow?.expires_at || "",
        };
    }

    return { status: row.status as "pending" | "expired" };
}

// ── Token Validation ─────────────────────────────────────────────────────────

export async function validateApiToken(token: string) {
    const tokenHash = hashToken(token);
    const result = await pool.query(
        `SELECT user_id, user_email, user_name, expires_at FROM api_tokens WHERE token_hash = $1 AND expires_at > NOW()`,
        [tokenHash]
    );
    return result.rows[0] || null;
}

// ── Registry Packages ────────────────────────────────────────────────────────

interface PublishInput {
    name: string;
    description: string;
    yamlContent: string;
    sbomContent?: string;
    userId: string;
    tags: string[];
    baseDistro: string;
    packages: string[];
    services: string[];
    userCount: number;
    sbomEnabled: boolean;
}

export async function publishPackage(input: PublishInput) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Upsert the package
        const pkgResult = await client.query(
            `INSERT INTO registry_packages (name, description, user_id, tags, latest_version)
             VALUES ($1, $2, $3, $4, 1)
             ON CONFLICT (name)
             DO UPDATE SET 
                description = EXCLUDED.description,
                tags = EXCLUDED.tags,
                latest_version = registry_packages.latest_version + 1,
                updated_at = NOW()
             RETURNING id, latest_version`,
            [input.name, input.description, input.userId, input.tags]
        );

        const packageId = pkgResult.rows[0].id;
        const version = pkgResult.rows[0].latest_version;

        // Upload files to MinIO
        const yamlObjKey = await uploadYaml(input.name, version, input.yamlContent);
        let sbomObjKey: string | null = null;
        if (input.sbomContent) {
            sbomObjKey = await uploadSbom(input.name, version, input.sbomContent);
        }

        // Insert the version with MinIO keys
        await client.query(
            `INSERT INTO package_versions (package_id, version, yaml_key, sbom_key, base_distro, packages, services, user_count, sbom_enabled)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [packageId, version, yamlObjKey, sbomObjKey, input.baseDistro, input.packages, input.services, input.userCount, input.sbomEnabled]
        );

        await client.query("COMMIT");
        return { packageId, version };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

export async function adminPublishPackage(input: PublishInput & { icon?: string; iconColor?: string }) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Upsert the package with official = true
        const pkgResult = await client.query(
            `INSERT INTO registry_packages (name, description, user_id, tags, latest_version, official, icon, icon_color)
             VALUES ($1, $2, $3, $4, 1, TRUE, $5, $6)
             ON CONFLICT (name)
             DO UPDATE SET 
                description = EXCLUDED.description,
                tags = EXCLUDED.tags,
                latest_version = registry_packages.latest_version + 1,
                official = TRUE,
                icon = COALESCE(EXCLUDED.icon, registry_packages.icon),
                icon_color = COALESCE(EXCLUDED.icon_color, registry_packages.icon_color),
                updated_at = NOW()
             RETURNING id, latest_version`,
            [input.name, input.description, input.userId, input.tags, input.icon || null, input.iconColor || null]
        );

        const packageId = pkgResult.rows[0].id;
        const version = pkgResult.rows[0].latest_version;

        // Upload files to MinIO
        const yamlObjKey = await uploadYaml(input.name, version, input.yamlContent);
        let sbomObjKey: string | null = null;
        if (input.sbomContent) {
            sbomObjKey = await uploadSbom(input.name, version, input.sbomContent);
        }

        // Insert the version
        await client.query(
            `INSERT INTO package_versions (package_id, version, yaml_key, sbom_key, base_distro, packages, services, user_count, sbom_enabled)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [packageId, version, yamlObjKey, sbomObjKey, input.baseDistro, input.packages, input.services, input.userCount, input.sbomEnabled]
        );

        await client.query("COMMIT");
        return { packageId, version };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

export async function getPackage(name: string, version?: number) {
    const pkg = await pool.query(
        `SELECT rp.*, u.name as user_name FROM registry_packages rp LEFT JOIN "user" u ON rp.user_id = u.id WHERE rp.name = $1`,
        [name]
    );

    if (!pkg.rows[0]) return null;

    const packageId = pkg.rows[0].id;

    let versionQuery;
    if (version) {
        versionQuery = await pool.query(
            `SELECT * FROM package_versions WHERE package_id = $1 AND version = $2`,
            [packageId, version]
        );
    } else {
        versionQuery = await pool.query(
            `SELECT * FROM package_versions WHERE package_id = $1 ORDER BY version DESC LIMIT 1`,
            [packageId]
        );
    }

    const versionData = versionQuery.rows[0] || null;

    // Fetch file contents from MinIO
    let yamlContent: string | null = null;
    let sbomContent: string | null = null;

    if (versionData) {
        try {
            yamlContent = await downloadObject(versionData.yaml_key);
        } catch (err) {
            console.error("Failed to fetch YAML from MinIO:", err);
        }

        if (versionData.sbom_key) {
            try {
                sbomContent = await downloadObject(versionData.sbom_key);
            } catch (err) {
                console.error("Failed to fetch SBOM from MinIO:", err);
            }
        }
    }

    return {
        ...pkg.rows[0],
        versionData: versionData ? {
            ...versionData,
            yaml_content: yamlContent,
            sbom_content: sbomContent,
        } : null,
    };
}

export async function getPackageHistory(name: string) {
    const pkg = await pool.query(
        `SELECT id FROM registry_packages WHERE name = $1`,
        [name]
    );

    if (!pkg.rows[0]) return [];

    const versions = await pool.query(
        `SELECT version, created_at, sbom_enabled FROM package_versions WHERE package_id = $1 ORDER BY version DESC`,
        [pkg.rows[0].id]
    );

    return versions.rows;
}

export async function listPackages(limit = 20, offset = 0) {
    const result = await pool.query(
        `SELECT rp.*, pv.base_distro, pv.packages, pv.sbom_enabled, u.name as user_name
         FROM registry_packages rp
         LEFT JOIN package_versions pv ON rp.id = pv.package_id AND rp.latest_version = pv.version
         LEFT JOIN "user" u ON rp.user_id = u.id
         WHERE rp.hidden = FALSE
         ORDER BY rp.official DESC, rp.updated_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
    );
    return result.rows;
}

export async function adminListPackages(limit = 100, offset = 0) {
    const result = await pool.query(
        `SELECT rp.*, u.name as user_name
         FROM registry_packages rp
         LEFT JOIN "user" u ON rp.user_id = u.id
         ORDER BY rp.official DESC, rp.updated_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
    );
    return result.rows;
}

export async function incrementDownloads(name: string) {
    await pool.query(
        `UPDATE registry_packages SET downloads = downloads + 1 WHERE name = $1`,
        [name]
    );
}

export async function updatePackage(
    name: string,
    userId: string,
    updates: { description?: string; tags?: string[]; icon?: string | null; iconColor?: string | null }
) {
    const pkg = await pool.query(
        `SELECT id FROM registry_packages WHERE name = $1 AND user_id = $2`,
        [name, userId]
    );
    if (!pkg.rows[0]) return null;

    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.description !== undefined) {
        sets.push(`description = $${idx++}`);
        values.push(updates.description);
    }
    if (updates.tags !== undefined) {
        sets.push(`tags = $${idx++}`);
        values.push(updates.tags);
    }
    if (updates.icon !== undefined) {
        sets.push(`icon = $${idx++}`);
        values.push(updates.icon);
    }
    if (updates.iconColor !== undefined) {
        sets.push(`icon_color = $${idx++}`);
        values.push(updates.iconColor);
    }

    if (sets.length === 0) return pkg.rows[0];

    sets.push(`updated_at = NOW()`);
    values.push(name, userId);

    const result = await pool.query(
        `UPDATE registry_packages SET ${sets.join(", ")} WHERE name = $${idx++} AND user_id = $${idx} RETURNING *`,
        values
    );
    return result.rows[0];
}

export async function updatePackageYaml(name: string, userId: string, yamlContent: string) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const pkg = await client.query(
            `SELECT id, latest_version FROM registry_packages WHERE name = $1 AND user_id = $2`,
            [name, userId]
        );
        if (!pkg.rows[0]) { await client.query("ROLLBACK"); return null; }

        const { id: packageId, latest_version } = pkg.rows[0];

        // Get the current version's metadata to carry forward
        const versionRow = await client.query(
            `SELECT sbom_key, base_distro, packages, services, user_count, sbom_enabled FROM package_versions WHERE package_id = $1 AND version = $2`,
            [packageId, latest_version]
        );
        if (!versionRow.rows[0]) { await client.query("ROLLBACK"); return null; }

        const prev = versionRow.rows[0];
        const newVersion = latest_version + 1;

        // Upload new YAML to MinIO under the new version key
        const yamlObjKey = await uploadYaml(name, newVersion, yamlContent);

        // Copy SBOM from previous version if it exists
        let sbomObjKey: string | null = prev.sbom_key;

        // Insert the new version row
        await client.query(
            `INSERT INTO package_versions (package_id, version, yaml_key, sbom_key, base_distro, packages, services, user_count, sbom_enabled)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [packageId, newVersion, yamlObjKey, sbomObjKey, prev.base_distro, prev.packages, prev.services, prev.user_count, prev.sbom_enabled]
        );

        // Bump latest_version on the package
        await client.query(
            `UPDATE registry_packages SET latest_version = $1, updated_at = NOW() WHERE id = $2`,
            [newVersion, packageId]
        );

        await client.query("COMMIT");
        return { version: newVersion };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

export async function deletePackage(name: string, userId: string) {
    // Delete files from MinIO first
    await deletePackageObjects(name);

    const result = await pool.query(
        `DELETE FROM registry_packages WHERE name = $1 AND user_id = $2 RETURNING id`,
        [name, userId]
    );
    return result.rowCount ? result.rowCount > 0 : false;
}

export async function adminDeletePackage(name: string) {
    // Delete files from MinIO first
    await deletePackageObjects(name);

    const result = await pool.query(
        `DELETE FROM registry_packages WHERE name = $1 RETURNING id`,
        [name]
    );
    return result.rowCount ? result.rowCount > 0 : false;
}

export async function adminTogglePackageVisibility(name: string, hidden: boolean) {
    const result = await pool.query(
        `UPDATE registry_packages SET hidden = $1, updated_at = NOW() WHERE name = $2 RETURNING id`,
        [hidden, name]
    );
    return result.rowCount ? result.rowCount > 0 : false;
}
