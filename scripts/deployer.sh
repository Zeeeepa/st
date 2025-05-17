#!/bin/bash

# SwarmStack Deployment Script
# This script allows you to select and deploy components of the SwarmStack with enhanced production features

# Source the common library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common_lib.sh"

# Script configuration
LOG_FILE="$HOME/ai-stack/logs/deployer.log"
CONFIG_FILE="$HOME/ai-stack/config/deployer.conf"
DEPLOYMENT_LOG="$HOME/ai-stack/logs/deployment_history.log"

# Define the components
declare -a COMPONENTS=(
    "temporal"
    "motia"
    "aigne-framework"
    "serv"
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

# Initialize selected components array
declare -a SELECTED_COMPONENTS=()

# Function to display usage information
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Deploy components of the SwarmStack"
    echo ""
    echo "Options:"
    echo "  -h, --help                 Display this help message"
    echo "  -c, --components COMP      Comma-separated list of components to deploy"
    echo "  -a, --all                  Deploy all components"
    echo "  -i, --interactive          Run in interactive mode (default)"
    echo "  -n, --non-interactive      Run in non-interactive mode"
    echo "  -v, --verbose              Enable verbose output"
    echo "  -q, --quiet                Suppress all output except errors"
    echo "  --save-config              Save current selection as default configuration"
    echo "  --load-config              Load saved configuration"
    echo "  --list                     List available components"
    echo "  --version                  Display version information"
    echo ""
    echo "Example:"
    echo "  $0 --components temporal,serv,motia"
}

# Function to display version information
version() {
    echo "SwarmStack Deployer v1.0.0"
    echo "Enhanced for production readiness"
}

# Function to parse command line arguments
parse_args() {
    INTERACTIVE=true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -c|--components)
                IFS=',' read -ra SELECTED_COMPONENTS <<< "$2"
                shift 2
                ;;
            -a|--all)
                SELECTED_COMPONENTS=("${COMPONENTS[@]}")
                shift
                ;;
            -i|--interactive)
                INTERACTIVE=true
                shift
                ;;
            -n|--non-interactive)
                INTERACTIVE=false
                shift
                ;;
            -v|--verbose)
                set_log_level "debug"
                shift
                ;;
            -q|--quiet)
                set_log_level "error"
                shift
                ;;
            --save-config)
                SAVE_CONFIG=true
                shift
                ;;
            --load-config)
                LOAD_CONFIG=true
                shift
                ;;
            --list)
                list_components
                exit 0
                ;;
            --version)
                version
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
}

# Function to list available components
list_components() {
    echo "Available components:"
    echo ""
    
    for component in "${COMPONENTS[@]}"; do
        echo "- $component"
    done
}

# Function to save configuration
save_config() {
    log_info "Saving configuration..."
    
    # Create config directory if it doesn't exist
    mkdir -p "$(dirname "$CONFIG_FILE")"
    
    # Save selected components to config file
    echo "# SwarmStack Deployer Configuration" > "$CONFIG_FILE"
    echo "# Generated on $(date)" >> "$CONFIG_FILE"
    echo "" >> "$CONFIG_FILE"
    echo "# Selected components" >> "$CONFIG_FILE"
    echo "SELECTED_COMPONENTS=(${SELECTED_COMPONENTS[*]})" >> "$CONFIG_FILE"
    
    log_info "Configuration saved to $CONFIG_FILE"
}

# Function to load configuration
load_config() {
    log_info "Loading configuration..."
    
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
        log_info "Configuration loaded from $CONFIG_FILE"
    else
        log_warn "Configuration file not found: $CONFIG_FILE"
    fi
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
            echo "  Visual workflow designer and orchestration hub"
            echo "  Multi-language support (TypeScript, Python, Ruby)"
            echo "  Visual node-based workflow editor"
            ;;
        "aigne-framework")
            echo -e "${CYAN}aigne-framework - MCP Flow Engine${NC}"
            echo "  Handles complex MCP flows and expanded feature execution"
            echo "  Multiple workflow patterns"
            echo "  Seamless MCP protocol integration"
            ;;
        "serv")
            echo -e "${CYAN}serv - Orchestration Layer${NC}"
            echo "  High-level orchestration with safety mechanisms"
            echo "  Checkpoint system for safe operations"
            echo "  Rollback management for error recovery"
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

# Function to display the menu
display_menu() {
    clear
    print_banner "SwarmStack Deployment Tool" 70
    
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
    echo -e "${MAGENTA}S${NC} - Save Configuration"
    echo -e "${MAGENTA}L${NC} - Load Configuration"
    echo -e "${MAGENTA}Q${NC} - Quit"
    echo ""
    echo -e "${YELLOW}Selected: ${#SELECTED_COMPONENTS[@]} component(s)${NC}"
}

