import { discoverVSCodeInstances } from './vscode-discovery.js';
import { focusWindow } from './window-switcher.js';

export async function switchCommand(windowId) {
  const instances = await discoverVSCodeInstances();
  const instance = instances.find(i => i.id === windowId);

  if (!instance) {
    console.error(`Error: Window ID "${windowId}" not found`);
    console.log('\nAvailable windows:');
    if (instances.length === 0) {
      console.log('  (no windows found)');
    } else {
      for (const inst of instances) {
        console.log(`  ${inst.id}: ${inst.windowTitle}`);
      }
    }
    process.exit(1);
  }

  try {
    await focusWindow(windowId);
    console.log(`Focused: ${instance.windowTitle}`);
  } catch (err) {
    console.error('Error focusing window:', err.message);
    process.exit(1);
  }
}
