#!/bin/bash

# SwarmStack Common Library
# This script contains common functions used by all installation scripts

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Log levels
LOG_LEVEL_DEBUG=0
LOG_LEVEL_INFO=1
LOG_LEVEL_WARN=2
LOG_LEVEL_ERROR=3

# Default log level
CURRENT_LOG_LEVEL=$LOG_LEVEL_INFO

# Log file
LOG_FILE=""

# Progress indicator variables
PROGRESS_PID=""
PROGRESS_MESSAGE=""

# Set log level
set_log_level() {
    case "$1" in
        "debug") CURRENT_LOG_LEVEL=$LOG_LEVEL_DEBUG ;;
        "info")  CURRENT_LOG_LEVEL=$LOG_LEVEL_INFO ;;
        "warn")  CURRENT_LOG_LEVEL=$LOG_LEVEL_WARN ;;
        "error") CURRENT_LOG_LEVEL=$LOG_LEVEL_ERROR ;;
        *)       CURRENT_LOG_LEVEL=$LOG_LEVEL_INFO ;;
    esac
}

# Set log file
set_log_file() {
    LOG_FILE="$1"
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    # Create or truncate log file
    > "$LOG_FILE"
    log_info "Log file initialized: $LOG_FILE"
}

# Internal logging function
_log() {
    local level=$1
    local color=$2
    local message=$3
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    
    # Log to file if specified
    if [ -n "$LOG_FILE" ]; then
        echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    fi
    
    # Log to console if level is appropriate
    if [ $CURRENT_LOG_LEVEL -le $level ]; then
        echo -e "${color}[$timestamp] [$level] $message${NC}" >&2
    fi
}

# Debug log
log_debug() {
    _log "DEBUG" "$CYAN" "$1"
}

# Info log
log_info() {
    _log "INFO" "$GREEN" "$1"
}

# Warning log
log_warn() {
    _log "WARN" "$YELLOW" "$1"
}

# Error log
log_error() {
    _log "ERROR" "$RED" "$1"
}

# Fatal error - logs and exits
log_fatal() {
    _log "FATAL" "$RED" "$1"
    exit 1
}

