#!/bin/bash

# tsup Installation Script
# This script installs and configures tsup TypeScript Bundling

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Installing tsup TypeScript Bundling ===${NC}"

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

# Install tsup globally
echo -e "${YELLOW}Installing tsup globally...${NC}"
npm install -g tsup
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install tsup globally. Please check the error messages above.${NC}"
    exit 1
fi

# Verify installation
if ! command -v tsup &> /dev/null; then
    echo -e "${RED}tsup installation failed. The 'tsup' command is not available.${NC}"
    exit 1
fi

# Create a sample tsup configuration
echo -e "${YELLOW}Would you like to create a sample tsup configuration? (y/n)${NC}"
read -r create_sample

if [[ "$create_sample" =~ ^[Yy]$ ]]; then
    # Create a sample directory
    SAMPLE_DIR="$HOME/ai-stack/tsup-sample"
    mkdir -p "$SAMPLE_DIR"
    
    # Create package.json
    cat > "$SAMPLE_DIR/package.json" << EOL
{
  "name": "tsup-sample",
  "version": "1.0.0",
  "description": "Sample tsup configuration",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch"
  },
  "devDependencies": {
    "tsup": "^7.0.0",
    "typescript": "^5.0.0"
  }
}
EOL
    
    # Create tsup.config.ts
    cat > "$SAMPLE_DIR/tsup.config.ts" << EOL
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});
EOL
    
    # Create src directory
    mkdir -p "$SAMPLE_DIR/src"
    
    # Create sample source file
    cat > "$SAMPLE_DIR/src/index.ts" << EOL
/**
 * Sample function
 */
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

/**
 * Sample class
 */
export class Greeter {
  private prefix: string;
  
  constructor(prefix: string = 'Hello') {
    this.prefix = prefix;
  }
  
  greet(name: string): string {
    return \`\${this.prefix}, \${name}!\`;
  }
}

// Default export
export default {
  greet,
  Greeter,
};
EOL
    
    # Create README.md
    cat > "$SAMPLE_DIR/README.md" << EOL
# tsup Sample

This is a sample project demonstrating how to use tsup for TypeScript bundling.

## Usage

\`\`\`bash
# Install dependencies
npm install

# Build the project
npm run build

# Build in watch mode
npm run dev
\`\`\`

## Configuration

See \`tsup.config.ts\` for the configuration options.
EOL
    
    echo -e "${GREEN}Sample tsup configuration created at $SAMPLE_DIR${NC}"
    echo -e "${GREEN}To use the sample, navigate to $SAMPLE_DIR and run 'npm install' followed by 'npm run build'${NC}"
fi

# Display usage information
echo -e "${GREEN}tsup installation completed!${NC}"
echo -e "${YELLOW}Usage examples:${NC}"
echo -e "  ${CYAN}tsup src/index.ts${NC} - Bundle a TypeScript file"
echo -e "  ${CYAN}tsup src/index.ts --watch${NC} - Bundle in watch mode"
echo -e "  ${CYAN}tsup src/index.ts --format esm,cjs${NC} - Bundle to multiple formats"
echo -e "  ${CYAN}tsup src/index.ts --dts${NC} - Generate declaration files"
echo -e "  ${CYAN}tsup --help${NC} - Show help information"

exit 0

