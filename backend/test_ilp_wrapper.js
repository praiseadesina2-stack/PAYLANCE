require('dotenv').config();
const { executeILPTransfer, depositToPaylance, withdrawFromPaylance } = require('./services/ilpService.js');

async function test() {
  console.log('Testing deposit from Freelancer to Platform');
  try {
    const res1 = await depositToPaylance('freelancer', 1);
    console.log(res1);
  } catch (e) {
    console.error("CAUGHT:", e);
  }
}
test();
