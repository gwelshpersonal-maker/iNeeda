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
      .replace(/our guys/ig, 'our pros')
      .replace(/we've got a guy for that/ig, "we've got a pro for that")
      .replace(/skilled guy/ig, 'skilled pro')
      .replace(/our Guy's/ig, "our Pro's")
      .replace(/GET A GUY!/g, "GET A PRO!")
      .replace(/best guy for/ig, 'best pro for')
      .replace(/local guy/ig, 'local pro')
      .replace(/IGOTTAGUY/g, 'iNeeda')
      .replace(/"Guy" Catalog/ig, '"Pro" Catalog')
      .replace(/right guy \(or gal\)/ig, 'right pro')
      .replace(/"Guy" Pipeline/ig, '"Pro" Pipeline')
      .replace(/Public Guy Signup/ig, 'Public Pro Signup')
      .replace(/new guy/ig, 'new pro')
      .replace(/Guy Bonus/ig, 'Pro Bonus')
      .replace(/be a guy/ig, 'be a pro')
      .replace(/Repeat Guy/ig, 'Repeat Pro')
      .replace(/strong guy/ig, 'strong pro')
      .replace(/The "Guy"/g, 'The "Pro"');
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      console.log('Updated', filePath);
    }
  }
});
