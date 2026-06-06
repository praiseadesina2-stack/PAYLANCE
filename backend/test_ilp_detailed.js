require('dotenv').config();
const { createAuthenticatedClient } = require('@interledger/open-payments');
const { loadPrivateKey, getWalletInfo } = require('./services/ilpService.js');

async function test() {
  const fromPointer = process.env.ILP_FREELANCER_PAYMENT_POINTER;
  const toPointer = process.env.ILP_PLATFORM_PAYMENT_POINTER;
  const fromKey = loadPrivateKey(process.env.ILP_FREELANCER_PRIVATE_KEY);
  const toKey = loadPrivateKey(process.env.ILP_PLATFORM_PRIVATE_KEY);
  
  const fromUrl = fromPointer.replace('$', 'https://');
  const toUrl = toPointer.replace('$', 'https://');
  
  try {
    const toWalletInfo = await getWalletInfo(toPointer);
    const toClient = await createAuthenticatedClient({
      walletAddressUrl: toUrl,
      privateKey: toKey,
      keyId: process.env.ILP_PLATFORM_KEY_ID,
    });
    
    const incomingPaymentGrant = await toClient.grant.request(
      { url: toWalletInfo.authServer },
      { access_token: { access: [{ type: 'incoming-payment', actions: ['create', 'read', 'list'] }] } }
    );
    
    const incomingPayment = await toClient.incomingPayment.create(
      { url: toWalletInfo.resourceServer, accessToken: incomingPaymentGrant.access_token.value },
      { walletAddress: toUrl, incomingAmount: { value: '100', assetCode: toWalletInfo.assetCode, assetScale: toWalletInfo.assetScale } }
    );
    console.log('Incoming payment ID:', incomingPayment.id);

    const fromWalletInfo = await getWalletInfo(fromPointer);
    const fromClient = await createAuthenticatedClient({
      walletAddressUrl: fromUrl,
      privateKey: fromKey,
      keyId: process.env.ILP_FREELANCER_KEY_ID,
    });
    
    const quoteGrant = await fromClient.grant.request(
      { url: fromWalletInfo.authServer },
      { access_token: { access: [{ type: 'quote', actions: ['create', 'read'] }] } }
    );

    const quote = await fromClient.quote.create(
      { url: fromWalletInfo.resourceServer, accessToken: quoteGrant.access_token.value },
      { method: 'ilp', walletAddress: fromUrl, receiver: incomingPayment.id }
    );
    console.log('Quote ID:', quote.id);

    const outgoingGrant = await fromClient.grant.request(
      { url: fromWalletInfo.authServer },
      {
        access_token: {
          access: [
            {
              type: 'outgoing-payment',
              actions: ['create', 'read', 'list'],
              identifier: fromUrl,
              limits: {
                debitAmount: quote.debitAmount,
              },
            },
          ],
        },
        interact: {
          start: ['redirect'],
          finish: {
            method: 'redirect',
            uri: 'http://localhost:5173/ilp-callback',
            nonce: '1234567890abcdef'
          }
        }
      }
    );
    console.log('Outgoing grant:', outgoingGrant);

  } catch (e) {
    console.error('Test failed:', e);
    if (e.response) {
       console.error('Response body:', e.response.body || e.response.data);
    }
  }
}
test();
