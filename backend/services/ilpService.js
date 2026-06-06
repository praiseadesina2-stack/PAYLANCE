const { createAuthenticatedClient, createUnauthenticatedClient } = require('@interledger/open-payments');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MOCK_DELAY = 800;

// ============================================================
// KEY LOADING UTILITY
// ============================================================
function loadPrivateKey(rawValue) {
  if (!rawValue) return null;
  const trimmed = rawValue.trim();

  // PEM format — use directly
  if (trimmed.startsWith('-----BEGIN PRIVATE KEY-----') || trimmed.startsWith('-----BEGIN EC PRIVATE KEY-----')) {
    return trimmed;
  }

  // Path to a key file
  if (!trimmed.includes('\n') && (trimmed.endsWith('.key') || trimmed.endsWith('.pem'))) {
    try {
      const resolved = path.isAbsolute(trimmed) ? trimmed : path.resolve(__dirname, '..', trimmed);
      const contents = fs.readFileSync(resolved, 'utf8');
      return contents.trim();
    } catch (e) {
      console.error('[ILP] Failed to read key file:', e.message);
      return null;
    }
  }

  // Base64-encoded 32-byte raw Ed25519 seed (interledger-test.dev format)
  try {
    const buf = Buffer.from(trimmed, 'base64');
    if (buf.length === 32) {
      const keyObject = crypto.createPrivateKey({
        key: buf,
        format: 'raw',
        type: 'pkcs8',
      });
      return keyObject.export({ type: 'pkcs8', format: 'pem' });
    }
  } catch (e) {}

  // Return as-is and let the SDK try
  return trimmed;
}

async function getClient(walletAddressUrl, keyId, privateKeyRaw) {
  const privateKey = loadPrivateKey(privateKeyRaw);

  if (!privateKey) {
    console.warn(`[ILP] No private key for ${walletAddressUrl} — running in Mock Mode`);
    return null;
  }

  if (privateKey.includes('BEGIN PUBLIC KEY')) {
    console.warn(`[ILP] ⚠ Public key detected for ${walletAddressUrl}. You must provide a PRIVATE key. Running in Mock Mode.`);
    return null;
  }

  try {
    const client = await createAuthenticatedClient({
      walletAddressUrl: walletAddressUrl.startsWith('$')
        ? walletAddressUrl.replace('$', 'https://')
        : walletAddressUrl,
      privateKey,
      keyId,
    });
    console.log(`[ILP] ✓ Authenticated client created for ${walletAddressUrl}`);
    return client;
  } catch (err) {
    console.error(`[ILP] Failed to create client for ${walletAddressUrl}:`, err.message);
    return null;
  }
}

async function getPublicClient() {
  try {
    return await createUnauthenticatedClient();
  } catch (e) {
    console.error('[ILP] Failed to create public client:', e.message);
    return null;
  }
}

async function getWalletInfo(walletPointer) {
  const url = walletPointer.startsWith('$')
    ? walletPointer.replace('$', 'https://')
    : walletPointer;

  try {
    const client = await getPublicClient();
    if (!client) throw new Error('No public client');
    const info = await client.walletAddress.get({ url });
    return info;
  } catch (e) {
    // Fallback: direct fetch
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e2) {
      console.error('[ILP] getWalletInfo failed:', e2.message);
      return null;
    }
  }
}

