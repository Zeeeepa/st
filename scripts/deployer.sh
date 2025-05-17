#!/bin/bash

# SwarmStack Deployment Script
# This script allows you to select and deploy components of the SwarmStack

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Define the components
declare -a COMPONENTS=(
    "temporal"
    "motia"
    "aigne-framework"
    "serv"
    "serena"
    "claude-task-master"
    "anon-kode"
    "eko"
    "agent-swarm-kit"
    "tsup"
    "pkg.pr.new"
    "mcphub"
    "mcpm.sh"
    "super-linter"
    "putout"
    "biome"
    "codegen-sdk"
)

# Function to print banner
print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║                 SwarmStack Deployment Tool                    ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Function to print component description
print_component_description() {
    local component=$1
    
    case $component in
        "temporal")
            echo -e "${CYAN}Temporal - Workflow Engine${NC}"
            echo "  Durable execution ensuring workflows survive failures"
            echo "  Workflow versioning for parallel systems"
            echo "  Built-in monitoring of workflow states"
            ;;
        "motia")
            echo -e "${CYAN}Motia - Central Interface${NC}"
            echo "  Unified interface for all components"
            echo "  Extensible plugin system"
            echo "  Real-time monitoring dashboard"
            ;;
        "aigne-framework")
            echo -e "${CYAN}aigne-framework - MCP Flow Engine${NC}"
            echo "  Workflow orchestration for AI agents"
            echo "  Modular component architecture"
            echo "  Extensible plugin system"
            ;;
        "serv")
            echo -e "${CYAN}serv - Orchestration Layer${NC}"
            echo "  High-level orchestration with safety mechanisms"
            echo "  Checkpoint system for safe operations"
            echo "  Rollback management for error recovery"
            ;;
        "serena")
            echo -e "${CYAN}serena - Semantic Retrieval and Editing Agent${NC}"
            echo "  Powerful coding agent toolkit"
            echo "  Semantic code retrieval capabilities"
            echo "  Precise code editing functionality"
            echo "  MCP server & Agno integration"
            ;;
        "claude-task-master")
            echo -e "${CYAN}claude-task-master - Task Planning${NC}"
            echo "  AI-powered task management via MCP"
            echo "  Task breakdown and prioritization"
            echo "  Integration with AI assistants"
            ;;
        "anon-kode")
            echo -e "${CYAN}anon-kode - Code Generation${NC}"
            echo "  Terminal-based AI coding tool"
            echo "  Compatible with any OpenAI-style API"
            echo "  MCP server capabilities"
            ;;
        "eko")
            echo -e "${CYAN}eko - Natural Language Processing${NC}"
            echo "  Process natural language requests and conduct research"
            echo "  Internet research capabilities"
            echo "  Multi-step workflow processing"
            ;;
        "agent-swarm-kit")
            echo -e "${CYAN}agent-swarm-kit - Agent Collaboration${NC}"
            echo "  Enable collaboration between specialized AI agents"
            echo "  Conversation testbed for agent interaction simulation"
            echo "  MCP-ready for seamless integration"
            ;;
        "tsup")
            echo -e "${CYAN}tsup - TypeScript Bundling${NC}"
            echo "  Efficient TypeScript bundling"
            ;;
        "pkg.pr.new")
            echo -e "${CYAN}pkg.pr.new - Continuous Preview Releases${NC}"
            echo "  Continuous preview releases for libraries"
            ;;
        "mcphub")
            echo -e "${CYAN}mcphub - Central Repository for MCP Components${NC}"
            echo "  Web-based platform with UI dashboard"
            echo "  Aggregates multiple MCP servers"
            echo "  Unified HTTP/SSE endpoints"
            ;;
        "mcpm.sh")
            echo -e "${CYAN}mcpm.sh - CLI Package Manager for MCP${NC}"
            echo "  Discovering and installing MCP servers"
            echo "  Managing configurations"
            echo "  Cross-client compatibility"
            ;;
        "super-linter")
            echo -e "${CYAN}super-linter - Comprehensive Multi-language Linting${NC}"
            echo "  Comprehensive multi-language linting"
            ;;
        "putout")
            echo -e "${CYAN}putout - JavaScript/TypeScript Code Transformation${NC}"
            echo "  JavaScript/TypeScript code transformation"
            ;;
        "biome")
            echo -e "${CYAN}biome - High-performance Formatter and Linter${NC}"
            echo "  High-performance formatter and linter"
            ;;
        "codegen-sdk")
            echo -e "${CYAN}CodegenSDK - Static Code Analysis${NC}"
            echo "  Static code analysis & PR context comparison"
            ;;
        *)
            echo -e "${YELLOW}No description available for $component${NC}"
            ;;
    esac
    echo ""
}

