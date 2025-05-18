#!/bin/bash

# Temporal Installation Script
# This script installs and configures Temporal workflow engine with production-ready features

# Source the common library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common_lib.sh"

# Script configuration
COMPONENT_NAME="Temporal"
COMPONENT_DESC="Workflow Engine"
INSTALL_DIR="$HOME/ai-stack/temporal"
LOG_FILE="$INSTALL_DIR/logs/install.log"
DEFAULT_PORT=7233
UI_PORT=8080
POSTGRES_PORT=5432

# Function to display usage information
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Install and configure Temporal Workflow Engine"
    echo ""
    echo "Options:"
    echo "  -h, --help                 Display this help message"
    echo "  -d, --directory DIR        Installation directory (default: $INSTALL_DIR)"
    echo "  -p, --port PORT            Temporal server port (default: $DEFAULT_PORT)"
    echo "  -u, --ui-port PORT         Temporal UI port (default: $UI_PORT)"
    echo "  --postgres-port PORT       PostgreSQL port (default: $POSTGRES_PORT)"
    echo "  --postgres-user USER       PostgreSQL username (default: temporal)"
    echo "  --postgres-password PASS   PostgreSQL password (default: generated)"
    echo "  --no-systemd               Don't create systemd service"
    echo "  -v, --verbose              Enable verbose output"
    echo "  -q, --quiet                Suppress all output except errors"
    echo ""
    echo "Example:"
    echo "  $0 --directory /opt/temporal --port 7234"
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
            -u|--ui-port)
                UI_PORT="$2"
                shift 2
                ;;
            --postgres-port)
                POSTGRES_PORT="$2"
                shift 2
                ;;
            --postgres-user)
                POSTGRES_USER="$2"
                shift 2
                ;;
            --postgres-password)
                POSTGRES_PASSWORD="$2"
                shift 2
                ;;
            --no-systemd)
                CREATE_SYSTEMD=false
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
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
}

# Function to check if ports are available
check_ports() {
    local ports_to_check=("$DEFAULT_PORT" "$UI_PORT" "$POSTGRES_PORT")
    local port_names=("Temporal server" "Temporal UI" "PostgreSQL")
    
    for i in "${!ports_to_check[@]}"; do
        local port="${ports_to_check[$i]}"
        local name="${port_names[$i]}"
        
        if port_in_use "$port"; then
            log_warn "$name port $port is already in use"
            
            if is_interactive; then
                if confirm "Would you like to use a different port?"; then
                    local new_port=$(find_available_port "$port")
                    log_info "Using port $new_port for $name instead"
                    
                    case "$i" in
                        0) DEFAULT_PORT="$new_port" ;;
                        1) UI_PORT="$new_port" ;;
                        2) POSTGRES_PORT="$new_port" ;;
                    esac
                else
                    log_warn "Continuing with port $port for $name, which may cause conflicts"
                fi
            else
                local new_port=$(find_available_port "$port")
                log_info "Using port $new_port for $name instead"
                
                case "$i" in
                    0) DEFAULT_PORT="$new_port" ;;
                    1) UI_PORT="$new_port" ;;
                    2) POSTGRES_PORT="$new_port" ;;
                esac
            fi
        fi
    done
}

# Function to create docker-compose.yml
create_docker_compose() {
    log_info "Creating docker-compose.yml..."
    start_progress "Creating configuration files"
    
    # Generate a random password if not provided
    if [ -z "$POSTGRES_PASSWORD" ]; then
        POSTGRES_PASSWORD=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9')
    fi
    
    # Set default postgres user if not provided
    POSTGRES_USER=${POSTGRES_USER:-temporal}
    
    # Create docker-compose.yml file
    cat > "$INSTALL_DIR/docker-compose.yml" << EOL
version: '3.8'
services:
  postgresql:
    image: postgres:13
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: temporal
    volumes:
      - postgresql:/var/lib/postgresql/data
      - ./postgresql-init:/docker-entrypoint-initdb.d
    ports:
      - ${POSTGRES_PORT}:5432
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5

  temporal:
    image: temporalio/auto-setup:1.20.0
    environment:
      - DB=postgresql
      - DB_PORT=5432
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PWD=${POSTGRES_PASSWORD}
      - POSTGRES_SEEDS=postgresql
    ports:
      - ${DEFAULT_PORT}:7233
    depends_on:
      postgresql:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7233/health"]
      interval: 5s
      timeout: 5s
      retries: 5

  temporal-ui:
    image: temporalio/ui:2.10.3
    environment:
      - TEMPORAL_ADDRESS=temporal:7233
      - TEMPORAL_CORS_ORIGINS=http://localhost:3000
    ports:
      - ${UI_PORT}:8080
    depends_on:
      temporal:
        condition: service_healthy

volumes:
  postgresql:
EOL

    # Create a directory for PostgreSQL initialization scripts
    mkdir -p "$INSTALL_DIR/postgresql-init"
    
    # Create a basic initialization script
    cat > "$INSTALL_DIR/postgresql-init/01-init.sql" << EOL
-- Create temporal database if it doesn't exist
CREATE DATABASE IF NOT EXISTS temporal;

-- Create visibility database if it doesn't exist
CREATE DATABASE IF NOT EXISTS temporal_visibility;

-- Set up proper permissions
GRANT ALL PRIVILEGES ON DATABASE temporal TO ${POSTGRES_USER};
GRANT ALL PRIVILEGES ON DATABASE temporal_visibility TO ${POSTGRES_USER};
EOL

    # Create .env file to store configuration
    cat > "$INSTALL_DIR/.env" << EOL
# Temporal Configuration
TEMPORAL_PORT=${DEFAULT_PORT}
TEMPORAL_UI_PORT=${UI_PORT}
POSTGRES_PORT=${POSTGRES_PORT}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
EOL

    progress_success
}

