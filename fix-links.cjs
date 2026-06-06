const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace <Link href="..."> with <Link to="...">
      let changed = false;
      const newContent = content.replace(/<Link([^>]*?)href=(["'{])/g, (match, before, quote) => {
        changed = true;
        return `<Link${before}to=${quote}`;
      });

      // Also there might be `import { NextPage } from 'next'` etc? No, we didn't have NextPage.
      // What about `next/image`? Did the project use `next/image`? The Next.js project used `next/link` only.

      if (changed) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Updated ${fullPath}`);
      }
    }
  });
}

processDir(path.join(__dirname, 'src'));
