#!/bin/bash

# Motia Installation Script
# This script installs and configures Motia central interface

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Installing Motia Central Interface ===${NC}"

# Create installation directory
INSTALL_DIR="$HOME/ai-stack/motia"
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

# Clone Motia repository
echo -e "${YELLOW}Cloning Motia repository...${NC}"
cd "$INSTALL_DIR" || { echo -e "${RED}Failed to change to installation directory${NC}"; exit 1; }

if [ -d ".git" ]; then
    echo -e "${YELLOW}Git repository already exists. Pulling latest changes...${NC}"
    git pull
else
    git clone https://github.com/Zeeeepa/motia.git .
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to clone Motia repository. Please check your internet connection and try again.${NC}"
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
echo -e "${YELLOW}Building Motia...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build Motia. Please check the error messages above.${NC}"
    exit 1
fi

# Create a startup script
echo -e "${YELLOW}Creating startup script...${NC}"
cat > "$INSTALL_DIR/start-motia.sh" << 'EOL'
#!/bin/bash
cd "$(dirname "$0")"
npm run start
EOL

chmod +x "$INSTALL_DIR/start-motia.sh"

# Create a systemd service file (optional)
echo -e "${YELLOW}Would you like to create a systemd service for Motia? (y/n)${NC}"
read -r create_service

if [[ "$create_service" =~ ^[Yy]$ ]]; then
    SERVICE_FILE="/tmp/motia.service"
    
    cat > "$SERVICE_FILE" << EOL
[Unit]
Description=Motia Central Interface
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
SyslogIdentifier=motia

[Install]
WantedBy=multi-user.target
EOL
    
    sudo mv "$SERVICE_FILE" "/etc/systemd/system/motia.service"
    sudo systemctl daemon-reload
    sudo systemctl enable motia.service
    sudo systemctl start motia.service
    
    echo -e "${GREEN}Motia service created and started. Check status with 'systemctl status motia.service'${NC}"
else
    echo -e "${GREEN}You can start Motia manually by running '$INSTALL_DIR/start-motia.sh'${NC}"
fi

echo -e "${GREEN}Motia installation completed!${NC}"
echo -e "${GREEN}Motia will be available at: http://localhost:3000${NC}"
exit 0

