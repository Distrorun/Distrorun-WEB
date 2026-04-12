#!/bin/bash
# Start MinIO for DistroRun registry
# Usage: ./scripts/start-minio.sh

CONTAINER_NAME="distrorun-minio"
DATA_DIR="$(pwd)/minio-data"

# Create data dir
mkdir -p "$DATA_DIR"

# Stop existing container if running
sudo docker rm -f "$CONTAINER_NAME" 2>/dev/null

echo "Starting MinIO..."
sudo docker run -d \
    --name "$CONTAINER_NAME" \
    -p 9000:9000 \
    -p 9001:9001 \
    -e "MINIO_ROOT_USER=distrorun" \
    -e "MINIO_ROOT_PASSWORD=distrorun-secret" \
    -v "$DATA_DIR:/data" \
    minio/minio server /data --console-address ":9001"

echo ""
echo "MinIO started!"
echo "  API:     http://localhost:9000"
echo "  Console: http://localhost:9001"
echo "  User:    distrorun"
echo "  Pass:    distrorun-secret"
