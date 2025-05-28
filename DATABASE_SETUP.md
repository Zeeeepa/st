# Database Setup Guide

This guide explains how to set up your PostgreSQL database for the Webhook Gateway application.

## Quick Fix for Authentication Issues

If you're seeing `password authentication failed for user "webhook_user"` errors, you can quickly fix this:

```bash
npm run setup:db:fix
```

This script will:
- Create the `webhook_user` with the default password
- Create the `Events` database
- Update your `.env` file with the correct credentials
- Test the connection

## Interactive Database Setup

For a more comprehensive setup or to configure custom database credentials:

```bash
npm run setup:db:interactive
```

This interactive wizard will:
- Prompt you for database host, port, name, and credentials
- Offer to generate secure passwords automatically
- Create the database and user if needed
- Test the connection
- Update your `.env` file with the new configuration

### Interactive Setup Features

1. **Load Existing Configuration**: Automatically loads current settings from `.env`
2. **Password Options**:
   - Enter password manually (hidden input)
   - Generate secure password automatically
   - Use existing password from `.env`
3. **Database Creation**: Optionally create the database and user
4. **Connection Testing**: Verify the configuration works
5. **Secure File Permissions**: Sets appropriate permissions on `.env` file

## Manual Setup

If you prefer to set up the database manually:

### 1. Create Database User

```sql
-- Connect to PostgreSQL as superuser
sudo -u postgres psql

-- Create user
CREATE USER webhook_user WITH PASSWORD 'your_secure_password';

-- Create database
CREATE DATABASE Events OWNER webhook_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE Events TO webhook_user;

-- Exit
\q
```

### 2. Update .env File

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Events
DB_USER=webhook_user
DB_PASSWORD=your_secure_password
DB_SSL=false
```

### 3. Test Connection

```bash
psql "postgresql://webhook_user:your_secure_password@localhost:5432/Events" -c "SELECT version();"
```

## Troubleshooting

### Common Issues

1. **PostgreSQL not running**
   ```bash
   # Start PostgreSQL service
   sudo systemctl start postgresql    # Linux
   brew services start postgresql     # macOS
   ```

2. **Permission denied**
   - Make sure you have PostgreSQL installed
   - Run commands with appropriate privileges (sudo on Linux)

3. **Connection refused**
   - Check if PostgreSQL is listening on the correct port
   - Verify firewall settings
   - Check `pg_hba.conf` authentication settings

4. **User already exists**
   - This is usually fine - the scripts handle existing users gracefully
   - You can drop and recreate the user if needed:
     ```sql
     DROP USER IF EXISTS webhook_user;
     ```

### Authentication Methods

The application supports various PostgreSQL authentication methods:

- **Password authentication** (default)
- **Trust authentication** (local development)
- **MD5/SCRAM authentication**

Make sure your `pg_hba.conf` file allows the chosen authentication method.

## Security Considerations

1. **Use strong passwords** - The interactive setup can generate secure passwords
2. **Limit database privileges** - The webhook_user only needs access to the Events database
3. **Secure .env file** - The scripts automatically set restrictive file permissions
4. **Network security** - Consider using SSL for production deployments

## Environment Variables

The following environment variables control database behavior:

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `Events` |
| `DB_USER` | Database username | `webhook_user` |
| `DB_PASSWORD` | Database password | `password` |
| `DB_SSL` | Enable SSL connection | `false` |
| `DB_MAX_CONNECTIONS` | Connection pool size | `20` |
| `DB_IDLE_TIMEOUT` | Idle connection timeout | `30000` |
| `DB_CONNECTION_TIMEOUT` | Connection timeout | `2000` |

## Next Steps

After setting up the database:

1. Run the application: `npm run dev`
2. The application will automatically create the required tables
3. Check the logs for any remaining issues
4. Test webhook endpoints to ensure everything works

## Getting Help

If you continue to have issues:

1. Check the application logs for detailed error messages
2. Verify PostgreSQL is running and accessible
3. Test the database connection manually using `psql`
4. Review the `TROUBLESHOOTING.md` file for additional help

