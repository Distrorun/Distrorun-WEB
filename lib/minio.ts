import * as Minio from "minio";

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || "localhost",
    port: parseInt(process.env.MINIO_PORT || "9000"),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY || "distrorun",
    secretKey: process.env.MINIO_SECRET_KEY || "distrorun-secret",
});

const BUCKET = process.env.MINIO_BUCKET || "distrorun-registry";

// ── Ensure bucket exists ─────────────────────────────────────────────────────

let bucketReady = false;

async function ensureBucket() {
    if (bucketReady) return;
    const exists = await minioClient.bucketExists(BUCKET);
    if (!exists) {
        await minioClient.makeBucket(BUCKET);
    }
    bucketReady = true;
}

// ── Object Keys ──────────────────────────────────────────────────────────────

function yamlKey(name: string, version: number): string {
    return `packages/${name}/v${version}/${name}.distrorun.yaml`;
}

function sbomKey(name: string, version: number): string {
    return `packages/${name}/v${version}/${name}-sbom.spdx.json`;
}

// ── Upload ───────────────────────────────────────────────────────────────────

export async function uploadYaml(name: string, version: number, content: string): Promise<string> {
    await ensureBucket();
    const key = yamlKey(name, version);
    const buf = Buffer.from(content, "utf-8");
    await minioClient.putObject(BUCKET, key, buf, buf.length, {
        "Content-Type": "text/yaml",
    });
    return key;
}

export async function uploadSbom(name: string, version: number, content: string): Promise<string> {
    await ensureBucket();
    const key = sbomKey(name, version);
    const buf = Buffer.from(content, "utf-8");
    await minioClient.putObject(BUCKET, key, buf, buf.length, {
        "Content-Type": "application/json",
    });
    return key;
}

export async function uploadIcon(name: string, buffer: Buffer, contentType: string): Promise<string> {
    await ensureBucket();
    const ext = contentType.includes("png") ? "png" : contentType.includes("svg") ? "svg" : contentType.includes("webp") ? "webp" : "jpg";
    const key = `packages/${name}/icon.${ext}`;
    await minioClient.putObject(BUCKET, key, buffer, buffer.length, {
        "Content-Type": contentType,
    });
    return key;
}

// ── Download ─────────────────────────────────────────────────────────────────

export async function downloadObject(key: string): Promise<string> {
    await ensureBucket();
    const stream = await minioClient.getObject(BUCKET, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
}

export async function objectExists(key: string): Promise<boolean> {
    try {
        await minioClient.statObject(BUCKET, key);
        return true;
    } catch {
        return false;
    }
}

// ── Presigned URLs (for direct browser downloads) ────────────────────────────

export async function getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    await ensureBucket();
    return await minioClient.presignedGetObject(BUCKET, key, expirySeconds);
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deleteObject(key: string): Promise<void> {
    await ensureBucket();
    await minioClient.removeObject(BUCKET, key);
}

export async function deletePackageObjects(name: string): Promise<void> {
    await ensureBucket();
    const prefix = `packages/${name}/`;
    const objectsList = minioClient.listObjects(BUCKET, prefix, true);
    const objects: string[] = [];
    for await (const obj of objectsList) {
        objects.push(obj.name);
    }
    if (objects.length > 0) {
        await minioClient.removeObjects(BUCKET, objects);
    }
}

export { yamlKey, sbomKey };
export default minioClient;
