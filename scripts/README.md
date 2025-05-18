# SwarmStack Deployment Scripts

This directory contains production-ready scripts for deploying the SwarmStack AI-Powered CI/CD Framework components.

## Overview

The deployment system consists of:

1. **Main Deployer Script**: `deployer.sh` - An interactive script that allows you to select which components to deploy
2. **Common Library**: `common_lib.sh` - A shared library of functions used by all installation scripts
3. **Individual Installation Scripts**: One script per component (e.g., `temporal_inst.sh`, `motia_inst.sh`, etc.)

## Features

The enhanced deployment scripts include the following production-ready features:

- **Comprehensive Dependency Management**
  - Automatic detection and installation of required dependencies
  - Version compatibility checking
  - Graceful handling of missing dependencies

- **Robust Error Handling**
  - Detailed error messages with troubleshooting guidance
  - Automatic recovery from common failure scenarios
  - Comprehensive logging for debugging

- **Progress Indicators**
  - Visual feedback during long-running operations
  - Detailed status updates
  - Time estimates for lengthy installations

- **Configuration Validation**
  - Validation of user-provided configuration values
  - Sensible defaults for optional parameters
  - Configuration persistence between runs

- **Idempotent Execution**
  - Safe to run multiple times
  - Detects and updates existing installations
  - Preserves user customizations during updates

- **Security Best Practices**
  - Secure handling of API keys and credentials
  - Proper file permissions
  - Validation of downloaded artifacts

- **Backup and Restore**
  - Automatic backup before major changes
  - Easy restoration of previous configurations
  - Disaster recovery options

- **Monitoring and Maintenance**
  - Health check scripts
  - Log rotation and management
  - Update and upgrade paths

## Usage

### Running the Deployer

```bash
# Make the script executable
chmod +x deployer.sh

# Run the deployer interactively
./deployer.sh

# Run the deployer with specific components
./deployer.sh --components temporal,motia,serv

# Deploy all components
./deployer.sh --all

# Save your component selection for future use
./deployer.sh --save-config

# Load a previously saved configuration
./deployer.sh --load-config
```

The deployer will present an interactive menu where you can:
- Select/deselect components to install
- View information about each component
- Deploy the selected components
- Save/load your configuration

### Running Individual Installation Scripts

Each component has its own installation script that can be run independently with various options:

```bash
# Make the script executable
chmod +x component_name_inst.sh

# Run the installation script with default options
./component_name_inst.sh

# Run with custom options (example for temporal)
./temporal_inst.sh --directory /opt/temporal --port 7234 --ui-port 8081

# Get help on available options
./component_name_inst.sh --help
```

## Available Components

| Component | Description | Script |
|-----------|-------------|--------|
| Temporal | Workflow Engine | `temporal_inst.sh` |
| Motia | Central Interface | `motia_inst.sh` |
| aigne-framework | MCP Flow Engine | `aigne-framework_inst.sh` |
| serv | Orchestration Layer | `serv_inst.sh` |
| claude-task-master | Task Planning | `claude-task-master_inst.sh` |
| anon-kode | Code Generation | `anon-kode_inst.sh` |
| eko | Natural Language Processing | `eko_inst.sh` |
| agent-swarm-kit | Agent Collaboration | `agent-swarm-kit_inst.sh` |
| tsup | TypeScript Bundling | `tsup_inst.sh` |
| pkg.pr.new | Continuous Preview Releases | `pkg.pr.new_inst.sh` |
| mcphub | Central Repository for MCP Components | `mcphub_inst.sh` |
| mcpm.sh | CLI Package Manager for MCP | `mcpm.sh_inst.sh` |
| super-linter | Comprehensive Multi-language Linting | `super-linter_inst.sh` |
| putout | JavaScript/TypeScript Code Transformation | `putout_inst.sh` |
| biome | High-performance Formatter and Linter | `biome_inst.sh` |
| codegen-sdk | Static Code Analysis | `codegen-sdk_inst.sh` |

## Configuration

Each installation script creates a standard directory structure under `$HOME/ai-stack/`:

```
$HOME/ai-stack/
├── temporal/
├── motia/
├── aigne-framework/
├── serv/
├── claude-task-master/
├── anon-kode/
├── eko/
├── agent-swarm-kit/
├── ...
├── logs/           # Centralized logs
├── backups/        # Automatic backups
└── config/         # Saved configurations
```

### Common Configuration Options

Most installation scripts support the following options:

- `--directory DIR` - Custom installation directory
- `--port PORT` - Custom port for the service
- `--no-systemd` - Skip systemd service creation
- `--verbose` - Enable verbose output
- `--quiet` - Suppress all output except errors

## Customization

You can customize the installation process by:

1. Editing the individual installation scripts before running them
2. Setting environment variables before running the scripts
3. Using command-line options to override defaults
4. Responding to the interactive prompts during installation
5. Creating a configuration file for automated deployments

## Troubleshooting

If you encounter issues during installation:

1. Check the detailed logs in `$HOME/ai-stack/logs/`
2. Use the `--verbose` flag for more detailed output
3. Look for component-specific logs in the component's installation directory
4. For services, check the systemd logs with `journalctl -u component-name.service`
5. Use the provided helper scripts (e.g., `status-temporal.sh`, `logs-temporal.sh`)

## Helper Scripts

Each component installation creates several helper scripts:

- `start-component.sh` - Start the component
- `stop-component.sh` - Stop the component
- `restart-component.sh` - Restart the component
- `status-component.sh` - Check component status
- `logs-component.sh` - View component logs
- `update-component.sh` - Update the component
- `backup-component.sh` - Backup component data
- `restore-component.sh` - Restore component data

## Requirements

- Ubuntu/Debian-based Linux distribution (or WSL2)
- Bash shell 4.0+
- Internet connection
- Sufficient disk space (~10GB for all components)
- Node.js 16+ (will be installed if not present)
- Docker (for Temporal and super-linter, will be installed if not present)

## Security Notes

- API keys and credentials are stored in `.env` files with restricted permissions
- Systemd services run under non-root user accounts
- All downloaded artifacts are verified when possible
- Secure defaults are used for all components

## Updating

To update the deployment scripts:

```bash
git pull
```

To update an installed component:

```bash
cd $HOME/ai-stack/component-name
./update-component.sh
```

## Contributing

If you'd like to contribute to these deployment scripts:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

Please follow the established patterns and include appropriate error handling in any new scripts.

