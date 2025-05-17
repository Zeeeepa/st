#!/bin/bash

# codegen-sdk Installation Script
# This script installs and configures CodegenSDK Static Code Analysis

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Installing CodegenSDK Static Code Analysis ===${NC}"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}Python 3 not found. Installing Python 3...${NC}"
    
    # Install Python 3
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip python3-venv
    
    echo -e "${GREEN}Python 3 installed successfully.${NC}"
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo -e "${RED}pip3 not found. Please install pip3 and try again.${NC}"
    exit 1
fi

# Create a virtual environment (optional)
echo -e "${YELLOW}Would you like to create a virtual environment for CodegenSDK? (y/n)${NC}"
read -r create_venv

if [[ "$create_venv" =~ ^[Yy]$ ]]; then
    # Create installation directory
    INSTALL_DIR="$HOME/ai-stack/codegen-sdk"
    mkdir -p "$INSTALL_DIR"
    
    # Create virtual environment
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv "$INSTALL_DIR/venv"
    
    # Activate virtual environment
    source "$INSTALL_DIR/venv/bin/activate"
    
    # Install CodegenSDK
    echo -e "${YELLOW}Installing CodegenSDK in virtual environment...${NC}"
    pip install codegen-sdk
    
    # Create activation script
    echo -e "${YELLOW}Creating activation script...${NC}"
    cat > "$INSTALL_DIR/activate-codegen-sdk.sh" << EOL
#!/bin/bash
source "$(dirname "$0")/venv/bin/activate"
echo "CodegenSDK virtual environment activated."
echo "You can now use the 'codegen' command."
echo "To deactivate, run 'deactivate'."
EOL
    
    chmod +x "$INSTALL_DIR/activate-codegen-sdk.sh"
    
    echo -e "${GREEN}CodegenSDK installed in virtual environment at $INSTALL_DIR${NC}"
    echo -e "${GREEN}To activate the virtual environment, run 'source $INSTALL_DIR/activate-codegen-sdk.sh'${NC}"
else
    # Install CodegenSDK globally
    echo -e "${YELLOW}Installing CodegenSDK globally...${NC}"
    pip3 install codegen-sdk
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install CodegenSDK globally. Please check the error messages above.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}CodegenSDK installed globally.${NC}"
fi

# Create a sample configuration
echo -e "${YELLOW}Would you like to create a sample CodegenSDK configuration? (y/n)${NC}"
read -r create_sample

if [[ "$create_sample" =~ ^[Yy]$ ]]; then
    # Create a sample directory
    SAMPLE_DIR="$HOME/ai-stack/codegen-sdk-sample"
    mkdir -p "$SAMPLE_DIR"
    
    # Create sample Python script
    cat > "$SAMPLE_DIR/analyze_code.py" << EOL
#!/usr/bin/env python3

from codegen import Codebase

def analyze_codebase(repo_path):
    """
    Analyze a codebase using CodegenSDK.
    
    Args:
        repo_path (str): Path to the repository to analyze.
    """
    print(f"Analyzing codebase at {repo_path}...")
    
    # Initialize the codebase
    codebase = Codebase(repo_path)
    
    # Get basic statistics
    print("\nBasic Statistics:")
    print(f"Number of files: {len(codebase.files)}")
    print(f"Number of functions: {len(codebase.functions)}")
    print(f"Number of classes: {len(codebase.classes)}")
    
    # Analyze functions
    print("\nTop 5 largest functions:")
    functions_by_size = sorted(codebase.functions, key=lambda f: len(f.source_code), reverse=True)
    for i, func in enumerate(functions_by_size[:5], 1):
        print(f"{i}. {func.name} ({len(func.source_code)} characters) in {func.filepath}")
    
    # Analyze dependencies
    print("\nDependency Analysis:")
    for file in codebase.files[:5]:  # Analyze first 5 files
        print(f"\nFile: {file.filepath}")
        print("Imports:")
        for imp in file.imports:
            print(f"  - {imp.name}")
    
    # Analyze function calls
    print("\nFunction Call Analysis:")
    for func in codebase.functions[:5]:  # Analyze first 5 functions
        print(f"\nFunction: {func.name}")
        print("Calls:")
        for call in func.call_sites:
            print(f"  - {call.name}")
    
    print("\nAnalysis complete!")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python analyze_code.py <repo_path>")
        sys.exit(1)
    
    repo_path = sys.argv[1]
    analyze_codebase(repo_path)
EOL
    
    chmod +x "$SAMPLE_DIR/analyze_code.py"
    
    # Create README.md
    cat > "$SAMPLE_DIR/README.md" << EOL
# CodegenSDK Sample

This is a sample project demonstrating how to use CodegenSDK for static code analysis.

## Usage

\`\`\`bash
# Analyze a codebase
python analyze_code.py /path/to/repository

# If using virtual environment, activate it first
source ~/ai-stack/codegen-sdk/activate-codegen-sdk.sh
python analyze_code.py /path/to/repository
\`\`\`

## Features

The sample script demonstrates:

- Basic codebase statistics
- Function size analysis
- Dependency analysis
- Function call analysis

## Documentation

For more information, visit the [Codegen documentation](https://docs.codegen.sh/).
EOL
    
    echo -e "${GREEN}Sample CodegenSDK configuration created at $SAMPLE_DIR${NC}"
    echo -e "${GREEN}To use the sample, navigate to $SAMPLE_DIR and run 'python analyze_code.py /path/to/repository'${NC}"
fi

# Display usage information
echo -e "${GREEN}CodegenSDK installation completed!${NC}"
echo -e "${YELLOW}Basic usage:${NC}"
echo -e "  ${CYAN}from codegen import Codebase${NC}"
echo -e "  ${CYAN}codebase = Codebase('/path/to/repository')${NC}"
echo -e "  ${CYAN}print(f'Number of files: {len(codebase.files)}')${NC}"
echo -e "  ${CYAN}print(f'Number of functions: {len(codebase.functions)}')${NC}"
echo -e "  ${CYAN}print(f'Number of classes: {len(codebase.classes)}')${NC}"

exit 0

