#!/bin/bash

# claude-task-master Installation Script
# This script installs and configures claude-task-master Task Planning

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Installing claude-task-master Task Planning ===${NC}"

# Create installation directory
INSTALL_DIR="$HOME/ai-stack/claude-task-master"
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

# Clone claude-task-master repository
echo -e "${YELLOW}Cloning claude-task-master repository...${NC}"
cd "$INSTALL_DIR" || { echo -e "${RED}Failed to change to installation directory${NC}"; exit 1; }

if [ -d ".git" ]; then
    echo -e "${YELLOW}Git repository already exists. Pulling latest changes...${NC}"
    git pull
else
    git clone https://github.com/Zeeeepa/claude-task-master.git .
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to clone claude-task-master repository. Please check your internet connection and try again.${NC}"
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

# Configure API keys
echo -e "${YELLOW}Configuring API keys...${NC}"
echo -e "${YELLOW}Enter your Anthropic API key:${NC}"
read -r anthropic_api_key

if [ -z "$anthropic_api_key" ]; then
    echo -e "${RED}Anthropic API key is required for claude-task-master to function properly.${NC}"
    echo -e "${YELLOW}Would you like to continue without setting the API key? (y/n)${NC}"
    read -r continue_without_key
    
    if [[ ! "$continue_without_key" =~ ^[Yy]$ ]]; then
        echo -e "${RED}Installation aborted.${NC}"
        exit 1
    fi
fi

# Create .env file
cat > "$INSTALL_DIR/.env" << EOL
# API Keys
ANTHROPIC_API_KEY=${anthropic_api_key}

# Server Configuration
PORT=3003
NODE_ENV=development

# Model Configuration
MODEL=claude-3-sonnet-20240229
EOL

# Create a startup script
echo -e "${YELLOW}Creating startup script...${NC}"
cat > "$INSTALL_DIR/start-claude-task-master.sh" << 'EOL'
#!/bin/bash
cd "$(dirname "$0")"
npm run start
EOL

chmod +x "$INSTALL_DIR/start-claude-task-master.sh"

# Create a systemd service file (optional)
echo -e "${YELLOW}Would you like to create a systemd service for claude-task-master? (y/n)${NC}"
read -r create_service

if [[ "$create_service" =~ ^[Yy]$ ]]; then
    SERVICE_FILE="/tmp/claude-task-master.service"
    
    cat > "$SERVICE_FILE" << EOL
[Unit]
Description=claude-task-master Task Planning
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
SyslogIdentifier=claude-task-master

[Install]
WantedBy=multi-user.target
EOL
    
    sudo mv "$SERVICE_FILE" "/etc/systemd/system/claude-task-master.service"
    sudo systemctl daemon-reload
    sudo systemctl enable claude-task-master.service
    sudo systemctl start claude-task-master.service
    
    echo -e "${GREEN}claude-task-master service created and started. Check status with 'systemctl status claude-task-master.service'${NC}"
else
    echo -e "${GREEN}You can start claude-task-master manually by running '$INSTALL_DIR/start-claude-task-master.sh'${NC}"
fi

echo -e "${GREEN}claude-task-master installation completed!${NC}"
echo -e "${GREEN}claude-task-master will be available at: http://localhost:3003${NC}"
exit 0

