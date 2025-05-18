#!/bin/bash

# serena Installation Script
# This script installs and configures serena - a powerful coding agent toolkit providing semantic retrieval and editing capabilities

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Installing serena - Semantic Retrieval and Editing Agent ===${NC}"

# Create installation directory
INSTALL_DIR="$HOME/ai-stack/serena"
mkdir -p "$INSTALL_DIR"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}Python 3 not found. Installing Python 3...${NC}"
    
    # Install Python 3
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip python3-venv
    
    echo -e "${GREEN}Python 3 installed successfully.${NC}"
fi

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}Git not found. Installing Git...${NC}"
    
    # Install Git
    sudo apt-get update
    sudo apt-get install -y git
    
    echo -e "${GREEN}Git installed successfully.${NC}"
fi

# Clone serena repository
echo -e "${YELLOW}Cloning serena repository...${NC}"
cd "$INSTALL_DIR" || { echo -e "${RED}Failed to change to installation directory${NC}"; exit 1; }

if [ -d ".git" ]; then
    echo -e "${YELLOW}Git repository already exists. Pulling latest changes...${NC}"
    git pull
else
    git clone https://github.com/Zeeeepa/serena.git .
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to clone serena repository. Please check your internet connection and try again.${NC}"
        exit 1
    fi
fi

# Create and activate virtual environment
echo -e "${YELLOW}Setting up Python virtual environment...${NC}"
python3 -m venv venv
source venv/bin/activate

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pip install -U pip
pip install -e .
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install dependencies. Please check the error messages above.${NC}"
    exit 1
fi

# Create a startup script
echo -e "${YELLOW}Creating startup script...${NC}"
cat > "$INSTALL_DIR/start-serena.sh" << 'EOL'
#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
python -m serena.server
EOL

chmod +x "$INSTALL_DIR/start-serena.sh"

# Create a systemd service file (optional)
echo -e "${YELLOW}Would you like to create a systemd service for serena? (y/n)${NC}"
read -r create_service

if [[ "$create_service" =~ ^[Yy]$ ]]; then
    SERVICE_FILE="/tmp/serena.service"
    
    cat > "$SERVICE_FILE" << EOL
[Unit]
Description=serena Semantic Retrieval and Editing Agent
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/venv/bin/python -m serena.server
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=serena

[Install]
WantedBy=multi-user.target
EOL
    
    sudo mv "$SERVICE_FILE" "/etc/systemd/system/serena.service"
    sudo systemctl daemon-reload
    sudo systemctl enable serena.service
    sudo systemctl start serena.service
    
    echo -e "${GREEN}serena service created and started. Check status with 'systemctl status serena.service'${NC}"
else
    echo -e "${GREEN}You can start serena manually by running '$INSTALL_DIR/start-serena.sh'${NC}"
fi

# Configure environment variables
echo -e "${YELLOW}Do you want to configure settings for serena? (y/n)${NC}"
read -r configure_settings

if [[ "$configure_settings" =~ ^[Yy]$ ]]; then
    # Copy template config file
    if [ -f "$INSTALL_DIR/serena_config.template.yml" ]; then
        cp "$INSTALL_DIR/serena_config.template.yml" "$INSTALL_DIR/serena_config.yml"
        echo -e "${GREEN}Created serena_config.yml from template.${NC}"
        echo -e "${YELLOW}Please edit $INSTALL_DIR/serena_config.yml to configure your settings.${NC}"
    else
        echo -e "${RED}Configuration template not found. Please create serena_config.yml manually.${NC}"
    fi
    
    # Create .env file
    cat > "$INSTALL_DIR/.env" << EOL
# Server Configuration
PORT=8000
HOST=0.0.0.0

# LLM Configuration
# Uncomment and set these values according to your needs
# OPENAI_API_KEY=your_openai_api_key
# ANTHROPIC_API_KEY=your_anthropic_api_key
# OLLAMA_BASE_URL=http://localhost:11434
EOL
    
    echo -e "${GREEN}serena settings configured successfully.${NC}"
    echo -e "${YELLOW}Please edit $INSTALL_DIR/.env to set your API keys and other settings.${NC}"
fi

# Inform about LLM installation
echo -e "${YELLOW}For local LLM support, you may need to install Ollama or other LLM providers.${NC}"
echo -e "${YELLOW}See $INSTALL_DIR/llms-install.md for more information.${NC}"

echo -e "${GREEN}serena installation completed!${NC}"
echo -e "${GREEN}serena will be available at: http://localhost:8000${NC}"
echo -e "${GREEN}You can start serena by running '$INSTALL_DIR/start-serena.sh'${NC}"
exit 0

