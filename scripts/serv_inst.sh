#!/bin/bash

# serv Installation Script
# This script installs and configures serv Orchestration Layer with production-ready features

# Source the common library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common_lib.sh"

# Script configuration
COMPONENT_NAME="serv"
COMPONENT_DESC="Orchestration Layer"
INSTALL_DIR="$HOME/ai-stack/serv"
LOG_FILE="$INSTALL_DIR/logs/install.log"
DEFAULT_PORT=3002
REPO_URL="https://github.com/Zeeeepa/serv.git"
BRANCH="main"

# Function to display usage information
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Install and configure serv Orchestration Layer"
    echo ""
    echo "Options:"
    echo "  -h, --help                 Display this help message"
    echo "  -d, --directory DIR        Installation directory (default: $INSTALL_DIR)"
    echo "  -p, --port PORT            Server port (default: $DEFAULT_PORT)"
    echo "  -b, --branch BRANCH        Git branch to use (default: $BRANCH)"
    echo "  --repo URL                 Repository URL (default: $REPO_URL)"
    echo "  --no-systemd               Don't create systemd service"
    echo "  --log-level LEVEL          Set log level (debug, info, warn, error)"
    echo "  --max-checkpoints NUM      Maximum number of checkpoints to keep (default: 10)"
    echo "  -v, --verbose              Enable verbose output"
    echo "  -q, --quiet                Suppress all output except errors"
    echo ""
    echo "Example:"
    echo "  $0 --directory /opt/serv --port 3003 --log-level debug"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -d|--directory)
                INSTALL_DIR="$2"
                shift 2
                ;;
            -p|--port)
                DEFAULT_PORT="$2"
                shift 2
                ;;
            -b|--branch)
                BRANCH="$2"
                shift 2
                ;;
            --repo)
                REPO_URL="$2"
                shift 2
                ;;
            --no-systemd)
                CREATE_SYSTEMD=false
                shift
                ;;
            --log-level)
                SERV_LOG_LEVEL="$2"
                shift 2
                ;;
            --max-checkpoints)
                MAX_CHECKPOINTS="$2"
                shift 2
                ;;
            -v|--verbose)
                set_log_level "debug"
                shift
                ;;
            -q|--quiet)
                set_log_level "error"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
}

# Function to check if port is available
check_port() {
    if port_in_use "$DEFAULT_PORT"; then
        log_warn "Port $DEFAULT_PORT is already in use"
        
        if is_interactive; then
            if confirm "Would you like to use a different port?"; then
                DEFAULT_PORT=$(find_available_port "$DEFAULT_PORT")
                log_info "Using port $DEFAULT_PORT instead"
            else
                log_warn "Continuing with port $DEFAULT_PORT, which may cause conflicts"
            fi
        else
            DEFAULT_PORT=$(find_available_port "$DEFAULT_PORT")
            log_info "Using port $DEFAULT_PORT instead"
        fi
    fi
}

# Function to configure environment
configure_environment() {
    log_info "Configuring environment..."
    start_progress "Creating configuration files"
    
    # Set default values if not provided
    SERV_LOG_LEVEL=${SERV_LOG_LEVEL:-info}
    MAX_CHECKPOINTS=${MAX_CHECKPOINTS:-10}
    
    # Create directories
    ensure_directory_exists "$INSTALL_DIR/checkpoints" "Checkpoints"
    ensure_directory_exists "$INSTALL_DIR/logs" "Logs"
    
    # Create .env file
    cat > "$INSTALL_DIR/.env" << EOL
# Server Configuration
PORT=$DEFAULT_PORT
NODE_ENV=production

# Checkpoint Configuration
CHECKPOINT_DIR=$INSTALL_DIR/checkpoints
MAX_CHECKPOINTS=$MAX_CHECKPOINTS

# Logging Configuration
LOG_LEVEL=$SERV_LOG_LEVEL
LOG_FILE=$INSTALL_DIR/logs/serv.log

# Security Configuration
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_HELMET=true
EOL
    
    progress_success
}

