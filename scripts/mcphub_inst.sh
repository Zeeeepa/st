#!/bin/bash

# mcphub Installation Script
# This script installs and configures mcphub Central Repository for MCP Components

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Installing mcphub Central Repository for MCP Components ===${NC}"

# Create installation directory
INSTALL_DIR="$HOME/ai-stack/mcphub"
mkdir -p "$INSTALL_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Installing Node.js...${NC}"
    
    # Install Node.js
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    echo -e "${GREEN}Node.js installed successfully.${NC}"
fi

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}Git not found. Installing Git...${NC}"
    
    # Install Git
    sudo apt-get update
    sudo apt-get install -y git
    
    echo -e "${GREEN}Git installed successfully.${NC}"
fi

# Clone mcphub repository
echo -e "${YELLOW}Cloning mcphub repository...${NC}"
cd "$INSTALL_DIR" || { echo -e "${RED}Failed to change to installation directory${NC}"; exit 1; }

if [ -d ".git" ]; then
    echo -e "${YELLOW}Git repository already exists. Pulling latest changes...${NC}"
    git pull
else
    git clone https://github.com/Zeeeepa/mcphub.git .
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to clone mcphub repository. Please check your internet connection and try again.${NC}"
        exit 1
    fi
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install dependencies. Please check the error messages above.${NC}"
    exit 1
fi

# Build the project
echo -e "${YELLOW}Building mcphub...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build mcphub. Please check the error messages above.${NC}"
    exit 1
fi

# Configure MCP servers
echo -e "${YELLOW}Configuring MCP servers...${NC}"

# Create config directory
mkdir -p "$INSTALL_DIR/config"

# Create configuration file
cat > "$INSTALL_DIR/config/mcp-servers.json" << EOL
{
  "servers": {
    "anon-kode": {
      "url": "http://localhost:3004/mcp",
      "description": "Code generation MCP server"
    },
    "claude-task-master": {
      "url": "http://localhost:3003/mcp",
      "description": "Task planning MCP server"
    }
  }
}
EOL

# Create .env file
cat > "$INSTALL_DIR/.env" << EOL
# Server Configuration
PORT=3005
NODE_ENV=development

# MCP Hub Configuration
MCP_CONFIG_PATH=$INSTALL_DIR/config/mcp-servers.json
EOL

# Create a startup script
echo -e "${YELLOW}Creating startup script...${NC}"
cat > "$INSTALL_DIR/start-mcphub.sh" << 'EOL'
#!/bin/bash
cd "$(dirname "$0")"
npm run start
EOL

chmod +x "$INSTALL_DIR/start-mcphub.sh"

# Create a systemd service file (optional)
echo -e "${YELLOW}Would you like to create a systemd service for mcphub? (y/n)${NC}"
read -r create_service

if [[ "$create_service" =~ ^[Yy]$ ]]; then
    SERVICE_FILE="/tmp/mcphub.service"
    
    cat > "$SERVICE_FILE" << EOL
[Unit]
Description=mcphub Central Repository for MCP Components
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=mcphub

[Install]
WantedBy=multi-user.target
EOL
    
    sudo mv "$SERVICE_FILE" "/etc/systemd/system/mcphub.service"
    sudo systemctl daemon-reload
    sudo systemctl enable mcphub.service
    sudo systemctl start mcphub.service
    
    echo -e "${GREEN}mcphub service created and started. Check status with 'systemctl status mcphub.service'${NC}"
else
    echo -e "${GREEN}You can start mcphub manually by running '$INSTALL_DIR/start-mcphub.sh'${NC}"
fi

echo -e "${GREEN}mcphub installation completed!${NC}"
echo -e "${GREEN}mcphub will be available at: http://localhost:3005${NC}"
exit 0

