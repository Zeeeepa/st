#!/bin/bash

# putout Installation Script
# This script installs and configures putout JavaScript/TypeScript Code Transformation

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Installing putout JavaScript/TypeScript Code Transformation ===${NC}"

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

# Install putout globally
echo -e "${YELLOW}Installing putout globally...${NC}"
npm install -g putout
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install putout globally. Please check the error messages above.${NC}"
    exit 1
fi

# Verify installation
if ! command -v putout &> /dev/null; then
    echo -e "${RED}putout installation failed. The 'putout' command is not available.${NC}"
    exit 1
fi

# Install putout plugins
echo -e "${YELLOW}Installing putout plugins...${NC}"
npm install -g @putout/plugin-typescript
npm install -g @putout/plugin-react
npm install -g @putout/plugin-nodejs
npm install -g @putout/plugin-eslint

# Create a sample configuration
echo -e "${YELLOW}Would you like to create a sample putout configuration? (y/n)${NC}"
read -r create_sample

if [[ "$create_sample" =~ ^[Yy]$ ]]; then
    # Create a sample directory
    SAMPLE_DIR="$HOME/ai-stack/putout-sample"
    mkdir -p "$SAMPLE_DIR"
    
    # Create .putout.json
    cat > "$SAMPLE_DIR/.putout.json" << EOL
{
  "parser": "babel",
  "match": {
    "*.js": {
      "remove-unused-variables": true,
      "remove-console": true,
      "remove-debugger": true,
      "remove-empty": true,
      "remove-duplicate-keys": true,
      "remove-duplicate-case": true,
      "remove-useless-return": true,
      "remove-useless-else": true,
      "remove-useless-spread": true,
      "remove-useless-template-expressions": true,
      "remove-useless-array-constructor": true,
      "remove-useless-object-constructor": true,
      "remove-useless-typeof": true,
      "remove-useless-escape": true,
      "remove-useless-strict": true,
      "remove-useless-new": true,
      "remove-useless-for": true,
      "remove-useless-for-of": true,
      "remove-useless-for-in": true,
      "remove-useless-while": true,
      "remove-useless-do-while": true,
      "remove-useless-switch": true,
      "remove-useless-if": true,
      "remove-useless-continue": true,
      "remove-useless-break": true,
      "remove-useless-await": true,
      "remove-useless-async": true,
      "remove-useless-yield": true,
      "remove-useless-arguments": true,
      "remove-useless-destructuring": true,
      "remove-useless-rest": true,
      "remove-useless-spread": true,
      "remove-useless-template-literals": true,
      "remove-useless-computed-key": true,
      "remove-useless-rename": true,
      "remove-useless-export": true,
      "remove-useless-import": true,
      "remove-useless-default": true,
      "remove-useless-this": true,
      "remove-useless-super": true,
      "remove-useless-constructor": true,
      "remove-useless-class": true,
      "remove-useless-function": true,
      "remove-useless-arrow": true,
      "remove-useless-bind": true,
      "remove-useless-call": true,
      "remove-useless-apply": true,
      "remove-useless-method": true,
      "remove-useless-getter": true,
      "remove-useless-setter": true,
      "remove-useless-property": true,
      "remove-useless-member": true,
      "remove-useless-parameter": true,
      "remove-useless-argument": true,
      "remove-useless-variable": true,
      "remove-useless-constant": true,
      "remove-useless-let": true,
      "remove-useless-var": true,
      "remove-useless-assignment": true,
      "remove-useless-declaration": true,
      "remove-useless-expression": true,
      "remove-useless-statement": true,
      "remove-useless-block": true,
      "remove-useless-parentheses": true,
      "remove-useless-brackets": true,
      "remove-useless-braces": true,
      "remove-useless-quotes": true,
      "remove-useless-semicolon": true,
      "remove-useless-comma": true,
      "remove-useless-dot": true,
      "remove-useless-colon": true,
      "remove-useless-question": true,
      "remove-useless-exclamation": true,
      "remove-useless-plus": true,
      "remove-useless-minus": true,
      "remove-useless-multiply": true,
      "remove-useless-divide": true,
      "remove-useless-modulo": true,
      "remove-useless-power": true,
      "remove-useless-and": true,
      "remove-useless-or": true,
      "remove-useless-not": true,
      "remove-useless-equal": true,
      "remove-useless-not-equal": true,
      "remove-useless-strict-equal": true,
      "remove-useless-strict-not-equal": true,
      "remove-useless-greater": true,
      "remove-useless-greater-equal": true,
      "remove-useless-less": true,
      "remove-useless-less-equal": true,
      "remove-useless-increment": true,
      "remove-useless-decrement": true,
      "remove-useless-plus-equal": true,
      "remove-useless-minus-equal": true,
      "remove-useless-multiply-equal": true,
      "remove-useless-divide-equal": true,
      "remove-useless-modulo-equal": true,
      "remove-useless-power-equal": true,
      "remove-useless-and-equal": true,
      "remove-useless-or-equal": true,
      "remove-useless-not-equal": true,
      "remove-useless-equal-equal": true,
      "remove-useless-not-equal-equal": true,
      "remove-useless-strict-equal-equal": true,
      "remove-useless-strict-not-equal-equal": true,
      "remove-useless-greater-equal-equal": true,
      "remove-useless-less-equal-equal": true,
      "remove-useless-increment-equal": true,
      "remove-useless-decrement-equal": true
    },
    "*.ts": {
      "typescript/remove-unused-types": true,
      "typescript/remove-unused-interfaces": true,
      "typescript/remove-unused-imports": true,
      "typescript/remove-useless-types": true,
      "typescript/remove-useless-interfaces": true,
      "typescript/remove-useless-imports": true
    },
    "*.jsx": {
      "react/remove-unused-props": true,
      "react/remove-useless-props": true,
      "react/remove-useless-fragments": true,
      "react/remove-useless-jsx": true
    },
    "*.tsx": {
      "react/remove-unused-props": true,
      "react/remove-useless-props": true,
      "react/remove-useless-fragments": true,
      "react/remove-useless-jsx": true,
      "typescript/remove-unused-types": true,
      "typescript/remove-unused-interfaces": true,
      "typescript/remove-unused-imports": true,
      "typescript/remove-useless-types": true,
      "typescript/remove-useless-interfaces": true,
      "typescript/remove-useless-imports": true
    }
  }
}
EOL
    
    # Create sample JavaScript file
    cat > "$SAMPLE_DIR/sample.js" << EOL