# Function to show component info
show_component_info() {
    clear
    print_banner "Component Information" 70
    
    echo -e "${YELLOW}Enter component number for more information (1-${#COMPONENTS[@]}) or 0 to go back:${NC}"
    echo ""
    
    for i in "${!COMPONENTS[@]}"; do
        echo "$((i+1)). ${COMPONENTS[$i]}"
    done
    
    echo ""
    read -p "Component number: " comp_num
    
    if [[ "$comp_num" =~ ^[0-9]+$ ]] && [ "$comp_num" -ge 1 ] && [ "$comp_num" -le ${#COMPONENTS[@]} ]; then
        clear
        print_banner "Component Information" 70
        print_component_description "${COMPONENTS[$((comp_num-1))]}"
        read -n 1 -s -r -p "Press any key to continue..."
    fi
}

# Function to deploy a component
deploy_component() {
    local component=$1
    local start_time=$(date +%s)
    
    echo -e "${GREEN}Deploying $component...${NC}"
    
    # Check if the installation script exists
    if [[ -f "$SCRIPT_DIR/${component}_inst.sh" ]]; then
        # Log deployment start
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Started deployment of $component" >> "$DEPLOYMENT_LOG"
        
        # Make the script executable
        chmod +x "$SCRIPT_DIR/${component}_inst.sh"
        
        # Run the installation script
        if "$SCRIPT_DIR/${component}_inst.sh"; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            echo -e "${GREEN}✓ $component deployed successfully (${duration}s)${NC}"
            
            # Log deployment success
            echo "$(date '+%Y-%m-%d %H:%M:%S') - Successfully deployed $component (${duration}s)" >> "$DEPLOYMENT_LOG"
            return 0
        else
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            echo -e "${RED}✗ Failed to deploy $component (${duration}s)${NC}"
            
            # Log deployment failure
            echo "$(date '+%Y-%m-%d %H:%M:%S') - Failed to deploy $component (${duration}s)" >> "$DEPLOYMENT_LOG"
            
            # Ask if user wants to continue with other components
            if is_interactive && [ ${#SELECTED_COMPONENTS[@]} -gt 1 ]; then
                if ! confirm "Continue with remaining components?"; then
                    echo -e "${RED}Deployment aborted.${NC}"
                    return 2  # Special return code to indicate abort
                fi
            fi
            
            return 1
        fi
    else
        echo -e "${RED}✗ Installation script for $component not found${NC}"
        
        # Log missing script
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Installation script for $component not found" >> "$DEPLOYMENT_LOG"
        
        return 1
    fi
}

# Function to deploy all selected components
deploy_selected() {
    if [[ ${#SELECTED_COMPONENTS[@]} -eq 0 ]]; then
        echo -e "${RED}No components selected for deployment${NC}"
        if is_interactive; then
            read -n 1 -s -r -p "Press any key to continue..."
        fi
        return 1
    fi
    
    clear
    print_banner "Deploying Components" 70
    
    # Create logs directory if it doesn't exist
    mkdir -p "$(dirname "$DEPLOYMENT_LOG")"
    
    # Log deployment start
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting deployment of ${#SELECTED_COMPONENTS[@]} component(s): ${SELECTED_COMPONENTS[*]}" >> "$DEPLOYMENT_LOG"
    
    # Initialize counters
    local success_count=0
    local failure_count=0
    local total_count=${#SELECTED_COMPONENTS[@]}
    local start_time=$(date +%s)
    
    # Deploy components sequentially
    for component in "${SELECTED_COMPONENTS[@]}"; do
        deploy_component "$component"
        local result=$?
        
        if [ $result -eq 0 ]; then
            ((success_count++))
        elif [ $result -eq 2 ]; then
            # Abort requested
            break
        else
            ((failure_count++))
        fi
        
        echo ""
    done
    
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    
    # Display summary
    echo -e "${BLUE}=== Deployment Summary ===${NC}"
    echo -e "Total components: $total_count"
    echo -e "Successfully deployed: ${GREEN}$success_count${NC}"
    echo -e "Failed to deploy: ${RED}$failure_count${NC}"
    echo -e "Total duration: ${total_duration}s"
    
    # Log deployment summary
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Deployment completed: $success_count succeeded, $failure_count failed, total duration ${total_duration}s" >> "$DEPLOYMENT_LOG"
    
    if is_interactive; then
        read -n 1 -s -r -p "Press any key to continue..."
    fi
}

# Function to run in interactive mode
run_interactive() {
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
            s|S)
                # Save configuration
                save_config
                ;;
            l|L)
                # Load configuration
                load_config
                ;;
            q|Q)
                # Quit
                clear
                echo -e "${BLUE}Thank you for using SwarmStack Deployment Tool!${NC}"
                exit 0
                ;;
        esac
    done
}

# Function to run in non-interactive mode
run_non_interactive() {
    # Validate selected components
    for component in "${SELECTED_COMPONENTS[@]}"; do
        local valid=false
        for available in "${COMPONENTS[@]}"; do
            if [[ "$component" == "$available" ]]; then
                valid=true
                break
            fi
        done
        
        if [ "$valid" = false ]; then
            log_error "Invalid component: $component"
            exit 1
        fi
    done
    
    # Deploy selected components
    deploy_selected
}

# Main function
main() {
    # Create logs directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Set up logging
    set_log_file "$LOG_FILE"
    
    # Parse command line arguments
    parse_args "$@"
    
    # Load configuration if requested
    if [ "$LOAD_CONFIG" = true ]; then
        load_config
    fi
    
    # Save configuration if requested
    if [ "$SAVE_CONFIG" = true ]; then
        save_config
    fi
    
    # Run in interactive or non-interactive mode
    if [ "$INTERACTIVE" = true ]; then
        run_interactive
    else
        run_non_interactive
    fi
}

# Set default values
INTERACTIVE=true
SAVE_CONFIG=false
LOAD_CONFIG=false

# Run the main function
main "$@"

exit 0

