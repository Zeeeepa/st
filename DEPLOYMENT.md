# Webhook Gateway Database Deployment Guide

## Prerequisites

1. Supabase project created
2. Environment variables configured:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
3. Node.js 16+ installed

## Deployment Steps

### Step 1: Prepare Environment

```bash
# Clone the repository
git clone <your-repo-url>
cd webhook-gateway

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Supabase credentials