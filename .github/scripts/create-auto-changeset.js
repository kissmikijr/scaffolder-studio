const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getChangedFiles() {
  try {
    const diff = execSync('git diff --name-only HEAD^ HEAD').toString().trim();
    return diff ? diff.split('\n') : [];
  } catch (e) {
    console.error('Failed to get git diff:', e);
    return [];
  }
}

function getWorkspaces() {
  try {
    const output = execSync('yarn workspaces list --json').toString().trim();
    return output.split('\n').map(line => JSON.parse(line));
  } catch (e) {
    console.error('Failed to list workspaces:', e);
    return [];
  }
}

function main() {
  const workspaces = getWorkspaces();
  const changedFiles = getChangedFiles();
  
  if (changedFiles.length === 0) {
    console.log('No files changed.');
    return;
  }

  const changedPackages = new Set();

  changedFiles.forEach(file => {
    // Find which workspace this file belongs to
    // We look for the longest workspace path that is a prefix of the file path
    let matchedWorkspace = null;
    
    workspaces.forEach(ws => {
      if (ws.location === '.') return; // Skip root
      if (file.startsWith(ws.location + '/')) {
        if (!matchedWorkspace || ws.location.length > matchedWorkspace.location.length) {
          matchedWorkspace = ws;
        }
      }
    });

    if (matchedWorkspace) {
      changedPackages.add(matchedWorkspace.name);
    }
  });

  if (changedPackages.size === 0) {
    console.log('No packages changed.');
    return;
  }

  const changesetContent = `---
${Array.from(changedPackages).map(pkg => `"${pkg}": minor`).join('\n')}
---

Automated release from commit ${execSync('git rev-parse --short HEAD').toString().trim()}
`;

  const filename = `.changeset/auto-${Date.now()}.md`;
  
  // Ensure .changeset dir exists (it should)
  if (!fs.existsSync('.changeset')) {
    fs.mkdirSync('.changeset');
  }

  fs.writeFileSync(filename, changesetContent);
  console.log(`Created changeset: ${filename}`);
  console.log(changesetContent);
}

main();
