#!/bin/bash

# agent-swarm-kit Installation Script
# This script installs and configures agent-swarm-kit Agent Collaboration

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Installing agent-swarm-kit Agent Collaboration ===${NC}"

# Create installation directory
INSTALL_DIR="$HOME/ai-stack/agent-swarm-kit"
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

# Clone agent-swarm-kit repository
echo -e "${YELLOW}Cloning agent-swarm-kit repository...${NC}"
cd "$INSTALL_DIR" || { echo -e "${RED}Failed to change to installation directory${NC}"; exit 1; }

if [ -d ".git" ]; then
    echo -e "${YELLOW}Git repository already exists. Pulling latest changes...${NC}"
    git pull
else
    git clone https://github.com/Zeeeepa/agent-swarm-kit.git .
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to clone agent-swarm-kit repository. Please check your internet connection and try again.${NC}"
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
echo -e "${YELLOW}Building agent-swarm-kit...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build agent-swarm-kit. Please check the error messages above.${NC}"
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
PORT=3007
NODE_ENV=development

# Redis Configuration (optional)
# REDIS_URL=redis://localhost:6379
EOL

# Check if Redis is installed
if ! command -v redis-server &> /dev/null; then
    echo -e "${YELLOW}Would you like to install Redis for agent-swarm-kit? (y/n)${NC}"
    read -r install_redis
    
    if [[ "$install_redis" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Installing Redis...${NC}"
        sudo apt-get update
        sudo apt-get install -y redis-server
        
        # Enable and start Redis
        sudo systemctl enable redis-server
        sudo systemctl start redis-server
        
        # Update .env file with Redis URL
        sed -i 's/# REDIS_URL=redis:\/\/localhost:6379/REDIS_URL=redis:\/\/localhost:6379/' "$INSTALL_DIR/.env"
        
        echo -e "${GREEN}Redis installed and configured.${NC}"
    fi
fi

# Create a startup script
echo -e "${YELLOW}Creating startup script...${NC}"
cat > "$INSTALL_DIR/start-agent-swarm-kit.sh" << 'EOL'
#!/bin/bash
cd "$(dirname "$0")"
npm run start
EOL

chmod +x "$INSTALL_DIR/start-agent-swarm-kit.sh"

# Create a systemd service file (optional)
echo -e "${YELLOW}Would you like to create a systemd service for agent-swarm-kit? (y/n)${NC}"
read -r create_service

if [[ "$create_service" =~ ^[Yy]$ ]]; then
    SERVICE_FILE="/tmp/agent-swarm-kit.service"
    
    cat > "$SERVICE_FILE" << EOL
[Unit]
Description=agent-swarm-kit Agent Collaboration
After=network.target redis-server.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=agent-swarm-kit

[Install]
WantedBy=multi-user.target
EOL
    
    sudo mv "$SERVICE_FILE" "/etc/systemd/system/agent-swarm-kit.service"
    sudo systemctl daemon-reload
    sudo systemctl enable agent-swarm-kit.service
    sudo systemctl start agent-swarm-kit.service
    
    echo -e "${GREEN}agent-swarm-kit service created and started. Check status with 'systemctl status agent-swarm-kit.service'${NC}"
else
    echo -e "${GREEN}You can start agent-swarm-kit manually by running '$INSTALL_DIR/start-agent-swarm-kit.sh'${NC}"
fi

echo -e "${GREEN}agent-swarm-kit installation completed!${NC}"
echo -e "${GREEN}agent-swarm-kit will be available at: http://localhost:3007${NC}"
exit 0

