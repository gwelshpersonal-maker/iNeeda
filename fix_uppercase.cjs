const fs = require('fs');
let file = './src/pages/Signup.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/"I GOT A GUY"/g, '"iNeeda"');
fs.writeFileSync(file, content);
console.log('Fixed Signup.tsx uppercase');
