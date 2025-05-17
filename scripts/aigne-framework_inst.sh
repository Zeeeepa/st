#!/bin/bash

# aigne-framework Installation Script
# This script installs and configures aigne-framework MCP Flow Engine

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Installing aigne-framework MCP Flow Engine ===${NC}"

# Create installation directory
INSTALL_DIR="$HOME/ai-stack/aigne-framework"
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

# Clone aigne-framework repository
echo -e "${YELLOW}Cloning aigne-framework repository...${NC}"
cd "$INSTALL_DIR" || { echo -e "${RED}Failed to change to installation directory${NC}"; exit 1; }

if [ -d ".git" ]; then
    echo -e "${YELLOW}Git repository already exists. Pulling latest changes...${NC}"
    git pull
else
    git clone https://github.com/Zeeeepa/aigne-framework.git .
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to clone aigne-framework repository. Please check your internet connection and try again.${NC}"
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
echo -e "${YELLOW}Building aigne-framework...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build aigne-framework. Please check the error messages above.${NC}"
    exit 1
fi

# Create a startup script
echo -e "${YELLOW}Creating startup script...${NC}"
cat > "$INSTALL_DIR/start-aigne.sh" << 'EOL'
#!/bin/bash
cd "$(dirname "$0")"
npm run start
EOL

chmod +x "$INSTALL_DIR/start-aigne.sh"

# Create a systemd service file (optional)
echo -e "${YELLOW}Would you like to create a systemd service for aigne-framework? (y/n)${NC}"
read -r create_service

if [[ "$create_service" =~ ^[Yy]$ ]]; then
    SERVICE_FILE="/tmp/aigne-framework.service"
    
    cat > "$SERVICE_FILE" << EOL
[Unit]
Description=aigne-framework MCP Flow Engine
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
SyslogIdentifier=aigne-framework

[Install]
WantedBy=multi-user.target
EOL
    
    sudo mv "$SERVICE_FILE" "/etc/systemd/system/aigne-framework.service"
    sudo systemctl daemon-reload
    sudo systemctl enable aigne-framework.service
    sudo systemctl start aigne-framework.service
    
    echo -e "${GREEN}aigne-framework service created and started. Check status with 'systemctl status aigne-framework.service'${NC}"
else
    echo -e "${GREEN}You can start aigne-framework manually by running '$INSTALL_DIR/start-aigne.sh'${NC}"
fi

# Configure environment variables
echo -e "${YELLOW}Do you want to configure API keys for aigne-framework? (y/n)${NC}"
read -r configure_api_keys

if [[ "$configure_api_keys" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Enter your OpenAI API key (leave blank to skip):${NC}"
    read -r openai_api_key
    
    echo -e "${YELLOW}Enter your Anthropic API key (leave blank to skip):${NC}"
    read -r anthropic_api_key
    
    # Create .env file
    cat > "$INSTALL_DIR/.env" << EOL
# API Keys
OPENAI_API_KEY=${openai_api_key}
ANTHROPIC_API_KEY=${anthropic_api_key}

# MCP Configuration
MCP_PORT=3001
EOL
    
    echo -e "${GREEN}API keys configured successfully.${NC}"
fi

echo -e "${GREEN}aigne-framework installation completed!${NC}"
echo -e "${GREEN}aigne-framework will be available at: http://localhost:3001${NC}"
exit 0

