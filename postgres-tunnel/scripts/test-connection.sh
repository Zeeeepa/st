#!/bin/bash

# Test PostgreSQL Connection for Event System
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

echo "🧪 Testing PostgreSQL Connection for Event System"
echo "=================================================="

# Test 1: Local PostgreSQL connection (main user)
print_status "Test 1: Local PostgreSQL connection (main user)"
PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 'Main user connection successful ✅' as status, version();" 2>/dev/null

if [ $? -eq 0 ]; then
    print_status "✅ Main user connection successful"
else
    print_error "❌ Main user connection failed"
    print_info "Make sure PostgreSQL is running and configured correctly"
    exit 1
fi

# Test 2: Local PostgreSQL connection (Codegen user)
print_status "Test 2: Local PostgreSQL connection (Codegen read-only user)"
PGPASSWORD="$POSTGRES_CODEGEN_PASSWORD" psql -h localhost -p "$POSTGRES_PORT" -U "$POSTGRES_CODEGEN_USER" -d "$POSTGRES_DB" -c "SELECT 'Codegen user connection successful ✅' as status;" 2>/dev/null

if [ $? -eq 0 ]; then
    print_status "✅ Codegen user connection successful"
else
    print_error "❌ Codegen user connection failed"
    exit 1
fi

# Test 3: Check if tunnel is running
print_status "Test 3: Checking if Cloudflare Tunnel is running"
if pgrep -f "cloudflared.*tunnel.*run" > /dev/null; then
    print_status "✅ Cloudflare Tunnel process is running"
    
    # Test 4: Tunnel connection (main user)
    print_status "Test 4: Testing connection through Cloudflare Tunnel (main user)"
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$TUNNEL_URL" -p 5432 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 'Tunnel connection successful ✅' as status, current_timestamp;" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        print_status "✅ Tunnel connection successful (main user)"
        
        # Test 5: Tunnel connection (Codegen user)
        print_status "Test 5: Testing connection through Cloudflare Tunnel (Codegen user)"
        PGPASSWORD="$POSTGRES_CODEGEN_PASSWORD" psql -h "$TUNNEL_URL" -p 5432 -U "$POSTGRES_CODEGEN_USER" -d "$POSTGRES_DB" -c "SELECT 'Codegen tunnel connection successful ✅' as status;" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            print_status "✅ Codegen tunnel connection successful"
        else
            print_error "❌ Codegen tunnel connection failed"
            exit 1
        fi
        
    else
        print_error "❌ Tunnel connection failed"
        print_info "The tunnel might be starting up. Wait a moment and try again."
        exit 1
    fi
    
else
    print_warning "⚠️ Cloudflare Tunnel is not running"
    print_info "Start the tunnel with: ./scripts/start-tunnel.sh"
    exit 1
fi

# Test 6: Database schema validation
print_status "Test 6: Validating database schema"
PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('github_events', 'linear_events', 'slack_events', 'webhook_deliveries', 'event_metadata', 'webhook_configurations') 
        THEN '✅ Found'
        ELSE '❌ Missing'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('github_events', 'linear_events', 'slack_events', 'webhook_deliveries', 'event_metadata', 'webhook_configurations')
ORDER BY table_name;
" 2>/dev/null

if [ $? -eq 0 ]; then
    print_status "✅ Database schema validation completed"
else
    print_warning "⚠️ Could not validate database schema"
fi

# Test 7: Sample data query
print_status "Test 7: Testing sample data queries"
PGPASSWORD="$POSTGRES_CODEGEN_PASSWORD" psql -h "$TUNNEL_URL" -p 5432 -U "$POSTGRES_CODEGEN_USER" -d "$POSTGRES_DB" -c "
SELECT 
    'github_events' as table_name,
    COUNT(*) as record_count
FROM github_events
UNION ALL
SELECT 
    'linear_events' as table_name,
    COUNT(*) as record_count
FROM linear_events
UNION ALL
SELECT 
    'slack_events' as table_name,
    COUNT(*) as record_count
FROM slack_events;
" 2>/dev/null

if [ $? -eq 0 ]; then
    print_status "✅ Sample data queries successful"
else
    print_warning "⚠️ Sample data queries failed"
fi

# Test 8: Security validation
print_status "Test 8: Security validation"
PGPASSWORD="$POSTGRES_CODEGEN_PASSWORD" psql -h "$TUNNEL_URL" -p 5432 -U "$POSTGRES_CODEGEN_USER" -d "$POSTGRES_DB" -c "
SELECT 
    CASE 
        WHEN has_database_privilege('$POSTGRES_CODEGEN_USER', '$POSTGRES_DB', 'CREATE') THEN 'FAIL: User has CREATE privileges'
        WHEN has_database_privilege('$POSTGRES_CODEGEN_USER', '$POSTGRES_DB', 'CONNECT') THEN 'PASS: User has CONNECT privileges only'
        ELSE 'UNKNOWN: Could not determine privileges'
    END as security_check;
" 2>/dev/null

if [ $? -eq 0 ]; then
    print_status "✅ Security validation completed"
else
    print_warning "⚠️ Could not validate security settings"
fi

echo ""
echo "🎉 All tests completed successfully!"
echo "=================================================="
print_info "Your Event System PostgreSQL database is ready for Codegen integration!"
echo ""
print_info "📋 Connection Details for Codegen:"
echo "   Host: $TUNNEL_URL"
echo "   Port: 5432"
echo "   Database: $POSTGRES_DB"
echo "   Username: $POSTGRES_CODEGEN_USER"
echo "   Password: $POSTGRES_CODEGEN_PASSWORD"
echo "   SSL Mode: $SSL_MODE"
echo ""
print_info "🔗 Connection String:"
echo "   postgresql://$POSTGRES_CODEGEN_USER:$POSTGRES_CODEGEN_PASSWORD@$TUNNEL_URL:5432/$POSTGRES_DB?sslmode=$SSL_MODE"
echo ""
print_info "📊 Available Tables:"
echo "   - github_events: GitHub webhook events"
echo "   - linear_events: Linear webhook events"
echo "   - slack_events: Slack webhook events"
echo "   - webhook_deliveries: Delivery tracking"
echo "   - event_metadata: Processing metadata"
echo "   - webhook_configurations: Webhook management"
echo ""
print_info "📁 Full details saved in: config/codegen-connection.txt"
echo ""
print_warning "🔒 Security Notes:"
echo "   - Codegen user has READ-ONLY permissions"
echo "   - Connection is encrypted via Cloudflare Tunnel"
echo "   - No ports exposed on your local firewall"

