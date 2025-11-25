# EC2 Deployment Guide

This guide explains how to set up automated deployment to EC2 using GitHub Actions.

## Prerequisites

1. An EC2 instance running Ubuntu (or similar Linux distribution)
2. Node.js and Yarn installed on the EC2 instance
3. PostgreSQL database accessible from EC2
4. GitHub repository with Actions enabled

## GitHub Secrets Configuration

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

### Required Secrets

#### EC2 Connection
- `EC2_HOST` - EC2 instance hostname or IP address (e.g., `ec2-xx-xx-xx-xx.compute-1.amazonaws.com` or `1.2.3.4`)
- `EC2_USER` - SSH username (typically `ubuntu` for Ubuntu AMIs, `ec2-user` for Amazon Linux)
- `EC2_SSH_PRIVATE_KEY` - Private SSH key for EC2 access (contents of your `.pem` file)
- `EC2_DEPLOY_PATH` - Deployment directory on EC2 (e.g., `/opt/blox-admin`)

#### Application Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (e.g., `postgresql://user:password@host:5432/database`)
- `NEXTAUTH_SECRET` - Secret key for NextAuth.js (generate with: `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Your application URL (e.g., `https://yourdomain.com`)
- `NEXT_PUBLIC_AI_SERVICE_URL` - AI service endpoint URL (e.g., `https://ai-service.example.com` or `http://localhost:8000`)

#### AWS S3 (for file uploads)
- `AWS_ACCESS_KEY_ID` - AWS access key ID
- `AWS_SECRET_ACCESS_KEY` - AWS secret access key
- `AWS_REGION` - AWS region (e.g., `us-east-1`)
- `AWS_S3_BUCKET` - S3 bucket name for document storage

#### Email Configuration (SMTP)
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port (e.g., `587`)
- `SMTP_USER` - SMTP username
- `SMTP_PASSWORD` - SMTP password

## EC2 Setup

### 1. Install Node.js and Yarn

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Yarn
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt-get update && sudo apt-get install yarn
```

### 2. Create Deployment Directory

```bash
sudo mkdir -p /opt/blox-admin
sudo chown $USER:$USER /opt/blox-admin
```

### 3. Set Up Environment Variables

Create a `.env` file on the EC2 instance:

```bash
nano /opt/blox-admin/.env
```

Add all the environment variables listed above.

### 4. Set Up Process Manager (Optional but Recommended)

#### Option A: PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create ecosystem.config.js in your project root
```

Example `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'blox-admin',
    script: 'yarn',
    args: 'start',
    cwd: '/opt/blox-admin/app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

#### Option B: systemd

Create `/etc/systemd/system/blox-admin.service`:

```ini
[Unit]
Description=BLOX Medical Admin Application
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/blox-admin/app
Environment="NODE_ENV=production"
ExecStart=/usr/bin/yarn start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable blox-admin
sudo systemctl start blox-admin
```

### 5. Configure SSH Access

Generate an SSH key pair for deployment:

```bash
# On your local machine
ssh-keygen -t rsa -b 4096 -f ~/.ssh/ec2-deploy-key -N ""
```

Add the public key to EC2:

```bash
# Copy public key to EC2
ssh-copy-id -i ~/.ssh/ec2-deploy-key.pub ubuntu@YOUR_EC2_HOST
```

Add the private key (`~/.ssh/ec2-deploy-key`) to GitHub Secrets as `EC2_SSH_PRIVATE_KEY`.

### 6. Configure Firewall

Ensure your EC2 security group allows:
- Port 22 (SSH) from GitHub Actions IP ranges
- Port 3000 (or your app port) from your load balancer/domain
- Database port (5432) from EC2 to your database

## Deployment Process

The GitHub Action workflow will:

1. **Build** - Install dependencies and build the Next.js application
2. **Package** - Create a deployment tarball
3. **Upload** - Transfer the package to EC2 via SCP
4. **Deploy** - Extract, install dependencies, run migrations, build, and restart

## Manual Deployment

If you need to deploy manually:

```bash
# On EC2
cd /opt/blox-admin
./deploy.sh /opt/blox-admin
```

## Troubleshooting

### Check Application Logs

```bash
# If using PM2
pm2 logs blox-admin

# If using systemd
sudo journalctl -u blox-admin -f

# If using nohup
tail -f /opt/blox-admin/app.log
```

### Verify Deployment

```bash
# Check if application is running
pm2 list  # or systemctl status blox-admin

# Check application health
curl http://localhost:3000/api/health
```

### Common Issues

1. **Permission denied**: Ensure the deployment directory is owned by the correct user
2. **Database connection failed**: Verify `DATABASE_URL` and network connectivity
3. **Build fails**: Check Node.js version matches (should be 20.x)
4. **Port already in use**: Stop the existing process before restarting

## Security Best Practices

1. **Never commit secrets** - Always use GitHub Secrets
2. **Use IAM roles** - Prefer IAM roles over access keys when possible
3. **Restrict SSH access** - Limit SSH access to specific IP ranges
4. **Regular updates** - Keep EC2 instance and dependencies updated
5. **Monitor logs** - Set up CloudWatch or similar logging

## Rollback

If a deployment fails, you can rollback using backups:

```bash
cd /opt/blox-admin/backups
# List available backups
ls -lt backup-*.tar.gz

# Restore a backup
tar -xzf backup-YYYYMMDD-HHMMSS.tar.gz -C /opt/blox-admin
cd /opt/blox-admin/app
yarn install
yarn build
pm2 restart blox-admin  # or systemctl restart blox-admin
```

