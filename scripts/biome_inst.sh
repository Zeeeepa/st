#!/bin/bash

# biome Installation Script
# This script installs and configures biome High-performance Formatter and Linter

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Installing biome High-performance Formatter and Linter ===${NC}"

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

# Install biome globally
echo -e "${YELLOW}Installing biome globally...${NC}"
npm install -g @biomejs/biome
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install biome globally. Please check the error messages above.${NC}"
    exit 1
fi

# Verify installation
if ! command -v biome &> /dev/null; then
    echo -e "${RED}biome installation failed. The 'biome' command is not available.${NC}"
    exit 1
fi

# Create a sample configuration
echo -e "${YELLOW}Would you like to create a sample biome configuration? (y/n)${NC}"
read -r create_sample

if [[ "$create_sample" =~ ^[Yy]$ ]]; then
    # Create a sample directory
    SAMPLE_DIR="$HOME/ai-stack/biome-sample"
    mkdir -p "$SAMPLE_DIR"
    
    # Create biome.json
    cat > "$SAMPLE_DIR/biome.json" << EOL
{
  "$schema": "https://biomejs.dev/schemas/1.4.1/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "noUndeclaredVariables": "error",
        "useHookAtTopLevel": "error"
      },
      "suspicious": {
        "noConsoleLog": "warn",
        "noExplicitAny": "warn"
      },
      "style": {
        "noNegationElse": "warn",
        "useTemplate": "warn"
      },
      "complexity": {
        "noForEach": "warn",
        "useOptionalChain": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingComma": "all",
      "semicolons": "always"
    }
  }
}
EOL
    
    # Create sample JavaScript file
    cat > "$SAMPLE_DIR/sample.js" << EOL
// Sample JavaScript file with issues that biome can fix

// Unused variable
const unusedVar = 'unused';

// Console log
console.log('This will be flagged');

// Explicit any (TypeScript)
function processData(data) {
  return data;
}

// No template string
const name = "John";
const greeting = "Hello, " + name + "!";

// No optional chain
const user = {
  profile: {
    address: {
      city: "New York"
    }
  }
};

const city = user && user.profile && user.profile.address && user.profile.address.city;

// forEach instead of map/filter
const numbers = [1, 2, 3, 4, 5];
const doubled = [];
numbers.forEach(num => {
  doubled.push(num * 2);
});

// Export the function
module.exports = {
  processData
};
EOL
    
    # Create README.md
    cat > "$SAMPLE_DIR/README.md" << EOL
# biome Sample

This is a sample project demonstrating how to use biome for high-performance formatting and linting.

## Usage

\`\`\`bash
# Check for issues in the current directory
biome check .

# Format files in the current directory
biome format .

# Fix issues in the current directory
biome check --apply .

# Format and fix issues in the current directory
biome check --apply-unsafe .
\`\`\`

## Configuration

See \`biome.json\` for the configuration options.
EOL
    
    echo -e "${GREEN}Sample biome configuration created at $SAMPLE_DIR${NC}"
    echo -e "${GREEN}To use the sample, navigate to $SAMPLE_DIR and run 'biome check .'${NC}"
fi

# Display usage information
echo -e "${GREEN}biome installation completed!${NC}"
echo -e "${YELLOW}Usage examples:${NC}"
echo -e "  ${CYAN}biome init${NC} - Initialize biome configuration"
echo -e "  ${CYAN}biome check .${NC} - Check for issues in the current directory"
echo -e "  ${CYAN}biome format .${NC} - Format files in the current directory"
echo -e "  ${CYAN}biome check --apply .${NC} - Fix issues in the current directory"
echo -e "  ${CYAN}biome check --apply-unsafe .${NC} - Format and fix issues in the current directory"
echo -e "  ${CYAN}biome --help${NC} - Show help information"

exit 0

