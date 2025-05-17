#!/bin/bash

# super-linter Installation Script
# This script installs and configures super-linter Comprehensive Multi-language Linting

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Installing super-linter Comprehensive Multi-language Linting ===${NC}"

# Create installation directory
INSTALL_DIR="$HOME/ai-stack/super-linter"
mkdir -p "$INSTALL_DIR"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Installing Docker...${NC}"
    
    # Install Docker dependencies
    sudo apt-get update
    sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    
    # Add Docker repository
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    
    # Install Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    
    # Add current user to docker group
    sudo usermod -aG docker "$USER"
    
    echo -e "${GREEN}Docker installed successfully. You may need to log out and log back in for group changes to take effect.${NC}"
fi

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}Git not found. Installing Git...${NC}"
    
    # Install Git
    sudo apt-get update
    sudo apt-get install -y git
    
    echo -e "${GREEN}Git installed successfully.${NC}"
fi

# Clone super-linter repository
echo -e "${YELLOW}Cloning super-linter repository...${NC}"
cd "$INSTALL_DIR" || { echo -e "${RED}Failed to change to installation directory${NC}"; exit 1; }

if [ -d ".git" ]; then
    echo -e "${YELLOW}Git repository already exists. Pulling latest changes...${NC}"
    git pull
else
    git clone https://github.com/Zeeeepa/super-linter.git .
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to clone super-linter repository. Please check your internet connection and try again.${NC}"
        exit 1
    fi
fi

# Pull the super-linter Docker image
echo -e "${YELLOW}Pulling super-linter Docker image...${NC}"
docker pull github/super-linter:latest
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to pull super-linter Docker image. Please check your Docker installation and internet connection.${NC}"
    exit 1
fi

# Create a wrapper script
echo -e "${YELLOW}Creating super-linter wrapper script...${NC}"
cat > "$INSTALL_DIR/run-super-linter.sh" << 'EOL'
#!/bin/bash

# super-linter wrapper script

# Default values
DEFAULT_WORKSPACE="$(pwd)"
DEFAULT_LINTER_RULES_PATH="$DEFAULT_WORKSPACE/.github/linters"

# Parse command line arguments
WORKSPACE="$DEFAULT_WORKSPACE"
LINTER_RULES_PATH="$DEFAULT_LINTER_RULES_PATH"
ADDITIONAL_ARGS=""

# Display usage information
function show_usage {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -w, --workspace PATH       Path to the workspace (default: current directory)"
    echo "  -r, --rules PATH           Path to linter rules (default: .github/linters in workspace)"
    echo "  -h, --help                 Show this help message"
    echo ""
    echo "Any additional arguments will be passed directly to super-linter."
    echo ""
    echo "Example:"
    echo "  $0 -w /path/to/project --validate-all-codebase"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -w|--workspace)
            WORKSPACE="$2"
            shift
            shift
            ;;
        -r|--rules)
            LINTER_RULES_PATH="$2"
            shift
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            ADDITIONAL_ARGS="$ADDITIONAL_ARGS $1"
            shift
            ;;
    esac
done

# Ensure workspace exists
if [ ! -d "$WORKSPACE" ]; then
    echo "Error: Workspace directory '$WORKSPACE' does not exist."
    exit 1
fi

# Run super-linter
docker run \
    -e RUN_LOCAL=true \
    -e USE_FIND_ALGORITHM=true \
    -v "$WORKSPACE":/tmp/lint \
    -v "$LINTER_RULES_PATH":/tmp/lint/.github/linters \
    github/super-linter:latest $ADDITIONAL_ARGS
EOL

chmod +x "$INSTALL_DIR/run-super-linter.sh"

# Create a symbolic link to the wrapper script
echo -e "${YELLOW}Creating symbolic link to the wrapper script...${NC}"
sudo ln -sf "$INSTALL_DIR/run-super-linter.sh" /usr/local/bin/super-linter

# Create a sample configuration
echo -e "${YELLOW}Would you like to create a sample super-linter configuration? (y/n)${NC}"
read -r create_sample

if [[ "$create_sample" =~ ^[Yy]$ ]]; then
    # Create a sample directory
    SAMPLE_DIR="$HOME/ai-stack/super-linter-sample"
    mkdir -p "$SAMPLE_DIR/.github/linters"
    
    # Create sample linter configuration files
    
    # JavaScript/TypeScript
    cat > "$SAMPLE_DIR/.github/linters/.eslintrc.yml" << EOL
---
extends:
  - eslint:recommended
  - plugin:@typescript-eslint/recommended
parser: '@typescript-eslint/parser'
plugins:
  - '@typescript-eslint'
root: true
EOL
    
    # Python
    cat > "$SAMPLE_DIR/.github/linters/.python-lint" << EOL
[flake8]
max-line-length = 100
exclude = .git,__pycache__,build,dist
EOL
    
    # Markdown
    cat > "$SAMPLE_DIR/.github/linters/.markdown-lint.yml" << EOL
---
default: true
line-length: false
no-hard-tabs: true
EOL
    
    # YAML
    cat > "$SAMPLE_DIR/.github/linters/.yaml-lint.yml" << EOL
---
extends: default
rules:
  line-length:
    max: 100
    level: warning
EOL
    
    # Create README.md
    cat > "$SAMPLE_DIR/README.md" << EOL
# super-linter Sample

This is a sample project demonstrating how to use super-linter for comprehensive multi-language linting.

## Usage

\`\`\`bash
# Run super-linter on this directory
super-linter -w $(pwd)

# Run super-linter with specific options
super-linter -w $(pwd) --validate-all-codebase
\`\`\`

## Configuration

Linter configurations are stored in the \`.github/linters\` directory.
EOL
    
    echo -e "${GREEN}Sample super-linter configuration created at $SAMPLE_DIR${NC}"
    echo -e "${GREEN}To use the sample, navigate to $SAMPLE_DIR and run 'super-linter -w $(pwd)'${NC}"
fi

# Display usage information
echo -e "${GREEN}super-linter installation completed!${NC}"
echo -e "${YELLOW}Usage examples:${NC}"
echo -e "  ${CYAN}super-linter -w /path/to/project${NC} - Run super-linter on a project"
echo -e "  ${CYAN}super-linter -w /path/to/project --validate-all-codebase${NC} - Validate all codebase"
echo -e "  ${CYAN}super-linter --help${NC} - Show help information"

exit 0

