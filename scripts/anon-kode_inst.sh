#!/bin/bash

# anon-kode Installation Script
# This script installs and configures anon-kode Code Generation

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Installing anon-kode Code Generation ===${NC}"

# Create installation directory
INSTALL_DIR="$HOME/ai-stack/anon-kode"
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

# Clone anon-kode repository
echo -e "${YELLOW}Cloning anon-kode repository...${NC}"
cd "$INSTALL_DIR" || { echo -e "${RED}Failed to change to installation directory${NC}"; exit 1; }

if [ -d ".git" ]; then
    echo -e "${YELLOW}Git repository already exists. Pulling latest changes...${NC}"
    git pull
else
    git clone https://github.com/Zeeeepa/anon-kode.git .
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to clone anon-kode repository. Please check your internet connection and try again.${NC}"
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
echo -e "${YELLOW}Enter your OpenAI API key (leave blank to skip):${NC}"
read -r openai_api_key

echo -e "${YELLOW}Enter your Anthropic API key (leave blank to skip):${NC}"
read -r anthropic_api_key

# Create .env file
cat > "$INSTALL_DIR/.env" << EOL
# API Keys
OPENAI_API_KEY=${openai_api_key}
ANTHROPIC_API_KEY=${anthropic_api_key}

# Server Configuration
PORT=3004
NODE_ENV=development

# Default Model Configuration
DEFAULT_MODEL=gpt-4-turbo
EOL

# Create a startup script
echo -e "${YELLOW}Creating startup script...${NC}"
cat > "$INSTALL_DIR/start-anon-kode.sh" << 'EOL'
#!/bin/bash
cd "$(dirname "$0")"
npm run start
EOL

chmod +x "$INSTALL_DIR/start-anon-kode.sh"

# Create MCP server startup script
echo -e "${YELLOW}Creating MCP server startup script...${NC}"
cat > "$INSTALL_DIR/start-anon-kode-mcp.sh" << 'EOL'
#!/bin/bash
cd "$(dirname "$0")"
npm run mcp
EOL

chmod +x "$INSTALL_DIR/start-anon-kode-mcp.sh"

# Create a systemd service file (optional)
echo -e "${YELLOW}Would you like to create a systemd service for anon-kode? (y/n)${NC}"
read -r create_service

if [[ "$create_service" =~ ^[Yy]$ ]]; then
    SERVICE_FILE="/tmp/anon-kode.service"
    
    cat > "$SERVICE_FILE" << EOL
[Unit]
Description=anon-kode Code Generation
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
SyslogIdentifier=anon-kode

[Install]
WantedBy=multi-user.target
EOL
    
    sudo mv "$SERVICE_FILE" "/etc/systemd/system/anon-kode.service"
    sudo systemctl daemon-reload
    sudo systemctl enable anon-kode.service
    sudo systemctl start anon-kode.service
    
    echo -e "${GREEN}anon-kode service created and started. Check status with 'systemctl status anon-kode.service'${NC}"
    
    # Ask about MCP server service
    echo -e "${YELLOW}Would you like to create a systemd service for anon-kode MCP server? (y/n)${NC}"
    read -r create_mcp_service
    
    if [[ "$create_mcp_service" =~ ^[Yy]$ ]]; then
        MCP_SERVICE_FILE="/tmp/anon-kode-mcp.service"
        
        cat > "$MCP_SERVICE_FILE" << EOL
[Unit]
Description=anon-kode MCP Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/npm run mcp
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=anon-kode-mcp

[Install]
WantedBy=multi-user.target
EOL
        
        sudo mv "$MCP_SERVICE_FILE" "/etc/systemd/system/anon-kode-mcp.service"
        sudo systemctl daemon-reload
        sudo systemctl enable anon-kode-mcp.service
        sudo systemctl start anon-kode-mcp.service
        
        echo -e "${GREEN}anon-kode MCP server service created and started. Check status with 'systemctl status anon-kode-mcp.service'${NC}"
    fi
else
    echo -e "${GREEN}You can start anon-kode manually by running '$INSTALL_DIR/start-anon-kode.sh'${NC}"
    echo -e "${GREEN}You can start anon-kode MCP server manually by running '$INSTALL_DIR/start-anon-kode-mcp.sh'${NC}"
fi

echo -e "${GREEN}anon-kode installation completed!${NC}"
echo -e "${GREEN}anon-kode will be available at: http://localhost:3004${NC}"
echo -e "${GREEN}anon-kode MCP server will be available at: http://localhost:3004/mcp${NC}"
exit 0

