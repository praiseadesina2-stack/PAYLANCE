require('dotenv').config();
const { createAuthenticatedClient } = require('@interledger/open-payments');
const { loadPrivateKey, getWalletInfo } = require('./services/ilpService.js');

async function test() {
  const fromPointer = process.env.ILP_EMPLOYER_PAYMENT_POINTER;
  const toPointer = process.env.ILP_PLATFORM_PAYMENT_POINTER;
  const fromKey = loadPrivateKey(process.env.ILP_EMPLOYER_PRIVATE_KEY);
  const toKey = loadPrivateKey(process.env.ILP_PLATFORM_PRIVATE_KEY);
  
  const fromUrl = fromPointer.replace('$', 'https://');
  const toUrl = toPointer.replace('$', 'https://');
  
  const toWalletInfo = await getWalletInfo(toPointer);
  const toClient = await createAuthenticatedClient({
    walletAddressUrl: toUrl,
    privateKey: toKey,
    keyId: process.env.ILP_PLATFORM_KEY_ID,
  });
  
  try {
    const incomingPaymentGrant = await toClient.grant.request(
      { url: toWalletInfo.authServer },
      { access_token: { access: [{ type: 'incoming-payment', actions: ['create', 'read', 'list'] }] } }
    );
    
    console.log('Creating incoming payment with resourceServer only');
    const incomingPayment = await toClient.incomingPayment.create(
      { url: toWalletInfo.resourceServer, accessToken: incomingPaymentGrant.access_token.value },
      { walletAddress: toUrl, incomingAmount: { value: '100', assetCode: toWalletInfo.assetCode, assetScale: toWalletInfo.assetScale } }
    );
    console.log('Incoming payment success!', incomingPayment.id);

    const fromWalletInfo = await getWalletInfo(fromPointer);
    const fromClient = await createAuthenticatedClient({
      walletAddressUrl: fromUrl,
      privateKey: fromKey,
      keyId: process.env.ILP_EMPLOYER_KEY_ID,
    });
    
    const quoteGrant = await fromClient.grant.request(
      { url: fromWalletInfo.authServer },
      { access_token: { access: [{ type: 'quote', actions: ['create', 'read'] }] } }
    );

    console.log('Creating quote with resourceServer only');
    const quote = await fromClient.quote.create(
      { url: fromWalletInfo.resourceServer, accessToken: quoteGrant.access_token.value },
      { method: 'ilp', walletAddress: fromUrl, receiver: incomingPayment.id }
    );
    console.log('Quote success!', quote.id);

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
      }
    );

    console.log('Creating outgoing payment with resourceServer only');
    const outgoingPayment = await fromClient.outgoingPayment.create(
      { url: fromWalletInfo.resourceServer, accessToken: outgoingGrant.access_token.value },
      { walletAddress: fromUrl, quoteId: quote.id }
    );
    console.log('Outgoing payment success!', outgoingPayment.id);

  } catch (e) {
    console.error('Test failed:', e);
  }
}
test();