# Start a progress indicator
start_progress() {
    PROGRESS_MESSAGE="$1"
    
    # Define the spinner function
    _spin() {
        local spin='⣾⣽⣻⢿⡿⣟⣯⣷'
        local charwidth=3
        
        while true; do
            for (( i=0; i<${#spin}; i+=$charwidth )); do
                local spinchar="${spin:$i:$charwidth}"
                printf "\r$PROGRESS_MESSAGE %s" "$spinchar"
                sleep 0.1
            done
        done
    }
    
    # Start the spinner in the background
    _spin &
    
    # Save the PID so we can kill it later
    PROGRESS_PID=$!
}

# Stop the progress indicator
stop_progress() {
    # Kill the spinner
    if [ -n "$PROGRESS_PID" ]; then
        kill $PROGRESS_PID >/dev/null 2>&1
        PROGRESS_PID=""
        # Clear the line
        printf "\r%-60s\r" " "
    fi
}

# Show success message after stopping progress
progress_success() {
    stop_progress
    echo -e "${GREEN}✓ $PROGRESS_MESSAGE - Completed${NC}"
}

# Show failure message after stopping progress
progress_failure() {
    stop_progress
    echo -e "${RED}✗ $PROGRESS_MESSAGE - Failed${NC}"
    if [ -n "$1" ]; then
        log_error "$1"
    fi
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if a package is installed (for apt-based systems)
package_installed() {
    dpkg -l "$1" 2>/dev/null | grep -q "^ii"
}

# Install a package if not already installed
ensure_package_installed() {
    local package=$1
    local package_name=${2:-$package}
    
    if ! package_installed "$package"; then
        log_info "Installing $package_name..."
        start_progress "Installing $package_name"
        
        sudo apt-get update -qq
        if sudo DEBIAN_FRONTEND=noninteractive apt-get install -y "$package"; then
            progress_success
            log_info "$package_name installed successfully"
            return 0
        else
            progress_failure "Failed to install $package_name"
            return 1
        fi
    else
        log_info "$package_name is already installed"
        return 0
    fi
}

# Check if a directory exists and create it if it doesn't
ensure_directory_exists() {
    local dir=$1
    local dir_name=${2:-$dir}
    
    if [ ! -d "$dir" ]; then
        log_info "Creating $dir_name directory..."
        start_progress "Creating $dir_name directory"
        
        if mkdir -p "$dir"; then
            progress_success
            log_info "$dir_name directory created successfully"
            return 0
        else
            progress_failure "Failed to create $dir_name directory"
            return 1
        fi
    else
        log_debug "$dir_name directory already exists"
        return 0
    fi
}

# Check if a file exists
file_exists() {
    [ -f "$1" ]
}

# Check if a service is running
service_running() {
    systemctl is-active --quiet "$1"
}

# Create a systemd service
create_systemd_service() {
    local service_name=$1
    local description=$2
    local working_dir=$3
    local exec_start=$4
    local user=${5:-$USER}
    local dependencies=${6:-network.target}
    
    log_info "Creating systemd service for $service_name..."
    start_progress "Creating systemd service"
    
    local service_file="/tmp/$service_name.service"
    
    cat > "$service_file" << EOL
[Unit]
Description=$description
After=$dependencies

[Service]
Type=simple
User=$user
WorkingDirectory=$working_dir
ExecStart=$exec_start
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$service_name

[Install]
WantedBy=multi-user.target
EOL
    
    if sudo mv "$service_file" "/etc/systemd/system/$service_name.service"; then
        sudo systemctl daemon-reload
        
        if sudo systemctl enable "$service_name.service"; then
            if sudo systemctl start "$service_name.service"; then
                progress_success
                log_info "$service_name service created and started successfully"
                return 0
            else
                progress_failure "Failed to start $service_name service"
                return 1
            fi
        else
            progress_failure "Failed to enable $service_name service"
            return 1
        fi
    else
        progress_failure "Failed to create $service_name service file"
        return 1
    fi
}

# Check if a port is in use
port_in_use() {
    netstat -tuln | grep -q ":$1 "
}

# Find an available port starting from the given port
find_available_port() {
    local port=$1
    while port_in_use $port; do
        log_debug "Port $port is in use, trying next port"
        port=$((port + 1))
    done
    echo $port
}

# Validate an API key format (basic check)
validate_api_key() {
    local key=$1
    local key_name=$2
    local pattern=$3
    
    if [ -z "$key" ]; then
        log_warn "$key_name is empty"
        return 1
    fi
    
    if [ -n "$pattern" ] && ! [[ $key =~ $pattern ]]; then
        log_warn "$key_name format appears to be invalid"
        return 1
    fi
    
    return 0
}

# Ask for user confirmation
confirm() {
    local message=$1
    local default=${2:-n}
    
    local prompt
    if [ "$default" = "y" ]; then
        prompt="$message [Y/n] "
    else
        prompt="$message [y/N] "
    fi
    
    read -p "$prompt" response
    response=${response:-$default}
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Ask for user input with a default value
prompt_with_default() {
    local message=$1
    local default=$2
    local variable_name=$3
    
    read -p "$message [$default]: " input
    input=${input:-$default}
    
    # Use eval to set the variable in the parent scope
    eval "$variable_name=\"$input\""
}

# Check if running as root and exit if true
check_not_root() {
    if [ "$(id -u)" -eq 0 ]; then
        log_fatal "This script should not be run as root. Please run as a regular user with sudo privileges."
    fi
}

# Check for sudo privileges without asking for password
check_sudo_privileges() {
    if sudo -n true 2>/dev/null; then
        return 0
    else
        log_warn "This script requires sudo privileges. You may be prompted for your password."
        if sudo true; then
            return 0
        else
            log_fatal "Failed to obtain sudo privileges. Please make sure you have sudo access."
        fi
    fi
}

# Check system requirements
check_system_requirements() {
    local min_disk_space=$1  # in MB
    local min_memory=$2      # in MB
    
    # Check disk space
    local available_disk=$(df -m . | awk 'NR==2 {print $4}')
    if [ "$available_disk" -lt "$min_disk_space" ]; then
        log_warn "Insufficient disk space. Required: ${min_disk_space}MB, Available: ${available_disk}MB"
        if ! confirm "Continue anyway?"; then
            log_fatal "Installation aborted due to insufficient disk space"
        fi
    fi
    
    # Check memory
    local available_memory=$(free -m | awk '/^Mem:/ {print $2}')
    if [ "$available_memory" -lt "$min_memory" ]; then
        log_warn "Insufficient memory. Required: ${min_memory}MB, Available: ${available_memory}MB"
        if ! confirm "Continue anyway?"; then
            log_fatal "Installation aborted due to insufficient memory"
        fi
    fi
}

# Install Node.js if not already installed
ensure_nodejs() {
    local version=${1:-18}
    
    if ! command_exists node; then
        log_info "Node.js not found. Installing Node.js v$version..."
        start_progress "Installing Node.js"
        
        curl -fsSL "https://deb.nodesource.com/setup_$version.x" | sudo -E bash - >/dev/null 2>&1
        if sudo apt-get install -y nodejs; then
            progress_success
            log_info "Node.js installed successfully"
            return 0
        else
            progress_failure "Failed to install Node.js"
            return 1
        fi
    else
        local current_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$current_version" -lt "$version" ]; then
            log_warn "Node.js v$current_version is installed, but v$version or higher is recommended"
            if confirm "Would you like to upgrade Node.js to v$version?"; then
                start_progress "Upgrading Node.js"
                
                curl -fsSL "https://deb.nodesource.com/setup_$version.x" | sudo -E bash - >/dev/null 2>&1
                if sudo apt-get install -y nodejs; then
                    progress_success
                    log_info "Node.js upgraded successfully"
                    return 0
                else
                    progress_failure "Failed to upgrade Node.js"
                    return 1
                fi
            fi
        else
            log_info "Node.js v$current_version is already installed"
            return 0
        fi
    fi
}

# Install Git if not already installed
ensure_git() {
    if ! command_exists git; then
        log_info "Git not found. Installing Git..."
        start_progress "Installing Git"
        
        sudo apt-get update -qq
        if sudo apt-get install -y git; then
            progress_success
            log_info "Git installed successfully"
            return 0
        else
            progress_failure "Failed to install Git"
            return 1
        fi
    else
        log_info "Git is already installed"
        return 0
    fi
}

# Install Docker if not already installed
ensure_docker() {
    if ! command_exists docker; then
        log_info "Docker not found. Installing Docker..."
        start_progress "Installing Docker"
        
        # Install dependencies
        sudo apt-get update -qq
        sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
        
        # Add Docker's official GPG key
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add - >/dev/null 2>&1
        
        # Add Docker repository
        sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" -y >/dev/null 2>&1
        
        # Install Docker
        sudo apt-get update -qq
        if sudo apt-get install -y docker-ce docker-ce-cli containerd.io; then
            # Add current user to docker group
            sudo usermod -aG docker "$USER"
            
            progress_success
            log_info "Docker installed successfully. You may need to log out and log back in for group changes to take effect."
            return 0
        else
            progress_failure "Failed to install Docker"
            return 1
        fi
    else
        log_info "Docker is already installed"
        return 0
    fi
}

# Install Docker Compose if not already installed
ensure_docker_compose() {
    if ! command_exists docker-compose; then
        log_info "Docker Compose not found. Installing Docker Compose..."
        start_progress "Installing Docker Compose"
        
        sudo curl -L "https://github.com/docker/compose/releases/download/v2.18.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose >/dev/null 2>&1
        sudo chmod +x /usr/local/bin/docker-compose
        
        if command_exists docker-compose; then
            progress_success
            log_info "Docker Compose installed successfully"
            return 0
        else
            progress_failure "Failed to install Docker Compose"
            return 1
        fi
    else
        log_info "Docker Compose is already installed"
        return 0
    fi
}

# Clone or update a Git repository
clone_or_update_repo() {
    local repo_url=$1
    local target_dir=$2
    local branch=${3:-main}
    
    if [ -d "$target_dir/.git" ]; then
        log_info "Repository already exists. Updating..."
        start_progress "Updating repository"
        
        cd "$target_dir" || return 1
        
        # Stash any local changes
        git stash >/dev/null 2>&1
        
        # Fetch the latest changes
        if git fetch origin "$branch" >/dev/null 2>&1; then
            # Reset to the latest commit on the branch
            if git reset --hard "origin/$branch" >/dev/null 2>&1; then
                progress_success
                log_info "Repository updated successfully"
                return 0
            else
                progress_failure "Failed to reset to latest commit"
                return 1
            fi
        else
            progress_failure "Failed to fetch latest changes"
            return 1
        fi
    else
        log_info "Cloning repository..."
        start_progress "Cloning repository"
        
        if git clone --branch "$branch" "$repo_url" "$target_dir" >/dev/null 2>&1; then
            progress_success
            log_info "Repository cloned successfully"
            return 0
        else
            progress_failure "Failed to clone repository"
            return 1
        fi
    fi
}

# Run npm install with error handling
npm_install() {
    local dir=${1:-.}
    
    log_info "Installing npm dependencies..."
    start_progress "Installing dependencies"
    
    cd "$dir" || return 1
    
    if npm install; then
        progress_success
        log_info "Dependencies installed successfully"
        return 0
    else
        progress_failure "Failed to install dependencies"
        return 1
    fi
}

# Run npm build with error handling
npm_build() {
    local dir=${1:-.}
    local script=${2:-build}
    
    log_info "Building project..."
    start_progress "Building project"
    
    cd "$dir" || return 1
    
    if npm run "$script"; then
        progress_success
        log_info "Project built successfully"
        return 0
    else
        progress_failure "Failed to build project"
        return 1
    fi
}

# Create a startup script
create_startup_script() {
    local script_path=$1
    local command=$2
    local working_dir=${3:-$(dirname "$script_path")}
    
    log_info "Creating startup script..."
    start_progress "Creating startup script"
    
    cat > "$script_path" << EOL
#!/bin/bash
cd "$working_dir"
$command
EOL
    
    chmod +x "$script_path"
    
    progress_success
    log_info "Startup script created at $script_path"
}

# Create .env file
create_env_file() {
    local env_file=$1
    local content=$2
    
    log_info "Creating .env file..."
    start_progress "Creating .env file"
    
    echo "$content" > "$env_file"
    
    progress_success
    log_info ".env file created at $env_file"
}

# Check if a process is running on a specific port
check_port_process() {
    local port=$1
    lsof -i ":$port" -sTCP:LISTEN >/dev/null 2>&1
}

# Wait for a service to be available on a port
wait_for_service() {
    local host=$1
    local port=$2
    local timeout=${3:-30}
    local service_name=${4:-service}
    
    log_info "Waiting for $service_name to be available at $host:$port..."
    start_progress "Waiting for $service_name"
    
    local start_time=$(date +%s)
    local end_time=$((start_time + timeout))
    
    while [ $(date +%s) -lt $end_time ]; do
        if nc -z "$host" "$port" >/dev/null 2>&1; then
            progress_success
            log_info "$service_name is available at $host:$port"
            return 0
        fi
        sleep 1
    done
    
    progress_failure "$service_name did not become available within $timeout seconds"
    return 1
}

# Print a section header
print_section_header() {
    local title=$1
    echo -e "${BLUE}=== $title ===${NC}"
}

# Print a banner
print_banner() {
    local title=$1
    local width=${2:-70}
    
    local padding=$(( (width - ${#title} - 2) / 2 ))
    local left_padding=$padding
    local right_padding=$padding
    
    # Adjust padding if title length is odd
    if [ $(( (width - ${#title} - 2) % 2 )) -eq 1 ]; then
        right_padding=$((right_padding + 1))
    fi
    
    local border=$(printf '%*s' $width | tr ' ' '=')
    local spaces_left=$(printf '%*s' $left_padding)
    local spaces_right=$(printf '%*s' $right_padding)
    
    echo -e "${BLUE}"
    echo "$border"
    echo "| $spaces_left$title$spaces_right |"
    echo "$border"
    echo -e "${NC}"
}

# Print a completion message
print_completion_message() {
    local component=$1
    local url=${2:-}
    
    echo -e "${GREEN}$component installation completed successfully!${NC}"
    
    if [ -n "$url" ]; then
        echo -e "${GREEN}$component is available at: $url${NC}"
    fi
}

# Check internet connectivity
check_internet_connectivity() {
    log_info "Checking internet connectivity..."
    start_progress "Checking internet connectivity"
    
    if ping -c 1 google.com >/dev/null 2>&1 || ping -c 1 github.com >/dev/null 2>&1; then
        progress_success
        log_info "Internet connectivity confirmed"
        return 0
    else
        progress_failure "No internet connectivity detected"
        log_error "This installation requires internet connectivity. Please check your connection and try again."
        return 1
    fi
}

# Backup a file before modifying it
backup_file() {
    local file=$1
    local backup_file="$file.bak.$(date +%Y%m%d%H%M%S)"
    
    if [ -f "$file" ]; then
        log_info "Backing up $file to $backup_file..."
        start_progress "Backing up file"
        
        if cp "$file" "$backup_file"; then
            progress_success
            log_info "File backed up successfully"
            return 0
        else
            progress_failure "Failed to backup file"
            return 1
        fi
    else
        log_debug "File $file does not exist, no backup needed"
        return 0
    fi
}

# Restore a file from backup
restore_file() {
    local file=$1
    local backup_file=$2
    
    if [ -f "$backup_file" ]; then
        log_info "Restoring $file from $backup_file..."
        start_progress "Restoring file"
        
        if cp "$backup_file" "$file"; then
            progress_success
            log_info "File restored successfully"
            return 0
        else
            progress_failure "Failed to restore file"
            return 1
        fi
    else
        log_error "Backup file $backup_file does not exist"
        return 1
    fi
}

# Check if the script is being run in an interactive terminal
is_interactive() {
    [ -t 0 ]
}

# Get the absolute path of a file or directory
get_absolute_path() {
    local path=$1
    echo "$(cd "$(dirname "$path")" && pwd)/$(basename "$path")"
}

# Check if a variable is set
is_var_set() {
    [ -n "${!1}" ]
}

# Export all functions
export -f set_log_level
export -f set_log_file
export -f log_debug
export -f log_info
export -f log_warn
export -f log_error
export -f log_fatal
export -f start_progress
export -f stop_progress
export -f progress_success
export -f progress_failure
export -f command_exists
export -f package_installed
export -f ensure_package_installed
export -f ensure_directory_exists
export -f file_exists
export -f service_running
export -f create_systemd_service
export -f port_in_use
export -f find_available_port
export -f validate_api_key
export -f confirm
export -f prompt_with_default
export -f check_not_root
export -f check_sudo_privileges
export -f check_system_requirements
export -f ensure_nodejs
export -f ensure_git
export -f ensure_docker
export -f ensure_docker_compose
export -f clone_or_update_repo
export -f npm_install
export -f npm_build
export -f create_startup_script
export -f create_env_file
export -f check_port_process
export -f wait_for_service
export -f print_section_header
export -f print_banner
export -f print_completion_message
export -f check_internet_connectivity
export -f backup_file
export -f restore_file
export -f is_interactive
export -f get_absolute_path
export -f is_var_set