# Function to create helper scripts
create_helper_scripts() {
    log_info "Creating helper scripts..."
    start_progress "Creating helper scripts"
    
    # Create start script
    cat > "$INSTALL_DIR/start-temporal.sh" << EOL
#!/bin/bash
cd "\$(dirname "\$0")"
docker-compose up -d
echo "Temporal services started. UI available at: http://localhost:${UI_PORT}"
EOL
    chmod +x "$INSTALL_DIR/start-temporal.sh"
    
    # Create stop script
    cat > "$INSTALL_DIR/stop-temporal.sh" << EOL
#!/bin/bash
cd "\$(dirname "\$0")"
docker-compose down
echo "Temporal services stopped."
EOL
    chmod +x "$INSTALL_DIR/stop-temporal.sh"
    
    # Create restart script
    cat > "$INSTALL_DIR/restart-temporal.sh" << EOL
#!/bin/bash
cd "\$(dirname "\$0")"
docker-compose restart
echo "Temporal services restarted. UI available at: http://localhost:${UI_PORT}"
EOL
    chmod +x "$INSTALL_DIR/restart-temporal.sh"
    
    # Create status script
    cat > "$INSTALL_DIR/status-temporal.sh" << EOL
#!/bin/bash
cd "\$(dirname "\$0")"
docker-compose ps
EOL
    chmod +x "$INSTALL_DIR/status-temporal.sh"
    
    # Create logs script
    cat > "$INSTALL_DIR/logs-temporal.sh" << EOL
#!/bin/bash
cd "\$(dirname "\$0")"
docker-compose logs \$@
EOL
    chmod +x "$INSTALL_DIR/logs-temporal.sh"
    
    # Create backup script
    cat > "$INSTALL_DIR/backup-temporal.sh" << EOL
#!/bin/bash
cd "\$(dirname "\$0")"
BACKUP_DIR="\$HOME/ai-stack/backups/temporal"
BACKUP_FILE="\$BACKUP_DIR/temporal-backup-\$(date +%Y%m%d%H%M%S).sql"

# Create backup directory if it doesn't exist
mkdir -p "\$BACKUP_DIR"

# Backup PostgreSQL database
echo "Backing up Temporal database to \$BACKUP_FILE..."
docker-compose exec postgresql pg_dump -U ${POSTGRES_USER} temporal > "\$BACKUP_FILE"

if [ \$? -eq 0 ]; then
    echo "Backup completed successfully."
else
    echo "Backup failed."
    exit 1
fi
EOL
    chmod +x "$INSTALL_DIR/backup-temporal.sh"
    
    # Create restore script
    cat > "$INSTALL_DIR/restore-temporal.sh" << EOL
#!/bin/bash
cd "\$(dirname "\$0")"

if [ -z "\$1" ]; then
    echo "Usage: \$0 <backup-file>"
    echo "Available backups:"
    ls -1 "\$HOME/ai-stack/backups/temporal"
    exit 1
fi

BACKUP_FILE="\$1"

# Check if the backup file exists
if [ ! -f "\$BACKUP_FILE" ]; then
    # Try with full path
    if [ ! -f "\$HOME/ai-stack/backups/temporal/\$BACKUP_FILE" ]; then
        echo "Backup file not found: \$BACKUP_FILE"
        exit 1
    else
        BACKUP_FILE="\$HOME/ai-stack/backups/temporal/\$BACKUP_FILE"
    fi
fi

# Stop Temporal services
echo "Stopping Temporal services..."
docker-compose down

# Start PostgreSQL only
echo "Starting PostgreSQL..."
docker-compose up -d postgresql
sleep 5

# Restore database
echo "Restoring database from \$BACKUP_FILE..."
cat "\$BACKUP_FILE" | docker-compose exec -T postgresql psql -U ${POSTGRES_USER} temporal

if [ \$? -eq 0 ]; then
    echo "Restore completed successfully."
    echo "Starting Temporal services..."
    docker-compose up -d
else
    echo "Restore failed."
    exit 1
fi
EOL
    chmod +x "$INSTALL_DIR/restore-temporal.sh"
    
    progress_success
}