// Sample JavaScript file with issues that putout can fix

// Unused variable
const unusedVar = 'unused';

// Useless return
function uselessReturn() {
    console.log('Hello');
    return;
}

// Useless else
function uselessElse(condition) {
    if (condition) {
        return true;
    } else {
        return false;
    }
}

// Duplicate keys
const obj = {
    a: 1,
    b: 2,
    a: 3
};

// Console log
console.log('This will be removed');

// Debugger statement
debugger;

// Export the functions
module.exports = {
    uselessReturn,
    uselessElse
};
EOL
    
    # Create README.md
    cat > "$SAMPLE_DIR/README.md" << EOL
# putout Sample

This is a sample project demonstrating how to use putout for JavaScript/TypeScript code transformation.

## Usage

\`\`\`bash
# Fix issues in the current directory
putout .

# Fix issues in a specific file
putout sample.js

# Show issues without fixing them
putout --dry-run .
\`\`\`

## Configuration

See \`.putout.json\` for the configuration options.
EOL
    
    echo -e "${GREEN}Sample putout configuration created at $SAMPLE_DIR${NC}"
    echo -e "${GREEN}To use the sample, navigate to $SAMPLE_DIR and run 'putout .'${NC}"
fi

# Display usage information
echo -e "${GREEN}putout installation completed!${NC}"
echo -e "${YELLOW}Usage examples:${NC}"
echo -e "  ${CYAN}putout .${NC} - Fix issues in the current directory"
echo -e "  ${CYAN}putout file.js${NC} - Fix issues in a specific file"
echo -e "  ${CYAN}putout --dry-run .${NC} - Show issues without fixing them"
echo -e "  ${CYAN}putout --help${NC} - Show help information"

exit 0

