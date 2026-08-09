#!/bin/bash
set -e

# Install dependencies
npm install --legacy-peer-deps

# Run database migrations
npx drizzle-kit push --force
