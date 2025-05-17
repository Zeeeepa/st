#!/bin/bash

# pkg.pr.new Installation Script
# This script installs and configures pkg.pr.new Continuous Preview Releases

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Installing pkg.pr.new Continuous Preview Releases ===${NC}"

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

# Install pkg.pr.new globally
echo -e "${YELLOW}Installing pkg.pr.new globally...${NC}"
npm install -g pkg.pr.new
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install pkg.pr.new globally. Please check the error messages above.${NC}"
    exit 1
fi

# Verify installation
if ! command -v pkg-pr-new &> /dev/null; then
    echo -e "${RED}pkg.pr.new installation failed. The 'pkg-pr-new' command is not available.${NC}"
    exit 1
fi

# Create a sample configuration
echo -e "${YELLOW}Would you like to create a sample pkg.pr.new configuration? (y/n)${NC}"
read -r create_sample

if [[ "$create_sample" =~ ^[Yy]$ ]]; then
    # Create a sample directory
    SAMPLE_DIR="$HOME/ai-stack/pkg-pr-new-sample"
    mkdir -p "$SAMPLE_DIR"
    
    # Create package.json
    cat > "$SAMPLE_DIR/package.json" << EOL
{
  "name": "pkg-pr-new-sample",
  "version": "1.0.0",
  "description": "Sample pkg.pr.new configuration",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "preview": "pkg-pr-new publish"
  },
  "devDependencies": {
    "pkg.pr.new": "latest",
    "typescript": "^5.0.0"
  }
}
EOL
    
    # Create .pkg-pr-new.json
    cat > "$SAMPLE_DIR/.pkg-pr-new.json" << EOL
{
  "registry": "https://registry.npmjs.org/",
  "access": "public",
  "tag": "pr",
  "preid": "pr",
  "buildCommand": "npm run build",
  "publishCommand": "npm publish",
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ]
}
EOL
    
    # Create README.md
    cat > "$SAMPLE_DIR/README.md" << EOL
# pkg.pr.new Sample

This is a sample project demonstrating how to use pkg.pr.new for continuous preview releases.

## Usage

\`\`\`bash
# Install dependencies
npm install

# Create a preview release
npm run preview
\`\`\`

## Configuration

See \`.pkg-pr-new.json\` for the configuration options.
EOL
    
    echo -e "${GREEN}Sample pkg.pr.new configuration created at $SAMPLE_DIR${NC}"
    echo -e "${GREEN}To use the sample, navigate to $SAMPLE_DIR and run 'npm install' followed by 'npm run preview'${NC}"
fi

# Display usage information
echo -e "${GREEN}pkg.pr.new installation completed!${NC}"
echo -e "${YELLOW}Usage examples:${NC}"
echo -e "  ${CYAN}pkg-pr-new publish${NC} - Publish a preview release"
echo -e "  ${CYAN}pkg-pr-new init${NC} - Initialize pkg.pr.new configuration"
echo -e "  ${CYAN}pkg-pr-new --help${NC} - Show help information"

exit 0

