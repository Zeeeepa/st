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

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Core Components](#-core-components)
- [Support Tools](#-support-tools)
- [MCP Server Infrastructure](#-mcp-server-infrastructure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Example Workflows](#-example-workflows)
- [Advanced Configuration](#-advanced-configuration)
- [Security Considerations](#-security-considerations)
- [Monitoring & Observability](#-monitoring--observability)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

## 📝 Overview

SwarmStack is a comprehensive AI-powered framework for code development, analysis, and deployment. It integrates multiple specialized AI agents and tools into a cohesive system, orchestrated through visual workflows. The platform leverages the Model Context Protocol (MCP) to enable seamless communication between components, providing a powerful environment for CI/CD operations.

## 🌟 Key Features

- **Visual Workflow Design**: Create and manage complex development workflows through an intuitive visual interface
- **AI-Powered Code Generation**: Automatically generate code based on natural language requirements
- **Intelligent Task Management**: Break down complex projects into manageable tasks with AI assistance
- **Comprehensive Code Analysis**: Identify and fix code issues with integrated linting and transformation tools
- **Seamless Deployment**: Streamline the deployment process with automated builds and preview releases
- **Advanced Monitoring**: Track performance and errors with integrated observability tools
- **MCP Integration**: Leverage the Model Context Protocol for seamless communication between AI components
- **Extensible Architecture**: Easily integrate new tools and components into your workflow

## 🏗️ Architecture

```
                      ┌───────────────┐
                      │               │
                      │  Motia (Core) │
                      │  Visual Workflow │
                      │               │
                      └───────────┬───┘
                               │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
┌──────────▼──────────┐ ┌─────▼────────┐ ┌───────▼──────────┐
│                    │ │              │ │                 │
│ aigne-framework    │ │ serv         │ ￿￿ claude-task-    │
│ (MCP Flow Engine)  │ │ (Orchestrator)│ │ master (Tasks) │
│                    │ │              │ │                 │
└──────────┬─────────┘ └──────┬───────┘ └────────┬────────┘
           │                  │                  │
           │         ┌────────▼────────┐          │
           │         │                │          │
           │         │   anon-kode    │          │
           │         │  (Code Gen)    │          │
           │         │                │          │
           │         └────────────────┘          │
           │                                     │
┌──────────▼──────────┐                 ┌────────▼─────────┐
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
           │  CodegenSDK  AutoHeal  PostHog │
           │  Sentry      Langfuse          │
           └─────────────────────────────────┘
```

## 🧩 Core Components

Each component in SwarmStack serves a specific purpose in the AI-powered development pipeline:

### 1. [Motia](https://github.com/Zeeeepa/motia) - Central Interface

The heart of SwarmStack, providing a visual workflow designer and orchestration hub.

**Key Features:**
- Multi-language support (TypeScript, Python, Ruby)
- Visual node-based workflow editor
- Real-time execution visualization
- Event-driven architecture

### 2. [aigne-framework](https://github.com/Zeeeepa/aigne-framework) - MCP Flow Engine

Handles complex MCP flows and expanded feature execution with a functional programming approach.

**Key Features:**
- Multiple workflow patterns (sequential, concurrent, router, handoff, reflection)
- TypeScript support with comprehensive type definitions
- Seamless MCP protocol integration
- Functional programming paradigm

### 3. [serv](https://github.com/Zeeeepa/serv) - Orchestration Layer

Provides high-level orchestration with robust safety mechanisms for reliable operation.

**Key Features:**
- Checkpoint system for safe operations
- Rollback management for error recovery
- Context window management for large codebases
- Execution variety and tool calling

### 4. [claude-task-master](https://github.com/Zeeeepa/claude-task-master) - Task Planning

AI-powered task management system that integrates with the MCP ecosystem.

**Key Features:**
- Task breakdown and prioritization
- Dependency tracking
- Integration with AI assistants
- MCP-based communication

### 5. [anon-kode](https://github.com/Zeeeepa/anon-kode) - Code Generation

Terminal-based AI coding tool compatible with any OpenAI-style API.

**Key Features:**
- Code generation and transformation
- MCP server capabilities
- Test execution and shell command support
- Multi-model compatibility

### 6. [eko](https://github.com/Zeeeepa/eko) - Natural Language Processing

Processes natural language requests and conducts research to inform development.

**Key Features:**
- Internet research capabilities
- Multi-step workflow processing
- Browser automation
- Production-ready agentic workflow

### 7. [agent-swarm-kit](https://github.com/Zeeeepa/agent-swarm-kit) - Agent Collaboration

Enables collaboration between specialized AI agents for complex problem-solving.

**Key Features:**
- Conversation testbed for agent interaction simulation
- MCP-ready for seamless integration
- Client session orchestration
- Multi-model support (OpenAI, Grok, Claude)
- Redis storage integration

## 🛠️ Support Tools

SwarmStack integrates a variety of tools to enhance the development process:

### Code Analysis & Transformation

- **[super-linter](https://github.com/Zeeeepa/super-linter)**: Comprehensive multi-language linting
- **[putout](https://github.com/Zeeeepa/putout)**: JavaScript/TypeScript code transformation
- **[biome](https://biomejs.dev/)**: High-performance formatter and linter
- **[CodegenSDK](https://github.com/Zeeeepa/codegen)**: Static code analysis & PR context comparison
- **[AutoHeal](https://github.com/dion-/autoheal/tree/master)**: Automated code repair and optimization

### Build & Deployment

- **[tsup](https://github.com/Zeeeepa/tsup)**: Efficient TypeScript bundling
- **[pkg.pr.new](https://github.com/Zeeeepa/pkg.pr.new)**: Continuous preview releases

### Visualization & Workflow

- **[weave](https://github.com/Zeeeepa/weave)**: Workflow visualization and monitoring
- **[Langfuse](https://langfuse.com/)**: Open-source LLM observability platform

## 🌐 MCP Server Infrastructure

SwarmStack leverages the Model Context Protocol (MCP) to enable seamless communication between AI components.

### MCP Hub vs MCP Package Manager

| Component | Purpose | Features |
|-----------|---------|----------|
| **[mcphub](https://www.npmjs.com/package/@samanhappy/mcphub)** | Central repository for MCP components | - Web-based platform with UI dashboard<br>- Aggregates multiple MCP servers<br>- Unified HTTP/SSE endpoints |
| **[mcpm.sh](https://github.com/pathintegral-institute/mcpm.sh)** | CLI package manager for MCP | - Discovering and installing MCP servers<br>- Managing configurations<br>- Cross-client compatibility |

## 🚀 Getting Started

### Prerequisites

Before installing SwarmStack, ensure you have the following:

- Node.js 16+
- npm or pnpm
- Docker (optional, for containerized deployment)
- Git

### Installation

```bash
# Create a new Motia project
npx motia@latest create -n swarmstack
cd swarmstack

# Install dependencies
npm install

# Install MCP package manager
npm install -g mcpm.sh

# Set up MCP servers
mcpm install @samanhappy/mcphub
mcpm install claude-task-master
mcpm install anon-kode --mode mcp
```

### Configuration

Create custom nodes for each component in your Motia project:

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

## 🔄 Example Workflows

SwarmStack supports various development workflows, including:

### 1. Requirement Analysis to Deployment

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
   - PostHog and Sentry track LLM performance and errors
   - weave or Langfuse visualizes the entire process
   - agent-swarm-kit agents collaborate to analyze results

### 2. CI/CD Pipeline

Create a GitHub Actions workflow file for continuous integration and deployment:

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
      
      # Set up monitoring with Sentry and PostHog
      - name: Configure monitoring
        run: |
          npm install @sentry/node @sentry/tracing posthog-node
          # Additional setup steps for monitoring
```

## ⚙️ Advanced Configuration

### MCP Server Configuration

For production environments, set up a dedicated MCP server infrastructure:

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

### Workflow Configuration

Create a workflow configuration file for your Motia project:

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
    },
    {
      "id": "monitoring",
      "type": "monitoring",
      "config": {
        "sentry": {
          "enabled": true,
          "dsn": "${SENTRY_DSN}",
          "tracesSampleRate": 1.0,
          "allowDefaultPii": true
        },
        "posthog": {
          "enabled": true,
          "apiKey": "${POSTHOG_API_KEY}",
          "host": "https://app.posthog.com"
        }
      }
    }
  ],
  "connections": [
    { "source": "code-checkout", "target": "code-analysis" },
    { "source": "code-analysis", "target": "code-transform" },
    { "source": "code-transform", "target": "build" },
    { "source": "build", "target": "deploy" },
    { "source": "deploy", "target": "monitoring" }
  ]
}
```

## 🔒 Security Considerations

When implementing SwarmStack, consider the following security best practices:

- Store API keys securely using environment variables or a secrets manager
- Implement proper authentication for MCP servers
- Use checkpoints and rollbacks for all code-modifying operations
- Validate all generated code before execution
- Implement rate limiting for API calls
- Ensure proper data handling for sensitive information in PostHog and Sentry
- Regularly update dependencies to address security vulnerabilities
- Implement proper access controls for your CI/CD pipeline

## 📊 Monitoring & Observability

SwarmStack integrates with industry-leading monitoring and observability tools:

### PostHog for LLM Analytics

[PostHog](https://posthog.com/docs/ai-engineering) provides comprehensive LLM observability:

- Track LLM execution flow and performance
- Capture prompts, responses, and intermediate steps
- Visualize relationships between components
- Custom event tracking for code execution context
- Integration with Langfuse for enhanced tracing

### Sentry for Error Tracking

[Sentry](https://sentry.io/for/llm-monitoring/) offers specialized error tracking for LLM applications:

- Detailed error context for LLM applications
- Performance monitoring by AI pipeline
- Trace slowdowns to specific sequences of events
- Code relationship mapping for error propagation
- Automatic token cost and usage calculation

### Observability Tool Comparison

| Feature | Weave | Langfuse |
|---------|-------|----------|
| **Type** | Part of Weights & Biases ecosystem | Standalone open-source platform |
| **Focus** | Experiment tracking and visualization | LLM observability and evaluation |
| **Integration** | Tightly integrated with W&B tools | Flexible integration with various frameworks |
| **Tracing** | Comprehensive tracing capabilities | Specialized for LLM tracing with nested spans |
| **Evaluation** | Strong evaluation framework | Built-in evaluation framework with scoring |
| **Prompt Management** | Basic prompt versioning | Advanced prompt management and versioning |
| **Self-hosting** | Limited self-hosting options | Easy self-hosting with extensive documentation |
| **Community** | Part of W&B ecosystem | Growing open-source community (most used OSS LLMOps) |
| **Best for** | Teams already using W&B ecosystem | Teams needing a dedicated LLM observability solution |

**Recommendation**: Langfuse is generally more effective for dedicated LLM observability and tracing, especially for teams that need a specialized, open-source solution with strong community support. Weave is better for teams already invested in the Weights & Biases ecosystem who want integrated experiment tracking across ML and LLM workflows.

## 📚 Documentation

For detailed documentation on each component, please refer to their respective repositories:

- [Motia Documentation](https://github.com/Zeeeepa/motia)
- [aigne-framework Documentation](https://github.com/Zeeeepa/aigne-framework)
- [serv Documentation](https://github.com/Zeeeepa/serv)
- [claude-task-master Documentation](https://github.com/Zeeeepa/claude-task-master)
- [anon-kode Documentation](https://github.com/Zeeeepa/anon-kode)
- [eko Documentation](https://github.com/Zeeeepa/eko)
- [agent-swarm-kit Documentation](https://github.com/Zeeeepa/agent-swarm-kit)
- [PostHog LLM Documentation](https://posthog.com/docs/ai-engineering)
- [Sentry LLM Monitoring](https://sentry.io/for/llm-monitoring/)

## 🤝 Contributing

Contributions to SwarmStack are welcome! Here's how you can contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the project's coding standards and includes appropriate tests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

