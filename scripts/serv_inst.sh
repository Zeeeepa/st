#!/bin/bash

# serv Installation Script
# This script installs and configures serv Orchestration Layer

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Installing serv Orchestration Layer ===${NC}"

# Create installation directory
INSTALL_DIR="$HOME/ai-stack/serv"
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

# Clone serv repository
echo -e "${YELLOW}Cloning serv repository...${NC}"
cd "$INSTALL_DIR" || { echo -e "${RED}Failed to change to installation directory${NC}"; exit 1; }

if [ -d ".git" ]; then
    echo -e "${YELLOW}Git repository already exists. Pulling latest changes...${NC}"
    git pull
else
    git clone https://github.com/Zeeeepa/serv.git .
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to clone serv repository. Please check your internet connection and try again.${NC}"
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
echo -e "${YELLOW}Building serv...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build serv. Please check the error messages above.${NC}"
    exit 1
fi

# Create a startup script
echo -e "${YELLOW}Creating startup script...${NC}"
cat > "$INSTALL_DIR/start-serv.sh" << 'EOL'
#!/bin/bash
cd "$(dirname "$0")"
npm run start
EOL

chmod +x "$INSTALL_DIR/start-serv.sh"

# Create a systemd service file (optional)
echo -e "${YELLOW}Would you like to create a systemd service for serv? (y/n)${NC}"
read -r create_service

if [[ "$create_service" =~ ^[Yy]$ ]]; then
    SERVICE_FILE="/tmp/serv.service"
    
    cat > "$SERVICE_FILE" << EOL
[Unit]
Description=serv Orchestration Layer
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
SyslogIdentifier=serv

[Install]
WantedBy=multi-user.target
EOL
    
    sudo mv "$SERVICE_FILE" "/etc/systemd/system/serv.service"
    sudo systemctl daemon-reload
    sudo systemctl enable serv.service
    sudo systemctl start serv.service
    
    echo -e "${GREEN}serv service created and started. Check status with 'systemctl status serv.service'${NC}"
else
    echo -e "${GREEN}You can start serv manually by running '$INSTALL_DIR/start-serv.sh'${NC}"
fi

# Configure environment variables
echo -e "${YELLOW}Do you want to configure settings for serv? (y/n)${NC}"
read -r configure_settings

if [[ "$configure_settings" =~ ^[Yy]$ ]]; then
    # Create .env file
    cat > "$INSTALL_DIR/.env" << EOL
# Server Configuration
PORT=3002
NODE_ENV=development

# Checkpoint Configuration
CHECKPOINT_DIR=$INSTALL_DIR/checkpoints
MAX_CHECKPOINTS=10

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=$INSTALL_DIR/logs/serv.log
EOL
    
    # Create checkpoint directory
    mkdir -p "$INSTALL_DIR/checkpoints"
    
    # Create logs directory
    mkdir -p "$INSTALL_DIR/logs"
    
    echo -e "${GREEN}serv settings configured successfully.${NC}"
fi

echo -e "${GREEN}serv installation completed!${NC}"
echo -e "${GREEN}serv will be available at: http://localhost:3002${NC}"
exit 0

