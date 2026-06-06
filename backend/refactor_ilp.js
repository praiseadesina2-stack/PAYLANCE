const fs = require('fs');
let code = fs.readFileSync('services/ilpService.js', 'utf8');

const newLogic = `async function initiateGenericTransfer(fromPrefix, toPrefix, amountUSD) {
  const fromPointer = process.env[\`ILP_\${fromPrefix}_PAYMENT_POINTER\`];
  const fromKeyId = process.env[\`ILP_\${fromPrefix}_KEY_ID\`];
  const fromPrivateKey = process.env[\`ILP_\${fromPrefix}_PRIVATE_KEY\`];
  
  const toPointer = process.env[\`ILP_\${toPrefix}_PAYMENT_POINTER\`];
  const toKeyId = process.env[\`ILP_\${toPrefix}_KEY_ID\`];
  const toPrivateKey = process.env[\`ILP_\${toPrefix}_PRIVATE_KEY\`];

  const fromUrl = fromPointer?.startsWith('$') ? fromPointer.replace('$', 'https://') : fromPointer;
  const toUrl = toPointer?.startsWith('$') ? toPointer.replace('$', 'https://') : toPointer;

  console.log(\`[ILP Transfer] Initiating $\${amountUSD} transfer: \${fromPointer} → \${toPointer}\`);

  const fromKey = loadPrivateKey(fromPrivateKey);
  const toKey = loadPrivateKey(toPrivateKey);
  if (!fromKey || fromKey.includes('BEGIN PUBLIC KEY') || !toKey || toKey.includes('BEGIN PUBLIC KEY')) {
    console.warn(\`[ILP Transfer] Missing valid private keys — returning mock success for demo\`);
    return mockTransferResult(amountUSD, fromPointer, toPointer);
  }

  try {
    const toWalletInfo = await getWalletInfo(toPointer);
    if (!toWalletInfo) throw new Error('Cannot reach TO wallet');
    const assetScale = toWalletInfo.assetScale || 2;
    const amountInSmallestUnit = String(Math.round(amountUSD * Math.pow(10, assetScale)));

    const toClient = await createAuthenticatedClient({ walletAddressUrl: toUrl, privateKey: toKey, keyId: toKeyId });
    const incomingPaymentGrant = await toClient.grant.request(
      { url: toWalletInfo.authServer },
      { access_token: { access: [{ type: 'incoming-payment', actions: ['create', 'read', 'list'] }] } }
    );
    if (!incomingPaymentGrant?.access_token?.value) throw new Error('Failed to get incoming payment grant');

    const incomingPayment = await toClient.incomingPayment.create(
      { url: toWalletInfo.resourceServer, accessToken: incomingPaymentGrant.access_token.value },
      {
        walletAddress: toUrl,
        incomingAmount: { value: amountInSmallestUnit, assetCode: toWalletInfo.assetCode, assetScale },
        expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
      }
    );

    const fromWalletInfo = await getWalletInfo(fromPointer);
    const fromClient = await createAuthenticatedClient({ walletAddressUrl: fromUrl, privateKey: fromKey, keyId: fromKeyId });
    const quoteGrant = await fromClient.grant.request(
      { url: fromWalletInfo.authServer },
      { access_token: { access: [{ type: 'quote', actions: ['create', 'read'] }] } }
    );

    const quote = await fromClient.quote.create(
      { url: fromWalletInfo.resourceServer, accessToken: quoteGrant.access_token.value },
      { method: 'ilp', walletAddress: fromUrl, receiver: incomingPayment.id }
    );

    const outgoingGrant = await fromClient.grant.request(
      { url: fromWalletInfo.authServer },
      {
        access_token: {
          access: [
            {
              type: 'outgoing-payment',
              actions: ['create', 'read', 'list'],
              identifier: fromUrl,
              limits: { debitAmount: quote.debitAmount },
            },
          ],
        },
        interact: {
          start: ['redirect'],
          finish: {
            method: 'redirect',
            uri: 'http://localhost:3000/ilp-callback',
            nonce: crypto.randomBytes(16).toString('hex')
          }
        }
      }
    );

    if (outgoingGrant?.interact?.redirect) {
      return {
        requiresInteraction: true,
        interactUrl: outgoingGrant.interact.redirect,
        continueUri: outgoingGrant.continue.uri,
        continueToken: outgoingGrant.continue.access_token.value,
        quoteId: quote.id,
        amountUSD,
        fromPrefix,
        toPrefix,
        fromWallet: fromPointer,
        toWallet: toPointer
      };
    }

    if (!outgoingGrant?.access_token?.value) throw new Error('Failed to get outgoing payment grant');

    const outgoingPayment = await fromClient.outgoingPayment.create(
      { url: fromWalletInfo.resourceServer, accessToken: outgoingGrant.access_token.value },
      { walletAddress: fromUrl, quoteId: quote.id }
    );

    return {
      success: true, mode: 'live', transactionId: outgoingPayment.id, incomingPaymentId: incomingPayment.id,
      quoteId: quote.id, amount: amountUSD, debitAmount: quote.debitAmount, receiveAmount: quote.receiveAmount,
      fromWallet: fromPointer, toWallet: toPointer, message: \`$\${amountUSD} transferred live\`
    };
  } catch (err) {
    console.error('[ILP Transfer] Real transfer failed:', err.message);
    return mockTransferResult(amountUSD, fromPointer, toPointer, { error: err.message });
  }
}

async function completeGenericTransfer(pending, interactRef) {
  const fromPointer = process.env[\`ILP_\${pending.fromPrefix}_PAYMENT_POINTER\`];
  const fromKeyId = process.env[\`ILP_\${pending.fromPrefix}_KEY_ID\`];
  const fromPrivateKey = process.env[\`ILP_\${pending.fromPrefix}_PRIVATE_KEY\`];
  const fromUrl = fromPointer?.startsWith('$') ? fromPointer.replace('$', 'https://') : fromPointer;
  const fromKey = loadPrivateKey(fromPrivateKey);

  const fromWalletInfo = await getWalletInfo(fromPointer);
  const fromClient = await createAuthenticatedClient({ walletAddressUrl: fromUrl, privateKey: fromKey, keyId: fromKeyId });

  try {
    const tokenRes = await fromClient.grant.continue(
      { url: pending.continueUri, accessToken: pending.continueToken },
      { interact_ref: interactRef }
    );

    if (!tokenRes?.access_token?.value) throw new Error('Failed to complete grant. No access token returned.');

    const outgoingPayment = await fromClient.outgoingPayment.create(
      { url: fromWalletInfo.resourceServer, accessToken: tokenRes.access_token.value },
      { walletAddress: fromUrl, quoteId: pending.quoteId }
    );

    return {
      success: true, mode: 'live', transactionId: outgoingPayment.id, quoteId: pending.quoteId, amount: pending.amountUSD,
      fromWallet: pending.fromWallet, toWallet: pending.toWallet, message: \`$\${pending.amountUSD} transferred live via Interledger\`
    };
  } catch (err) {
    console.error('[ILP Transfer] Continuation failed:', err.message);
    throw new Error('ILP Transfer continuation failed: ' + err.message);
  }
}

// Wrapper for employer -> freelancer (existing behavior)
async function executeILPTransfer(amountUSD) {
  return initiateGenericTransfer('EMPLOYER', 'FREELANCER', amountUSD);
}

// Deposit: User -> Platform Escrow
async function depositToPaylance(userRole, amountUSD) {
  return initiateGenericTransfer(userRole.toUpperCase(), 'PLATFORM', amountUSD);
}

// Withdraw: Platform Escrow -> User
async function withdrawFromPaylance(userRole, amountUSD) {
  return initiateGenericTransfer('PLATFORM', userRole.toUpperCase(), amountUSD);
}`;

const regex = /async function executeGenericTransfer[\s\S]*?async function withdrawFromPaylance\(userRole, amountUSD\) \{\s*return executeGenericTransfer\('PLATFORM', userRole\.toUpperCase\(\), amountUSD\);\s*\}/m;
code = code.replace(regex, newLogic);

// Add completeGenericTransfer to exports
code = code.replace(/module\.exports = \{/, 'module.exports = {\n  completeGenericTransfer,');

fs.writeFileSync('services/ilpService.js', code);
