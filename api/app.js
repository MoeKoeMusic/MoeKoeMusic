#!/usr/bin/env node

async function start() {
  require('./util/runtime').applyCliOverrides();
  require('./server').startService();
}

start();
