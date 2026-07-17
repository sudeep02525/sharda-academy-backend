const cp = require('child_process');
const fs = require('fs');
const output = cp.execSync('node dump_content.js').toString('utf8');
const jsonStr = output.substring(output.indexOf('{\n  "hero"'));
fs.writeFileSync('../sharda-academy-main/src/app/homeContent.json', jsonStr, 'utf8');
console.log('Fixed');
