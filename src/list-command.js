import { discoverVSCodeInstances } from './vscode-discovery.js';
import { readConfig } from './config.js';

export async function listWindows() {
  const instances = await discoverVSCodeInstances();
  const config = readConfig();

  if (instances.length === 0) {
    console.log('No open VSCode windows found');
    return;
  }

  console.log('Open VSCode Windows:\n');
  console.log('ID                  | Title');
  console.log('--------------------+---------------------------------');

  for (const instance of instances) {
    const id = instance.id.padEnd(19);
    const title = instance.windowTitle.slice(0, 33);
    console.log(`${id}| ${title}`);
  }
}
