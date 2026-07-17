const fs = require('fs');
const path = require('path');

const map = require('./cloudinary-map.json');
const srcDir = path.join(__dirname, '../sharda-academy-main/src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let modifiedFiles = 0;

walkDir(srcDir, function(filePath) {
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    for (const [localUrl, cloudUrl] of Object.entries(map)) {
      if (localUrl.startsWith('/uploads/images')) continue; // skip backend path variations

      // We only want exact local public paths like '/campus_moment_1.png'
      // We look for quotes around them to be safe
      const searchPattern1 = `"${localUrl}"`;
      const replacePattern1 = `"${cloudUrl}"`;
      
      const searchPattern2 = `'${localUrl}'`;
      const replacePattern2 = `'${cloudUrl}'`;

      content = content.split(searchPattern1).join(replacePattern1);
      content = content.split(searchPattern2).join(replacePattern2);
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
      modifiedFiles++;
    }
  }
});

console.log(`Replaced hardcoded images in ${modifiedFiles} frontend files.`);
