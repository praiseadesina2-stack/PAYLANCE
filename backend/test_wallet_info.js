require('dotenv').config();
const { getWalletInfo } = require('./services/ilpService.js');

async function test() {
  const info = await getWalletInfo(process.env.ILP_PLATFORM_PAYMENT_POINTER);
  console.log(info);
}
test();
