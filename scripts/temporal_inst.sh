#!/bin/bash

# Temporal Installation Script
# This script installs and configures Temporal workflow engine

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Installing Temporal Workflow Engine ===${NC}"

# Create installation directory
INSTALL_DIR="$HOME/ai-stack/temporal"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR" || { echo -e "${RED}Failed to create installation directory${NC}"; exit 1; }

echo -e "${YELLOW}Creating Temporal docker-compose.yml...${NC}"

# Create docker-compose.yml file
cat > docker-compose.yml << 'EOL'
version: '3.8'
services:
  postgresql:
    image: postgres:13
    environment:
      POSTGRES_USER: temporal
      POSTGRES_PASSWORD: temporal
      POSTGRES_DB: temporal
    volumes:
      - postgresql:/var/lib/postgresql/data
    ports:
      - 5432:5432

  temporal:
    image: temporalio/auto-setup:1.20.0
    environment:
      - DB=postgresql
      - DB_PORT=5432
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal
      - POSTGRES_SEEDS=postgresql
    ports:
      - 7233:7233
    depends_on:
      - postgresql

  temporal-ui:
    image: temporalio/ui:2.10.3
    environment:
      - TEMPORAL_ADDRESS=temporal:7233
      - TEMPORAL_CORS_ORIGINS=http://localhost:3000
    ports:
      - 8080:8080
    depends_on:
      - temporal

volumes:
  postgresql:
EOL

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

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Docker Compose not found. Installing Docker Compose...${NC}"
    
    # Install Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.18.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    echo -e "${GREEN}Docker Compose installed successfully.${NC}"
fi

# Start Temporal services
echo -e "${YELLOW}Starting Temporal services...${NC}"
docker-compose up -d

# Check if services are running
if docker-compose ps | grep -q "temporal"; then
    echo -e "${GREEN}Temporal services started successfully.${NC}"
    echo -e "${GREEN}Temporal UI is available at: http://localhost:8080${NC}"
    echo -e "${GREEN}Temporal server is available at: localhost:7233${NC}"
else
    echo -e "${RED}Failed to start Temporal services. Please check the logs with 'docker-compose logs'.${NC}"
    exit 1
fi

echo -e "${GREEN}Temporal installation completed!${NC}"
exit 0

