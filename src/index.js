#!/usr/bin/env node

import { handleCommand } from './cli.js';

const args = process.argv.slice(2);
handleCommand(args).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