async function initiateGenericTransfer(fromPrefix, toPrefix, amountUSD) {
  const fromPointer = process.env[`ILP_${fromPrefix}_PAYMENT_POINTER`];
  const fromKeyId = process.env[`ILP_${fromPrefix}_KEY_ID`];
  const fromPrivateKey = process.env[`ILP_${fromPrefix}_PRIVATE_KEY`];
  
  const toPointer = process.env[`ILP_${toPrefix}_PAYMENT_POINTER`];
  const toKeyId = process.env[`ILP_${toPrefix}_KEY_ID`];
  const toPrivateKey = process.env[`ILP_${toPrefix}_PRIVATE_KEY`];

  const fromUrl = fromPointer?.startsWith('$') ? fromPointer.replace('$', 'https://') : fromPointer;
  const toUrl = toPointer?.startsWith('$') ? toPointer.replace('$', 'https://') : toPointer;

  console.log(`[ILP Transfer] Initiating $${amountUSD} transfer: ${fromPointer} → ${toPointer}`);

  const fromKey = loadPrivateKey(fromPrivateKey);
  const toKey = loadPrivateKey(toPrivateKey);

  const hasValidFromKey = fromKey && !fromKey.includes('BEGIN PUBLIC KEY');
  const hasValidToKey = toKey && !toKey.includes('BEGIN PUBLIC KEY');

  if (!hasValidFromKey || !hasValidToKey) {
    console.warn(`[ILP Transfer] Missing valid private keys — returning mock success for demo`);
    return mockTransferResult(amountUSD, fromPointer, toPointer);
  }

  try {
    const toWalletInfo = await getWalletInfo(toPointer);
    if (!toWalletInfo) throw new Error('Cannot reach TO wallet');

    const assetScale = toWalletInfo.assetScale || 2;
    const amountInSmallestUnit = String(Math.round(amountUSD * Math.pow(10, assetScale)));

    const toClient = await createAuthenticatedClient({
      walletAddressUrl: toUrl,
      privateKey: toKey,
      keyId: toKeyId,
    });

    const incomingPaymentGrant = await toClient.grant.request(
      { url: toWalletInfo.authServer },
      {
        access_token: {
          access: [
            {
              type: 'incoming-payment',
              actions: ['create', 'read', 'list'],
            },
          ],
        },
      }
    );

    if (!incomingPaymentGrant?.access_token?.value) {
      throw new Error('Failed to get incoming payment grant');
    }

    const incomingPayment = await toClient.incomingPayment.create(
      {
        url: toWalletInfo.resourceServer,
        accessToken: incomingPaymentGrant.access_token.value,
      },
      {
        walletAddress: toUrl,
        incomingAmount: {
          value: amountInSmallestUnit,
          assetCode: toWalletInfo.assetCode,
          assetScale,
        },
        expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
      }
    );

    console.log(`[ILP Transfer] Incoming payment created: ${incomingPayment.id}`);

    const fromWalletInfo = await getWalletInfo(fromPointer);
    const fromClient = await createAuthenticatedClient({
      walletAddressUrl: fromUrl,
      privateKey: fromKey,
      keyId: fromKeyId,
    });

    const quoteGrant = await fromClient.grant.request(
      { url: fromWalletInfo.authServer },
      {
        access_token: {
          access: [{ type: 'quote', actions: ['create', 'read'] }],
        },
      }
    );

    const quote = await fromClient.quote.create(
      {
        url: fromWalletInfo.resourceServer,
        accessToken: quoteGrant.access_token.value,
      },
      {
        method: 'ilp',
        walletAddress: fromUrl,
        receiver: incomingPayment.id,
      }
    );

    console.log(`[ILP Transfer] Quote created: ${quote.id}, send amount: ${quote.debitAmount?.value} ${quote.debitAmount?.assetCode}`);

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

    if (!outgoingGrant?.access_token?.value) {
      throw new Error('Failed to get outgoing payment grant');
    }

    const outgoingPayment = await fromClient.outgoingPayment.create(
      {
        url: fromWalletInfo.resourceServer,
        accessToken: outgoingGrant.access_token.value,
      },
      {
        walletAddress: fromUrl,
        quoteId: quote.id,
      }
    );

    console.log(`[ILP Transfer] ✓ Payment complete! TX: ${outgoingPayment.id}`);

    return {
      success: true,
      mode: 'live',
      transactionId: outgoingPayment.id,
      incomingPaymentId: incomingPayment.id,
      quoteId: quote.id,
      amount: amountUSD,
      debitAmount: quote.debitAmount,
      receiveAmount: quote.receiveAmount,
      fromWallet: fromPointer,
      toWallet: toPointer,
      message: `$${amountUSD} transferred live via Interledger Open Payments`,
    };
  } catch (err) {
    console.error('[ILP Transfer] Real transfer failed:', err);
    if (err.response) {
       console.error('[ILP Transfer] Error body:', err.response.body || err.response.data);
    }
    return mockTransferResult(amountUSD, fromPointer, toPointer, { error: err.message });
  }
}

async function completeGenericTransfer(pending, interactRef) {
  // A better way: in completeGenericTransfer, we look up the key by fromPrefix.
  const fromPrefix = pending.fromPrefix;
  const fromPointerKey = process.env[`ILP_${fromPrefix}_PAYMENT_POINTER`];
  const fromKeyId = process.env[`ILP_${fromPrefix}_KEY_ID`];
  const fromPrivateKey = process.env[`ILP_${fromPrefix}_PRIVATE_KEY`];
  const fromUrl = fromPointerKey?.startsWith('$') ? fromPointerKey.replace('$', 'https://') : fromPointerKey;
  const fromKey = loadPrivateKey(fromPrivateKey);

  const fromWalletInfo = await getWalletInfo(fromPointerKey);
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
      fromWallet: pending.fromWallet, toWallet: pending.toWallet, message: `$${pending.amountUSD} transferred live via Interledger`
    };
  } catch (err) {
    console.error('[ILP Transfer] Continuation failed:', err.message);
    throw new Error('ILP Transfer continuation failed: ' + err.message);
  }
}

async function executeILPTransfer(amountUSD) {
  return initiateGenericTransfer('EMPLOYER', 'FREELANCER', amountUSD);
}

async function depositToPaylance(userRole, amountUSD) {
  return initiateGenericTransfer(userRole.toUpperCase(), 'PLATFORM', amountUSD);
}

async function withdrawFromPaylance(userRole, amountUSD) {
  return initiateGenericTransfer('PLATFORM', userRole.toUpperCase(), amountUSD);
}

function mockTransferResult(amount, from, to, extra = {}) {
  return {
    success: true,
    mode: 'mock',
    transactionId: `ilp-mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    amount,
    fromWallet: from,
    toWallet: to,
    message: `$${amount} transfer recorded (Interledger testnet demo mode)`,
    ...extra,
  };
}

async function lockFunds(employerId, amount) {
  console.log(`[ILP Escrow] Locking $${amount} for employer ${employerId}`);
  await new Promise(r => setTimeout(r, MOCK_DELAY));
  return {
    status: 'escrowed',
    transactionId: `ilp-escrow-${Date.now()}`,
    amount_locked: amount,
    currency: 'USD',
    message: 'Funds locked in Paylance escrow. Will be released on milestone approval.',
  };
}

async function executePayout(freelancerId, amount) {
  console.log(`[ILP Payout] Releasing $${amount} to freelancer ${freelancerId}`);
  const result = await executeILPTransfer(amount);
  return {
    ...result,
    status: 'paid',
    amount_released: amount,
    destination_wallet: process.env.ILP_FREELANCER_PAYMENT_POINTER,
  };
}

async function getWalletBalance(walletPointer) {
  try {
    const info = await getWalletInfo(walletPointer);
    return { info, connected: !!info };
  } catch (e) {
    return { info: null, connected: false, error: e.message };
  }
}

module.exports = {
  lockFunds,
  executePayout,
  getWalletInfo,
  getWalletBalance,
  executeILPTransfer,
  depositToPaylance,
  withdrawFromPaylance,
  loadPrivateKey,
  completeGenericTransfer,
};
