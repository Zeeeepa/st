#!/bin/bash

# PostgreSQL + Cloudflare Tunnel Setup for Event System
set -e

echo "🚀 Setting up PostgreSQL + Cloudflare Tunnel for Event System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    print_warning "No .env file found. Copying from .env.example..."
    cp .env.example .env
    print_warning "Please edit .env file with your configuration and run again."
    exit 1
fi

# Check if running on supported OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
else
    print_error "Unsupported operating system: $OSTYPE"
    exit 1
fi

print_status "Detected OS: $OS"

# Install PostgreSQL if not present
if ! command -v psql &> /dev/null; then
    print_status "Installing PostgreSQL..."
    if [[ "$OS" == "linux" ]]; then
        sudo apt-get update
        sudo apt-get install -y postgresql postgresql-contrib
    elif [[ "$OS" == "macos" ]]; then
        if command -v brew &> /dev/null; then
            brew install postgresql
        else
            print_error "Homebrew not found. Please install PostgreSQL manually."
            exit 1
        fi
    fi
else
    print_status "PostgreSQL already installed"
fi

# Install cloudflared if not present
if ! command -v cloudflared &> /dev/null; then
    print_status "Installing cloudflared..."
    if [[ "$OS" == "linux" ]]; then
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        sudo dpkg -i cloudflared-linux-amd64.deb
        rm cloudflared-linux-amd64.deb
    elif [[ "$OS" == "macos" ]]; then
        if command -v brew &> /dev/null; then
            brew install cloudflared
        else
            curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz | tar -xz
            sudo mv cloudflared /usr/local/bin/
        fi
    fi
else
    print_status "cloudflared already installed"
fi

# Start PostgreSQL service
print_status "Starting PostgreSQL service..."
if [[ "$OS" == "linux" ]]; then
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
elif [[ "$OS" == "macos" ]]; then
    brew services start postgresql
fi

# Wait for PostgreSQL to start
sleep 3

# Create databases and users
print_status "Creating databases and users..."

# Create main database and user
sudo -u postgres createdb "$POSTGRES_DB" 2>/dev/null || print_warning "Database $POSTGRES_DB already exists"

# Create users and set permissions
sudo -u postgres psql << EOF
-- Create main application user
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$POSTGRES_USER') THEN
        CREATE ROLE $POSTGRES_USER LOGIN PASSWORD '$POSTGRES_PASSWORD';
    END IF;
END
\$\$;

-- Create read-only user for Codegen
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$POSTGRES_CODEGEN_USER') THEN
        CREATE ROLE $POSTGRES_CODEGEN_USER LOGIN PASSWORD '$POSTGRES_CODEGEN_PASSWORD';
    END IF;
END
\$\$;

-- Grant permissions to main user
GRANT CONNECT ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;
GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;

-- Grant read-only permissions to Codegen user
GRANT CONNECT ON DATABASE $POSTGRES_DB TO $POSTGRES_CODEGEN_USER;
GRANT USAGE ON SCHEMA public TO $POSTGRES_CODEGEN_USER;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO $POSTGRES_CODEGEN_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO $POSTGRES_CODEGEN_USER;

-- Allow users to see table structure
GRANT SELECT ON information_schema.tables TO $POSTGRES_CODEGEN_USER;
GRANT SELECT ON information_schema.columns TO $POSTGRES_CODEGEN_USER;

\q
EOF

# Configure PostgreSQL for external connections
print_status "Configuring PostgreSQL for external connections..."

# Update postgresql.conf
sudo -u postgres psql -c "ALTER SYSTEM SET listen_addresses = '*';"
sudo -u postgres psql -c "ALTER SYSTEM SET port = $POSTGRES_PORT;"
sudo -u postgres psql -c "ALTER SYSTEM SET ssl = on;"
sudo -u postgres psql -c "ALTER SYSTEM SET max_connections = $CONNECTION_LIMIT;"

# Update pg_hba.conf to allow connections from tunnel
PG_HBA_FILE=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;')
echo "# Cloudflare Tunnel access for Event System" | sudo tee -a "$PG_HBA_FILE"
echo "host    $POSTGRES_DB    $POSTGRES_USER    0.0.0.0/0    md5" | sudo tee -a "$PG_HBA_FILE"
echo "host    $POSTGRES_DB    $POSTGRES_CODEGEN_USER    0.0.0.0/0    md5" | sudo tee -a "$PG_HBA_FILE"

# Reload PostgreSQL configuration
print_status "Reloading PostgreSQL configuration..."
sudo -u postgres psql -c "SELECT pg_reload_conf();"

# Initialize database schema
print_status "Initializing database schema..."
PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f sql/init-schema.sql

