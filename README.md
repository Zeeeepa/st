# SwarmStack: AI-Powered CI/CD Framework

<div align="center">
  <img src="https://github.com/user-attachments/assets/55dbdd6c-2b08-4e5f-a841-8fea7c2a0b92" alt="SwarmStack Logo" width="200">
  <h3>Comprehensive AI-Driven Development & Deployment Platform</h3>
</div>

<div align="center">
  
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16.x+-green.svg)](https://nodejs.org/)

</div>

## 📋 Overview

SwarmStack is a comprehensive AI-powered framework for code development, analysis, and deployment. It integrates multiple specialized AI agents and tools into a cohesive system, orchestrated through visual workflows. The platform leverages the Model Context Protocol (MCP) to enable seamless communication between components, providing a powerful environment for CI/CD operations.

## 🏗️ Architecture

```
                      ┌─────────────────┐
                      │                 │
                      │  Motia (Core)   │
                      │  Visual Workflow │
                      │                 │
                      └────────┬────────┘
                               │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
┌──────────▼─────────┐ ┌──────▼───────┐ ┌────────▼────────┐
│                    │ │              │ │                 │
│ aigne-framework    │ │ serv         │ │ claude-task-    │
│ (MCP Flow Engine)  │ │ (Orchestrator)│ │ master (Tasks) │
│                    │ │              │ │                 │
└──────────┬─────────┘ └──────┬───────┘ └────────┬────────┘
           │                  │                  │
           │         ┌────────▼───────┐          │
           │         │                │          │
           │         │   anon-kode    │          │
           │         │  (Code Gen)    │          │
           │         │                │          │
           │         └────────────────┘          │
           │                                     │
┌──────────▼─────────┐                 ┌─────────▼───────┐
│                    │                 │                 │
│       eko          │                 │  agent-swarm-kit│
│ (NL Processing)    │                 │  (Agent Collab) │
│                    │                 │                 │
└────────────────────┘                 └─────────────────┘

           ┌─────────────────────────────────┐
           │        Support Tools            │
           │                                 │
           │  super-linter  putout  tsup    │
           │  pkg.pr.new    weave   biome   │
           │  CodegenSDK                     │
           └─────────────────────────────────┘
```

## 🧩 Core Components

### 1. [Motia](https://github.com/Zeeeepa/motia) - Central Interface
- **Purpose**: Visual workflow designer and orchestration hub
- **Features**:
  - Multi-language support (TypeScript, Python, Ruby)
  - Visual node-based workflow editor
  - Real-time execution visualization
  - Event-driven architecture

### 2. [aigne-framework](https://github.com/Zeeeepa/aigne-framework) - MCP Flow Engine
- **Purpose**: Handles complex MCP flows and expanded feature execution
- **Features**:
  - Functional programming approach
  - Multiple workflow patterns (sequential, concurrent, router, handoff, reflection)
  - TypeScript support with comprehensive type definitions
  - Seamless MCP protocol integration

### 3. [serv](https://github.com/Zeeeepa/serv) - Orchestration Layer
- **Purpose**: High-level orchestration with safety mechanisms
- **Features**:
  - Checkpoint system for safe operations
  - Rollback management for error recovery
  - Context window management for large codebases
  - Execution variety and tool calling

### 4. [claude-task-master](https://github.com/Zeeeepa/claude-task-master) - Task Planning
- **Purpose**: AI-powered task management via MCP
- **Features**:
  - Task breakdown and prioritization
  - Dependency tracking
  - Integration with AI assistants
  - MCP-based communication

### 5. [anon-kode](https://github.com/Zeeeepa/anon-kode) - Code Generation
- **Purpose**: Terminal-based AI coding tool
- **Features**:
  - Compatible with any OpenAI-style API
  - Code generation and transformation
  - MCP server capabilities
  - Test execution and shell command support

### 6. [eko](https://github.com/Zeeeepa/eko) - Natural Language Processing
- **Purpose**: Process natural language requests and conduct research
- **Features**:
  - Internet research capabilities
  - Multi-step workflow processing
  - Browser automation
  - Production-ready agentic workflow

### 7. [agent-swarm-kit](https://github.com/Zeeeepa/agent-swarm-kit) - Agent Collaboration
- **Purpose**: Enable collaboration between specialized AI agents
- **Features**:
  - Conversation testbed for agent interaction simulation
  - MCP-ready for seamless integration
  - Client session orchestration
  - Multi-model support (OpenAI, Grok, Claude)
  - Redis storage integration

## 🛠️ Support Tools

### Code Analysis & Transformation
- **[super-linter](https://github.com/Zeeeepa/super-linter)**: Comprehensive multi-language linting
- **[putout](https://github.com/Zeeeepa/putout)**: JavaScript/TypeScript code transformation
- **[biome](https://biomejs.dev/)**: High-performance formatter and linter
- **[CodegenSDK](https://github.com/Zeeeepa/codegen)**: Static code analysis & PR context comparison

### Build & Deployment
- **[tsup](https://github.com/Zeeeepa/tsup)**: Efficient TypeScript bundling
- **[pkg.pr.new](https://github.com/Zeeeepa/pkg.pr.new)**: Continuous preview releases

### Visualization & Monitoring
- **[weave](https://github.com/Zeeeepa/weave)**: Workflow visualization and monitoring

## 🌐 MCP Server Infrastructure

### MCP Hub vs MCP Package Manager

| Component | Purpose | Features |
|-----------|---------|----------|
| **[mcphub](https://www.npmjs.com/package/@samanhappy/mcphub)** | Central repository for MCP components | - Web-based platform with UI dashboard<br>- Aggregates multiple MCP servers<br>- Unified HTTP/SSE endpoints |
| **[mcpm.sh](https://github.com/pathintegral-institute/mcpm.sh)** | CLI package manager for MCP | - Discovering and installing MCP servers<br>- Managing configurations<br>- Cross-client compatibility |

## 🚀 Deployment Guide

### Prerequisites
- Node.js 16+
- npm or pnpm
- Docker (optional, for containerized deployment)
- Git

### Step 1: Set Up Motia Core
```bash
# Create a new Motia project
npx motia@latest create -n swarmstack
cd swarmstack

# Install dependencies
npm install
```

### Step 2: Configure MCP Servers
```bash
# Install MCP package manager
npm install -g mcpm.sh

# Set up MCP servers
mcpm install @samanhappy/mcphub
mcpm install claude-task-master
mcpm install anon-kode --mode mcp
```

### Step 3: Create Custom Nodes for Components

Create the following custom nodes in Motia:

1. **aigne-framework Connector Node**
```typescript
// src/nodes/aigne-connector.ts
import { AIAgent, AIGNE } from "@aigne/core";

export const createAigneNode = (config) => {
  // Node implementation
  // ...
};
```

2. **serv Orchestration Node**
```typescript
// src/nodes/serv-orchestrator.ts
import { createCheckpoint, rollback } from "serv";

export const createServNode = (config) => {
  // Node implementation
  // ...
};
```

3. **Task Planning Node**
```typescript
// src/nodes/task-planner.ts
import { TaskMaster } from "claude-task-master";

export const createTaskPlannerNode = (config) => {
  // Node implementation
  // ...
};
```

### Step 4: Set Up CI/CD Pipeline

Create a GitHub Actions workflow file:

```yaml
# .github/workflows/ci-cd.yml
name: SwarmStack CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run super-linter
        uses: github/super-linter@v4
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Run putout
        run: npx putout .
      
      - name: Build with tsup
        run: npx tsup
      
      - name: Create preview release
        run: npx pkg-pr-new publish
```

### Step 5: Configure Workflow in Motia

Create a workflow configuration file:

```json
// workflow.json
{
  "name": "CI/CD Pipeline",
  "nodes": [
    {
      "id": "code-checkout",
      "type": "git-checkout",
      "config": {
        "repository": "${REPO_URL}",
        "branch": "${BRANCH_NAME}"
      }
    },
    {
      "id": "code-analysis",
      "type": "super-linter",
      "config": {
        "languages": ["javascript", "typescript", "python"],
        "fix": true
      }
    },
    {
      "id": "code-transform",
      "type": "putout",
      "config": {
        "fix": true
      }
    },
    {
      "id": "build",
      "type": "tsup",
      "config": {
        "entry": ["src/index.ts"],
        "format": ["cjs", "esm"]
      }
    },
    {
      "id": "deploy",
      "type": "pkg-pr-new",
      "config": {
        "compact": true
      }
    }
  ],
  "connections": [
    { "source": "code-checkout", "target": "code-analysis" },
    { "source": "code-analysis", "target": "code-transform" },
    { "source": "code-transform", "target": "build" },
    { "source": "build", "target": "deploy" }
  ]
}
```

### Step 6: Run the System

```bash
# Start the Motia server
npm run dev

# Access the Motia Workbench
# Open http://localhost:3000 in your browser
```

## 🔄 Example Workflow

1. **Requirement Analysis**:
   - eko processes natural language requirements
   - claude-task-master breaks down requirements into tasks

2. **Code Generation**:
   - serv creates a checkpoint
   - anon-kode generates code based on requirements
   - serv validates the generated code

3. **Code Analysis**:
   - super-linter performs comprehensive code quality checks
   - putout automatically fixes code issues

4. **Build & Test**:
   - tsup bundles the TypeScript code
   - Automated tests run against the bundled code

5. **Deployment**:
   - pkg.pr.new creates a preview release
   - Stakeholders review the preview

6. **Monitoring & Feedback**:
   - weave visualizes the entire process
   - agent-swarm-kit agents collaborate to analyze results

## 📊 Advanced MCP Server Configuration

For production environments, we recommend setting up a dedicated MCP server infrastructure:

```javascript
// mcp-config.js
module.exports = {
  servers: {
    "code-generation": {
      command: "npx",
      args: ["anon-kode", "mcp", "serve"],
      env: {
        MODEL: "claude-3-opus-20240229",
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
      }
    },
    "task-management": {
      command: "npx",
      args: ["claude-task-master"],
      env: {
        MODEL: "claude-3-sonnet-20240229",
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
      }
    },
    "research": {
      command: "npx",
      args: ["eko-ai", "serve"],
      env: {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY
      }
    }
  },
  hub: {
    port: 3030,
    host: "0.0.0.0"
  }
}
```

## 🔒 Security Considerations

- Store API keys securely using environment variables or a secrets manager
- Implement proper authentication for MCP servers
- Use checkpoints and rollbacks for all code-modifying operations
- Validate all generated code before execution
- Implement rate limiting for API calls

## 📚 Documentation

For detailed documentation on each component, please refer to their respective repositories:

- [Motia Documentation](https://github.com/Zeeeepa/motia)
- [aigne-framework Documentation](https://github.com/Zeeeepa/aigne-framework)
- [serv Documentation](https://github.com/Zeeeepa/serv)
- [claude-task-master Documentation](https://github.com/Zeeeepa/claude-task-master)
- [anon-kode Documentation](https://github.com/Zeeeepa/anon-kode)
- [eko Documentation](https://github.com/Zeeeepa/eko)
- [agent-swarm-kit Documentation](https://github.com/Zeeeepa/agent-swarm-kit)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

