#!/bin/bash

# Start Cloudflare Tunnel for Event System
set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if tunnel config exists
if [ ! -f config/tunnel-config.yml ]; then
    print_error "Tunnel configuration not found. Please run ./scripts/setup-postgres-tunnel.sh first."
    exit 1
fi

# Function to start tunnel in foreground
start_foreground() {
    print_status "🚀 Starting Cloudflare Tunnel in foreground..."
    print_info "Press Ctrl+C to stop the tunnel"
    print_info "Your PostgreSQL will be accessible at: $TUNNEL_URL:5432"
    echo ""
    
    cloudflared tunnel --config config/tunnel-config.yml run
}

# Function to start tunnel as service
start_service() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        print_status "🚀 Starting Cloudflare Tunnel service (systemd)..."
        sudo systemctl start events-tunnel.service
        sudo systemctl status events-tunnel.service --no-pager
        
        print_status "✅ Tunnel service started!"
        print_info "Check status: sudo systemctl status events-tunnel.service"
        print_info "View logs: sudo journalctl -u events-tunnel.service -f"
        print_info "Stop service: sudo systemctl stop events-tunnel.service"
        
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        print_status "🚀 Starting Cloudflare Tunnel service (launchd)..."
        launchctl start com.cloudflare.events-tunnel
        
        print_status "✅ Tunnel service started!"
        print_info "Check status: launchctl list | grep events-tunnel"
        print_info "View logs: tail -f ~/Library/Logs/com.cloudflare.events-tunnel.log"
        print_info "Stop service: launchctl stop com.cloudflare.events-tunnel"
    fi
}

# Function to show status
show_status() {
    print_status "📊 Checking tunnel status..."
    
    # Check if tunnel process is running
    if pgrep -f "cloudflared.*tunnel.*run" > /dev/null; then
        print_status "✅ Tunnel process is running"
    else
        print_warning "⚠️ Tunnel process not found"
    fi
    
    # Test connection
    print_status "🧪 Testing connection..."
    ./scripts/test-connection.sh
}

# Function to stop tunnel
stop_tunnel() {
    print_status "🛑 Stopping Cloudflare Tunnel..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl stop events-tunnel.service
        print_status "✅ Tunnel service stopped"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        launchctl stop com.cloudflare.events-tunnel
        print_status "✅ Tunnel service stopped"
    fi
    
    # Kill any remaining processes
    pkill -f "cloudflared.*tunnel.*run" 2>/dev/null || true
}

# Function to show logs
show_logs() {
    print_status "📋 Showing tunnel logs..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo journalctl -u events-tunnel.service -f
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if [ -f ~/Library/Logs/com.cloudflare.events-tunnel.log ]; then
            tail -f ~/Library/Logs/com.cloudflare.events-tunnel.log
        else
            print_warning "Log file not found. Starting tunnel in foreground to see logs..."
            start_foreground
        fi
    fi
}

# Parse command line arguments
case "${1:-start}" in
    "start")
        start_foreground
        ;;
    "service")
        start_service
        ;;
    "status")
        show_status
        ;;
    "stop")
        stop_tunnel
        ;;
    "logs")
        show_logs
        ;;
    "restart")
        stop_tunnel
        sleep 2
        start_service
        ;;
    *)
        echo "Usage: $0 {start|service|status|stop|logs|restart}"
        echo ""
        echo "Commands:"
        echo "  start    - Start tunnel in foreground (default)"
        echo "  service  - Start tunnel as background service"
        echo "  status   - Check tunnel status and test connection"
        echo "  stop     - Stop tunnel service"
        echo "  logs     - Show tunnel logs"
        echo "  restart  - Restart tunnel service"
        echo ""
        echo "Examples:"
        echo "  $0 start     # Start in foreground"
        echo "  $0 service   # Start as service"
        echo "  $0 status    # Check if running"
        exit 1
        ;;
esac

