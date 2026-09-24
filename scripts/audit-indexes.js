const fs = require('fs');
const path = require('path');
const dirs = fs.readdirSync('packages/database/prisma/migrations').filter(d=>d.includes('phase3') || d.includes('phase40')).sort();
const indexes = {};
const duplicates = [];

dirs.forEach(dir => {
  const sql = fs.readFileSync(path.join('packages/database/prisma/migrations', dir, 'migration.sql'), 'utf-8');
  const lines = sql.split('\n');
  lines.forEach(l => {
    let match = l.match(/CREATE\s+(UNIQUE\s+)?INDEX\s+"([^"]+)"/i);
    if (match) {
      const idxName = match[2];
      if (indexes[idxName]) duplicates.push({idx: idxName, first: indexes[idxName], dup: dir});
      else indexes[idxName] = dir;
    }
  });
});
console.log(duplicates);