# Function to check if a component is selected
is_selected() {
    local component=$1
    for selected in "${SELECTED_COMPONENTS[@]}"; do
        if [[ "$selected" == "$component" ]]; then
            return 0
        fi
    done
    return 1
}

# Function to display the menu
display_menu() {
    clear
    print_banner
    
    echo -e "${YELLOW}Select components to deploy (use space to toggle, enter to confirm):${NC}"
    echo ""
    
    for i in "${!COMPONENTS[@]}"; do
        if is_selected "${COMPONENTS[$i]}"; then
            echo -e "${GREEN}[X] $((i+1)). ${COMPONENTS[$i]}${NC}"
        else
            echo -e "[ ] $((i+1)). ${COMPONENTS[$i]}"
        fi
    done
    
    echo ""
    echo -e "${MAGENTA}A${NC} - Select All"
    echo -e "${MAGENTA}N${NC} - Select None"
    echo -e "${MAGENTA}I${NC} - Component Info"
    echo -e "${MAGENTA}D${NC} - Deploy Selected Components"
    echo -e "${MAGENTA}Q${NC} - Quit"
    echo ""
    echo -e "${YELLOW}Selected: ${#SELECTED_COMPONENTS[@]} component(s)${NC}"
}

# Function to deploy a component
deploy_component() {
    local component=$1
    echo -e "${GREEN}Deploying $component...${NC}"
    
    # Check if the installation script exists
    if [[ -f "$(dirname "$0")/${component}_inst.sh" ]]; then
        bash "$(dirname "$0")/${component}_inst.sh"
        if [[ $? -eq 0 ]]; then
            echo -e "${GREEN}✓ $component deployed successfully${NC}"
        else
            echo -e "${RED}✗ Failed to deploy $component${NC}"
        fi
    else
        echo -e "${RED}✗ Installation script for $component not found${NC}"
    fi
    
    echo ""
}

# Function to deploy all selected components
deploy_selected() {
    if [[ ${#SELECTED_COMPONENTS[@]} -eq 0 ]]; then
        echo -e "${RED}No components selected for deployment${NC}"
        read -n 1 -s -r -p "Press any key to continue..."
        return
    fi
    
    clear
    print_banner
    echo -e "${GREEN}Deploying selected components...${NC}"
    echo ""
    
    # Deploy components sequentially
    for component in "${SELECTED_COMPONENTS[@]}"; do
        deploy_component "$component"
    done
    
    echo -e "${GREEN}Deployment completed!${NC}"
    read -n 1 -s -r -p "Press any key to continue..."
}

# Function to show component info
show_component_info() {
    clear
    print_banner
    
    echo -e "${YELLOW}Enter component number for more information (1-${#COMPONENTS[@]}) or 0 to go back:${NC}"
    echo ""
    
    for i in "${!COMPONENTS[@]}"; do
        echo "$((i+1)). ${COMPONENTS[$i]}"
    done
    
    echo ""
    read -p "Component number: " comp_num
    
    if [[ "$comp_num" =~ ^[0-9]+$ ]] && [ "$comp_num" -ge 1 ] && [ "$comp_num" -le ${#COMPONENTS[@]} ]; then
        clear
        print_banner
        print_component_description "${COMPONENTS[$((comp_num-1))]}"
        read -n 1 -s -r -p "Press any key to continue..."
    fi
}

# Initialize selected components array
declare -a SELECTED_COMPONENTS=()

# Main loop
while true; do
    display_menu
    read -n 1 -s key
    
    case $key in
        [1-9]|[1-9][0-9])
            if [ "$key" -le ${#COMPONENTS[@]} ]; then
                component=${COMPONENTS[$((key-1))]}
                if is_selected "$component"; then
                    # Remove from selected
                    for i in "${!SELECTED_COMPONENTS[@]}"; do
                        if [[ "${SELECTED_COMPONENTS[$i]}" = "$component" ]]; then
                            unset 'SELECTED_COMPONENTS[$i]'
                            SELECTED_COMPONENTS=("${SELECTED_COMPONENTS[@]}")
                            break
                        fi
                    done
                else
                    # Add to selected
                    SELECTED_COMPONENTS+=("$component")
                fi
            fi
            ;;
        a|A)
            # Select all
            SELECTED_COMPONENTS=("${COMPONENTS[@]}")
            ;;
        n|N)
            # Select none
            SELECTED_COMPONENTS=()
            ;;
        i|I)
            # Show component info
            show_component_info
            ;;
        d|D)
            # Deploy selected components
            deploy_selected
            ;;
        q|Q)
            # Quit
            clear
            echo -e "${BLUE}Thank you for using SwarmStack Deployment Tool!${NC}"
            exit 0
            ;;
    esac
done
