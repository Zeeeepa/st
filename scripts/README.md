# SwarmStack Deployment Scripts

This directory contains scripts for deploying the SwarmStack AI-Powered CI/CD Framework components.

## Overview

The deployment system consists of:

1. **Main Deployer Script**: `deployer.sh` - An interactive script that allows you to select which components to deploy
2. **Individual Installation Scripts**: One script per component (e.g., `temporal_inst.sh`, `motia_inst.sh`, etc.)

## Usage

### Running the Deployer

```bash
# Make the script executable
chmod +x deployer.sh

# Run the deployer
./deployer.sh
```

The deployer will present an interactive menu where you can:
- Select/deselect components to install
- View information about each component
- Deploy the selected components

### Running Individual Installation Scripts

Each component has its own installation script that can be run independently:

```bash
# Make the script executable
chmod +x component_name_inst.sh

# Run the installation script
./component_name_inst.sh
```

## Available Components

| Component | Description | Script |
|-----------|-------------|--------|
| Temporal | Workflow Engine | `temporal_inst.sh` |
| Motia | Central Interface | `motia_inst.sh` |
| aigne-framework | MCP Flow Engine | `aigne-framework_inst.sh` |
| serv | Orchestration Layer | `serv_inst.sh` |
| serena | Semantic Retrieval and Editing Agent | `serena_inst.sh` |
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
├── serena/
├── claude-task-master/
├── anon-kode/
├── eko/
├── agent-swarm-kit/
└── ...
```

## Customization

You can customize the installation process by:

1. Editing the individual installation scripts before running them
2. Setting environment variables before running the scripts
3. Responding to the interactive prompts during installation

## Troubleshooting

If you encounter issues during installation:

1. Check the error messages in the terminal
2. Look for log files in the component's installation directory
3. For services, check the systemd logs with `journalctl -u component-name.service`

## Requirements

- Ubuntu/Debian-based Linux distribution (or WSL2)
- Bash shell
- Internet connection
- Sufficient disk space (~10GB for all components)
- Node.js 16+ (will be installed if not present)
- Docker (for Temporal and super-linter, will be installed if not present)
