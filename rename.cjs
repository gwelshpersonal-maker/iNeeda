const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content
      .replace(/I Got A Guy!/g, 'iNeeda')
      .replace(/I Got A Guy/g, 'iNeeda')
      .replace(/IGOTAGUY\.CO/g, 'iNeeda.work')
      .replace(/IGOTAGUY(<|")/g, 'iNeeda$1')
      .replace(/igotaguy\.co/g, 'ineeda.work')
      .replace(/Local Guy/g, 'Local Pro')
      .replace(/Wait for a Guy/ig, 'Wait for a Pro')
      .replace(/Waiting for a Guy/ig, 'Waiting for a Pro')
      .replace(/a Guy/g, 'a Pro')
      .replace(/Got A Guy/g, 'Got A Pro')
      .replace(/I got a guy/g, 'I need a pro');
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      console.log('Updated', filePath);
    }
  }
});
