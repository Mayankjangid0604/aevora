const fs = require('fs');
const path = require('path');

const migrationsDir = 'packages/database/prisma/migrations';
const dirs = fs.readdirSync(migrationsDir)
  .filter(d => fs.statSync(path.join(migrationsDir, d)).isDirectory() && d.includes('phase3'));

// Also include phase40
const phase40 = fs.readdirSync(migrationsDir).find(d => d.includes('phase40'));
if (phase40 && !dirs.includes(phase40)) dirs.push(phase40);

dirs.sort(); // Chronological order

const seenObjects = {};
const duplicates = [];

// Regex to capture the object name from ADD CONSTRAINT and CREATE UNIQUE INDEX
const indexRegex = /CREATE\s+(UNIQUE\s+)?INDEX\s+"([^"]+)"/i;
const constraintRegex = /ADD\s+CONSTRAINT\s+"([^"]+)"/i;

dirs.forEach(dir => {
  const sqlPath = path.join(migrationsDir, dir, 'migration.sql');
  if (!fs.existsSync(sqlPath)) return;
  
  const content = fs.readFileSync(sqlPath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, i) => {
    let match = indexRegex.exec(line);
    let type = match ? 'INDEX' : null;
    let objName = match ? match[2] : null;
    
    if (!match) {
      match = constraintRegex.exec(line);
      if (match) {
        type = 'CONSTRAINT';
        objName = match[1];
      }
    }
    
    if (objName) {
      if (seenObjects[objName]) {
        // Is it dropped earlier in THIS file or previous? 
        // We aren't fully parsing DROP, but let's log all creations to see the raw duplicates.
        duplicates.push({
          object: objName,
          type,
          firstCreated: seenObjects[objName].dir,
          duplicateLocation: dir,
          statement: line.trim()
        });
      } else {
        seenObjects[objName] = { dir, statement: line.trim() };
      }
    }
  });
});

console.log("=== DUPLICATES FOUND ===");
duplicates.forEach(d => {
  console.log(`${d.object} | ${d.type} | First: ${d.firstCreated} | Dup: ${d.duplicateLocation}`);
});
