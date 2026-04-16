/**
 * CPU Stress Script for Team 12 Cloud Project
 * This script will artificially increase CPU usage to trigger spike detection.
 */

const os = require('os');

function stressCPU() {
  console.log('🚀 CPU Stress Test Started...');
  console.log('This will create high CPU load. Press Ctrl+C to stop.');

  // Create one worker loop per CPU core
  const numCores = os.cpus().length;
  console.log(`Using ${numCores} cores...`);

  for (let i = 0; i < numCores; i++) {
    setInterval(() => {
      let start = Date.now();
      // Busy loop for 1500ms every 2000ms
      while (Date.now() - start < 1500) {
        Math.sqrt(Math.random() * Math.random());
      }
    }, 2000);
  }
}

stressCPU();
