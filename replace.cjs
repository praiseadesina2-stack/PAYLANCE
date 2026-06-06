const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('c:/Users/Administrator/Desktop/paylance-react/src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  // Replace exact API_URL declarations
  if (content.includes('"http://localhost:5000/api"')) {
    content = content.replace(/"http:\/\/localhost:5000\/api"/g, '(import.meta.env.VITE_API_URL || "http://localhost:5000/api")');
    modified = true;
  }
  
  // Replace backtick queries
  if (content.includes('`http://localhost:5000/api')) {
    content = content.replace(/`http:\/\/localhost:5000\/api/g, '`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}');
    modified = true;
  }
  
  // Replace single quote queries: 'http://localhost:5000/api/some/path' -> `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/some/path`
  if (content.includes("'http://localhost:5000/api")) {
    content = content.replace(/'http:\/\/localhost:5000\/api([^']*)'/g, '`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}$1`');
    modified = true;
  }

  // Socket connection URLs
  if (content.includes('"http://localhost:5000"')) {
    content = content.replace(/"http:\/\/localhost:5000"/g, '(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000")');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
});