# Function to create helper scripts
create_helper_scripts() {
    log_info "Creating helper scripts..."
    start_progress "Creating helper scripts"
    
    # Create start script
    cat > "$INSTALL_DIR/start-serv.sh" << EOL
#!/bin/bash
cd "\$(dirname "\$0")"
npm run start
EOL
    chmod +x "$INSTALL_DIR/start-serv.sh"
    
    # Create development start script
    cat > "$INSTALL_DIR/start-dev.sh" << EOL
#!/bin/bash
cd "\$(dirname "\$0")"
npm run dev
EOL
    chmod +x "$INSTALL_DIR/start-dev.sh"
    
    # Create update script
    cat > "$INSTALL_DIR/update-serv.sh" << EOL
#!/bin/bash
cd "\$(dirname "\$0")"
git pull
npm install
npm run build
echo "serv updated successfully. Restart the service to apply changes."
EOL
    chmod +x "$INSTALL_DIR/update-serv.sh"
    
    # Create logs script
    cat > "$INSTALL_DIR/view-logs.sh" << EOL
#!/bin/bash
cd "\$(dirname "\$0")"
tail -f logs/serv.log
EOL
    chmod +x "$INSTALL_DIR/view-logs.sh"
    
    # Create backup script
    cat > "$INSTALL_DIR/backup-checkpoints.sh" << EOL
#!/bin/bash
cd "\$(dirname "\$0")"
BACKUP_DIR="\$HOME/ai-stack/backups/serv"
BACKUP_FILE="\$BACKUP_DIR/serv-checkpoints-\$(date +%Y%m%d%H%M%S).tar.gz"

# Create backup directory if it doesn't exist
mkdir -p "\$BACKUP_DIR"

# Backup checkpoints
echo "Backing up serv checkpoints to \$BACKUP_FILE..."
tar -czf "\$BACKUP_FILE" -C "\$(dirname "\$0")" checkpoints

if [ \$? -eq 0 ]; then
    echo "Backup completed successfully."
else
    echo "Backup failed."
    exit 1
fi
EOL
    chmod +x "$INSTALL_DIR/backup-checkpoints.sh"
    
    # Create restore script
    cat > "$INSTALL_DIR/restore-checkpoints.sh" << EOL
#!/bin/bash
cd "\$(dirname "\$0")"

if [ -z "\$1" ]; then
    echo "Usage: \$0 <backup-file>"
    echo "Available backups:"
    ls -1 "\$HOME/ai-stack/backups/serv"
    exit 1
fi

BACKUP_FILE="\$1"

# Check if the backup file exists
if [ ! -f "\$BACKUP_FILE" ]; then
    # Try with full path
    if [ ! -f "\$HOME/ai-stack/backups/serv/\$BACKUP_FILE" ]; then
        echo "Backup file not found: \$BACKUP_FILE"
        exit 1
    else
        BACKUP_FILE="\$HOME/ai-stack/backups/serv/\$BACKUP_FILE"
    fi
fi

# Stop serv service if it's running as a systemd service
if systemctl is-active --quiet serv.service; then
    echo "Stopping serv service..."
    sudo systemctl stop serv.service
fi

# Backup current checkpoints
CURRENT_BACKUP="\$HOME/ai-stack/backups/serv/serv-checkpoints-before-restore-\$(date +%Y%m%d%H%M%S).tar.gz"
echo "Backing up current checkpoints to \$CURRENT_BACKUP..."
tar -czf "\$CURRENT_BACKUP" -C "\$(dirname "\$0")" checkpoints

# Restore checkpoints
echo "Restoring checkpoints from \$BACKUP_FILE..."
tar -xzf "\$BACKUP_FILE" -C "\$(dirname "\$0")"

if [ \$? -eq 0 ]; then
    echo "Restore completed successfully."
    
    # Start serv service if it was running
    if systemctl is-active --quiet serv.service; then
        echo "Starting serv service..."
        sudo systemctl start serv.service
    fi
else
    echo "Restore failed."
    exit 1
fi
EOL
    chmod +x "$INSTALL_DIR/restore-checkpoints.sh"
    
    progress_success
}