# Function to create systemd service
create_temporal_service() {
    if [ "$CREATE_SYSTEMD" = false ]; then
        log_info "Skipping systemd service creation as requested"
        return 0
    fi
    
    log_info "Creating systemd service..."
    start_progress "Creating systemd service"
    
    local service_file="/tmp/temporal.service"
    
    cat > "$service_file" << EOL
[Unit]
Description=Temporal Workflow Engine
After=network.target docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}
ExecStart=${INSTALL_DIR}/start-temporal.sh
ExecStop=${INSTALL_DIR}/stop-temporal.sh
StandardOutput=journal
StandardError=journal
SyslogIdentifier=temporal

[Install]
WantedBy=multi-user.target
EOL
    
    if sudo mv "$service_file" "/etc/systemd/system/temporal.service"; then
        sudo systemctl daemon-reload
        
        if sudo systemctl enable temporal.service; then
            if sudo systemctl start temporal.service; then
                progress_success
                log_info "Temporal service created and started successfully"
                return 0
            else
                progress_failure "Failed to start Temporal service"
                return 1
            fi
        else
            progress_failure "Failed to enable Temporal service"
            return 1
        fi
    else
        progress_failure "Failed to create Temporal service file"
        return 1
    fi
}

# Function to verify installation
verify_installation() {
    log_info "Verifying installation..."
    start_progress "Verifying installation"
    
    # Check if Docker containers are running
    if docker-compose -f "$INSTALL_DIR/docker-compose.yml" ps | grep -q "temporal"; then
        # Wait for services to be available
        if wait_for_service "localhost" "$UI_PORT" 30 "Temporal UI"; then
            progress_success
            return 0
        else
            progress_failure "Temporal UI is not responding"
            return 1
        fi
    else
        progress_failure "Temporal containers are not running"
        return 1
    fi
}

# Main installation function
install_temporal() {
    print_banner "$COMPONENT_NAME $COMPONENT_DESC Installation"
    
    # Check system requirements
    check_not_root
    check_sudo_privileges
    check_system_requirements 5000 2000  # 5GB disk, 2GB RAM
    check_internet_connectivity
    
    # Create installation directory
    ensure_directory_exists "$INSTALL_DIR" "Installation"
    ensure_directory_exists "$INSTALL_DIR/logs" "Logs"
    
    # Set up logging
    set_log_file "$LOG_FILE"
    
    # Check if required tools are installed
    ensure_docker
    ensure_docker_compose
    
    # Check if ports are available
    check_ports
    
    # Create configuration files
    create_docker_compose
    
    # Create helper scripts
    create_helper_scripts
    
    # Start Temporal services
    log_info "Starting Temporal services..."
    start_progress "Starting services"
    
    cd "$INSTALL_DIR" || { progress_failure "Failed to change to installation directory"; exit 1; }
    
    if docker-compose up -d; then
        progress_success
    else
        progress_failure "Failed to start Temporal services"
        log_error "Check the logs with 'docker-compose logs' for more information"
        exit 1
    fi
    
    # Create systemd service
    create_temporal_service
    
    # Verify installation
    verify_installation
    
    # Print completion message
    print_completion_message "$COMPONENT_NAME" "http://localhost:$UI_PORT"
    echo -e "${GREEN}Temporal server is available at: localhost:$DEFAULT_PORT${NC}"
    echo -e "${YELLOW}Helper scripts:${NC}"
    echo -e "  ${CYAN}$INSTALL_DIR/start-temporal.sh${NC} - Start Temporal services"
    echo -e "  ${CYAN}$INSTALL_DIR/stop-temporal.sh${NC} - Stop Temporal services"
    echo -e "  ${CYAN}$INSTALL_DIR/restart-temporal.sh${NC} - Restart Temporal services"
    echo -e "  ${CYAN}$INSTALL_DIR/status-temporal.sh${NC} - Check status of Temporal services"
    echo -e "  ${CYAN}$INSTALL_DIR/logs-temporal.sh${NC} - View Temporal logs"
    echo -e "  ${CYAN}$INSTALL_DIR/backup-temporal.sh${NC} - Backup Temporal database"
    echo -e "  ${CYAN}$INSTALL_DIR/restore-temporal.sh${NC} - Restore Temporal database"
}

# Set default values
CREATE_SYSTEMD=true

# Parse command line arguments
parse_args "$@"

# Run the installation
install_temporal

exit 0

