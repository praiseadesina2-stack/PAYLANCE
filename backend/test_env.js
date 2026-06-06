const dotenv = require('dotenv');
const fs = require('fs');

const envConfig = dotenv.parse(fs.readFileSync('backend/.env'));
console.log(envConfig.ILP_EMPLOYER_PRIVATE_KEY.includes('\\n') ? "LITERAL SLASH N" : "REAL NEWLINE");
console.log(envConfig.ILP_EMPLOYER_PRIVATE_KEY);