# Test connections
print_status "Testing database connections..."
PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 'Main user connection successful' as status;" > /dev/null
PGPASSWORD="$POSTGRES_CODEGEN_PASSWORD" psql -h localhost -p "$POSTGRES_PORT" -U "$POSTGRES_CODEGEN_USER" -d "$POSTGRES_DB" -c "SELECT 'Codegen user connection successful' as status;" > /dev/null

if [ $? -eq 0 ]; then
    print_status "✅ Database setup complete!"
else
    print_error "❌ Database connection test failed"
    exit 1
fi

# Setup Cloudflare Tunnel
print_status "Setting up Cloudflare Tunnel..."

# Authenticate with Cloudflare (if not already done)
if [ ! -f ~/.cloudflared/cert.pem ]; then
    print_status "Authenticating with Cloudflare..."
    print_info "This will open a browser window. Please log in to your Cloudflare account."
    cloudflared tunnel login
else
    print_status "Already authenticated with Cloudflare"
fi

# Create tunnel if it doesn't exist
print_status "Creating Cloudflare tunnel: $CLOUDFLARE_TUNNEL_NAME"
cloudflared tunnel create "$CLOUDFLARE_TUNNEL_NAME" 2>/dev/null || print_warning "Tunnel $CLOUDFLARE_TUNNEL_NAME already exists"

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep "$CLOUDFLARE_TUNNEL_NAME" | awk '{print $1}')
if [ -z "$TUNNEL_ID" ]; then
    print_error "Failed to get tunnel ID"
    exit 1
fi

print_status "Tunnel ID: $TUNNEL_ID"

# Create tunnel configuration
print_status "Creating tunnel configuration..."
mkdir -p config
cat > config/tunnel-config.yml << EOF
tunnel: $TUNNEL_ID
credentials-file: ~/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: $TUNNEL_URL
    service: tcp://localhost:$POSTGRES_PORT
  - service: http_status:404

EOF

# Create DNS record
print_status "Creating DNS record for $TUNNEL_URL..."
cloudflared tunnel route dns "$CLOUDFLARE_TUNNEL_NAME" "$TUNNEL_URL" || print_warning "DNS record might already exist"

# Create systemd service file (Linux) or launchd plist (macOS)
print_status "Creating system service..."

if [[ "$OS" == "linux" ]]; then
    # Create systemd service
    sudo tee /etc/systemd/system/events-tunnel.service > /dev/null << EOF
[Unit]
Description=Cloudflare Tunnel for Event System
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/local/bin/cloudflared tunnel --config $(pwd)/config/tunnel-config.yml run
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable events-tunnel.service
    print_status "Systemd service created and enabled"

elif [[ "$OS" == "darwin" ]]; then
    # Create launchd plist
    mkdir -p ~/Library/LaunchAgents
    cat > ~/Library/LaunchAgents/com.cloudflare.events-tunnel.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cloudflare.events-tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/cloudflared</string>
        <string>tunnel</string>
        <string>--config</string>
        <string>$(pwd)/config/tunnel-config.yml</string>
        <string>run</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>$(pwd)</string>
</dict>
</plist>
EOF

    launchctl load ~/Library/LaunchAgents/com.cloudflare.events-tunnel.plist
    print_status "LaunchAgent created and loaded"
fi

# Create connection info for Codegen
print_status "Creating Codegen connection information..."
cat > config/codegen-connection.txt << EOF
=== Codegen PostgreSQL Connection Details ===

Host: $TUNNEL_URL
Port: 5432
Database: $POSTGRES_DB
Username: $POSTGRES_CODEGEN_USER
Password: $POSTGRES_CODEGEN_PASSWORD
SSL Mode: $SSL_MODE

Connection String:
postgresql://$POSTGRES_CODEGEN_USER:$POSTGRES_CODEGEN_PASSWORD@$TUNNEL_URL:5432/$POSTGRES_DB?sslmode=$SSL_MODE

=== Available Tables ===
- github_events: GitHub webhook events
- linear_events: Linear webhook events
- slack_events: Slack webhook events
- webhook_deliveries: Delivery tracking
- event_metadata: Processing metadata

=== Security Notes ===
- This user has READ-ONLY access
- Connection is encrypted via Cloudflare Tunnel
- No ports are exposed on your local firewall

=== Next Steps ===
1. Start the tunnel: ./scripts/start-tunnel.sh
2. Test connection: ./scripts/test-connection.sh
3. Add these details to your Codegen organization settings
EOF

print_status "✅ PostgreSQL + Cloudflare Tunnel setup complete!"
print_info "📋 Connection details saved to: config/codegen-connection.txt"
print_warning "Next step: Run ./scripts/start-tunnel.sh to start the tunnel"

echo ""
echo "🔗 Your PostgreSQL will be accessible at: $TUNNEL_URL:5432"
echo "📁 Configuration files created in: config/"
echo "🧪 Test connection with: ./scripts/test-connection.sh"

