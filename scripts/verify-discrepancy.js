const fs = require('fs');

const p34Path = 'packages/database/prisma/migrations/20260923700000_phase34_product_factory/migration.sql';
const p33Path = 'packages/database/prisma/migrations/20260923600000_phase33_model_platform/migration.sql';

const p34Lines = fs.readFileSync(p34Path, 'utf-8').split('\n');
const p33Lines = fs.readFileSync(p33Path, 'utf-8').split('\n');

const p33Constraints = new Set();
p33Lines.forEach(l => {
  const match = l.match(/ADD\s+CONSTRAINT\s+"([^"]+)"/i);
  if (match) p33Constraints.add(match[1]);
});

let counter = 0;
let existingCount = 0;
let newCount = 0;
let firstLine = -1;
let lastLine = -1;

console.log("=== CONSTRAINT LIST ===");
p34Lines.forEach((l, i) => {
  // Only look in the suspected block bounds for reporting
  if (i + 1 >= 336 && i + 1 <= 506) {
    const match = l.match(/ALTER\s+TABLE\s+"([^"]+)"\s+ADD\s+CONSTRAINT\s+"([^"]+)"/i);
    if (match) {
      counter++;
      if (firstLine === -1) firstLine = i + 1;
      lastLine = i + 1;
      
      const table = match[1];
      const constraint = match[2];
      const exists = p33Constraints.has(constraint);
      
      if (exists) existingCount++;
      else newCount++;
      
      console.log(`${counter}. ${constraint} (Line ${i+1}) [Table: ${table}] - Exists in P33: ${exists ? 'YES' : 'NO'}`);
    }
  }
});

console.log("=== SUMMARY ===");
console.log("Total statements in suspected block:", counter);
console.log("Already existing in earlier migrations:", existingCount);
console.log("Genuinely new constraints:", newCount);
console.log("Exact duplicate count:", existingCount);
console.log("First duplicate line:", firstLine);
console.log("Last duplicate line:", lastLine);
