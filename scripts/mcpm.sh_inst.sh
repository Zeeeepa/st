#!/bin/bash

# mcpm.sh Installation Script
# This script installs and configures mcpm.sh CLI Package Manager for MCP

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Installing mcpm.sh CLI Package Manager for MCP ===${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Installing Node.js...${NC}"
    
    # Install Node.js
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    echo -e "${GREEN}Node.js installed successfully.${NC}"
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm not found. Please install npm and try again.${NC}"
    exit 1
fi

# Install mcpm.sh globally
echo -e "${YELLOW}Installing mcpm.sh globally...${NC}"
npm install -g mcpm.sh
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install mcpm.sh. Please check the error messages above.${NC}"
    exit 1
fi

# Verify installation
if ! command -v mcpm &> /dev/null; then
    echo -e "${RED}mcpm.sh installation failed. The 'mcpm' command is not available.${NC}"
    exit 1
fi

# Configure mcpm.sh
echo -e "${YELLOW}Configuring mcpm.sh...${NC}"

# Create configuration directory
MCPM_CONFIG_DIR="$HOME/.mcpm"
mkdir -p "$MCPM_CONFIG_DIR"

# Create configuration file
cat > "$MCPM_CONFIG_DIR/config.json" << EOL
{
  "registry": "https://registry.npmjs.org/",
  "mcpHubUrl": "http://localhost:3005",
  "defaultInstallMode": "local",
  "defaultModel": "gpt-4-turbo",
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

echo -e "${GREEN}mcpm.sh configuration created at $MCPM_CONFIG_DIR/config.json${NC}"

# Display usage information
echo -e "${GREEN}mcpm.sh installation completed!${NC}"
echo -e "${YELLOW}Usage examples:${NC}"
echo -e "  ${CYAN}mcpm install <package-name>${NC} - Install an MCP package"
echo -e "  ${CYAN}mcpm list${NC} - List installed MCP packages"
echo -e "  ${CYAN}mcpm info <package-name>${NC} - Show information about an MCP package"
echo -e "  ${CYAN}mcpm config${NC} - Show current configuration"
echo -e "  ${CYAN}mcpm help${NC} - Show help information"

exit 0