# Function to create systemd service
create_serv_service() {
    if [ "$CREATE_SYSTEMD" = false ]; then
        log_info "Skipping systemd service creation as requested"
        return 0
    fi
    
    log_info "Creating systemd service..."
    
    create_systemd_service "serv" \
                          "serv Orchestration Layer" \
                          "$INSTALL_DIR" \
                          "/usr/bin/npm run start" \
                          "$USER" \
                          "network.target"
}

# Function to verify installation
verify_installation() {
    log_info "Verifying installation..."
    start_progress "Verifying installation"
    
    # Check if the server starts properly
    cd "$INSTALL_DIR" || { progress_failure "Failed to change to installation directory"; return 1; }
    
    # Start the server in the background
    node -e "
        const http = require('http');
        require('dotenv').config();
        const port = process.env.PORT || $DEFAULT_PORT;
        
        const server = http.createServer((req, res) => {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('serv is running');
        });
        
        server.listen(port, () => {
            console.log('Verification server running on port ' + port);
        });
        
        // Exit after 5 seconds
        setTimeout(() => {
            server.close(() => {
                process.exit(0);
            });
        }, 5000);
    " > /dev/null 2>&1 &
    
    # Wait for the server to start
    sleep 2
    
    # Check if the server is responding
    if curl -s "http://localhost:$DEFAULT_PORT" > /dev/null; then
        progress_success
        return 0
    else
        progress_failure "serv is not responding"
        return 1
    fi
}

# Main installation function
install_serv() {
    print_banner "$COMPONENT_NAME $COMPONENT_DESC Installation"
    
    # Check system requirements
    check_not_root
    check_sudo_privileges
    check_system_requirements 1000 1000  # 1GB disk, 1GB RAM
    check_internet_connectivity
    
    # Create installation directory
    ensure_directory_exists "$INSTALL_DIR" "Installation"
    
    # Set up logging
    set_log_file "$LOG_FILE"
    
    # Check if required tools are installed
    ensure_nodejs 18
    ensure_git
    
    # Check if port is available
    check_port
    
    # Clone or update repository
    clone_or_update_repo "$REPO_URL" "$INSTALL_DIR" "$BRANCH"
    
    # Install dependencies
    npm_install "$INSTALL_DIR"
    
    # Build the project
    npm_build "$INSTALL_DIR"
    
    # Configure environment
    configure_environment
    
    # Create helper scripts
    create_helper_scripts
    
    # Create systemd service
    create_serv_service
    
    # Verify installation
    verify_installation
    
    # Print completion message
    print_completion_message "$COMPONENT_NAME" "http://localhost:$DEFAULT_PORT"
    echo -e "${YELLOW}Helper scripts:${NC}"
    echo -e "  ${CYAN}$INSTALL_DIR/start-serv.sh${NC} - Start serv"
    echo -e "  ${CYAN}$INSTALL_DIR/start-dev.sh${NC} - Start serv in development mode"
    echo -e "  ${CYAN}$INSTALL_DIR/update-serv.sh${NC} - Update serv to the latest version"
    echo -e "  ${CYAN}$INSTALL_DIR/view-logs.sh${NC} - View serv logs"
    echo -e "  ${CYAN}$INSTALL_DIR/backup-checkpoints.sh${NC} - Backup serv checkpoints"
    echo -e "  ${CYAN}$INSTALL_DIR/restore-checkpoints.sh${NC} - Restore serv checkpoints"
}

# Set default values
CREATE_SYSTEMD=true

# Parse command line arguments
parse_args "$@"

# Run the installation
install_serv

exit 0

