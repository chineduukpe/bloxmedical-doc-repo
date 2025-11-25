#!/bin/bash
set -e

# Deployment script for EC2 server
# This script should be placed on the EC2 instance at the deployment path

DEPLOY_PATH="${1:-/opt/blox-admin}"
APP_DIR="$DEPLOY_PATH/app"
BACKUP_DIR="$DEPLOY_PATH/backups"

echo "🚀 Starting deployment..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup current deployment if it exists
if [ -d "$APP_DIR" ]; then
  echo "📦 Creating backup..."
  BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
  tar -czf "$BACKUP_FILE" -C "$DEPLOY_PATH" app/
  echo "✅ Backup created: $BACKUP_FILE"
  
  # Keep only last 5 backups
  ls -t "$BACKUP_DIR"/backup-*.tar.gz | tail -n +6 | xargs rm -f || true
fi

# Extract new deployment
echo "📂 Extracting new deployment..."
cd "$DEPLOY_PATH"
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR"
tar -xzf app.tar.gz -C "$APP_DIR"
cd "$APP_DIR"

# Load environment variables
if [ -f "$DEPLOY_PATH/.env" ]; then
  echo "📝 Loading environment variables..."
  export $(cat "$DEPLOY_PATH/.env" | grep -v '^#' | xargs)
fi

# Install dependencies
echo "📥 Installing dependencies..."
yarn install --frozen-lockfile --production=false

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
yarn db:generate

# Run database migrations
echo "🗄️ Running database migrations..."
yarn db:push || echo "⚠️ Database migration skipped or failed"

# Build application
echo "🏗️ Building application..."
yarn build

# Restart application
echo "🔄 Restarting application..."

# Check if PM2 is installed and configured
if command -v pm2 &> /dev/null; then
  if [ -f "$APP_DIR/ecosystem.config.js" ]; then
    pm2 restart ecosystem.config.js
  elif pm2 list | grep -q "blox-admin"; then
    pm2 restart blox-admin
  else
    pm2 start yarn --name blox-admin --cwd "$APP_DIR" -- start
  fi
  pm2 save
# Check if systemd service exists
elif systemctl list-unit-files | grep -q "blox-admin.service"; then
  sudo systemctl restart blox-admin
# Fallback: kill existing process and start new one
else
  pkill -f "next start" || true
  cd "$APP_DIR"
  nohup yarn start > "$DEPLOY_PATH/app.log" 2>&1 &
  echo $! > "$DEPLOY_PATH/app.pid"
fi

echo "✅ Deployment completed successfully!"
echo "📍 Application directory: $APP_DIR"
echo "📋 Check logs with: pm2 logs blox-admin (if using PM2)"

