// backend/utils/telegramListener.js
require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const readline = require('readline');
const RechargeRequest = require('../models/rechargeRequest');
const User = require('../models/user');
const Transaction = require('../models/transaction');

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const phoneNumber = process.env.TELEGRAM_PHONE_NUMBER;
const chatId = process.env.TELEGRAM_CHAT_ID;

let session = process.env.TELEGRAM_SESSION_STRING
  ? new StringSession(process.env.TELEGRAM_SESSION_STRING)
  : new StringSession('');

if (!apiId || !apiHash || !phoneNumber || !chatId) {
  console.error('Missing required env vars');
  process.exit(1);
}

// ---------- Retry config ----------
const RETRY_INTERVAL_MS = 15 * 1000;   // check every 15 seconds
const RETRY_MAX_DURATION_MS = 10 * 60 * 1000; // keep retrying for 10 minutes

// Holds pending retries: transactionId -> { parsed, firstSeenAt, timer }
const retryQueue = new Map();

// ---------- Parser ----------
const parseTransactionMessage = (text) => {
  // Strip markdown: backticks, asterisks, underscores, tildes
  const clean = text.replace(/[`*_~]/g, '');

  // Tightened regex — word boundary \b stops capturing trailing letters like 'i'
  const transactionIdMatch = clean.match(/Transaction\s*ID:?\s*([A-Z0-9]+)\b/i);
  if (!transactionIdMatch) return null;

  const amountMatch = clean.match(/Amount:?\s*Tk\s*([\d,]+\.?\d*)/i);
  const fromMatch = clean.match(/From:?\s*(\d{11})/i);
  const serviceMatch = clean.match(/(bKash|Nagad|Rocket)/i);

  return {
    transactionId: transactionIdMatch[1].trim(),
    amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null,
    fromNumber: fromMatch ? fromMatch[1] : null,
    service: serviceMatch ? serviceMatch[1].toLowerCase() : null,
  };
};

// ---------- Auto-approval ----------
const autoApproveRequest = async (transactionId, fromNumber, amount) => {
  try {
    const request = await RechargeRequest.findOne({ transactionId, status: 'pending' });

    if (!request) {
      return 'not_found'; // signal to retry
    }

    if (fromNumber && request.mobileNumber !== fromNumber) {
      console.log(`❌ Mobile mismatch: expected ${request.mobileNumber}, got ${fromNumber}`);
      request.status = 'rejected';
      request.adminNote = `Auto-rejected: Mobile mismatch (SMS said ${fromNumber})`;
      await request.save();
      return 'rejected';
    }

    if (amount && Math.abs(request.amount - amount) > 1) {
      console.log(`❌ Amount mismatch: expected ${request.amount}, got ${amount}`);
      request.status = 'rejected';
      request.adminNote = `Auto-rejected: Amount mismatch (SMS said ${amount})`;
      await request.save();
      return 'rejected';
    }

    const user = await User.findById(request.user);
    if (!user) return 'rejected';

    const maxCredit = Number(process.env.MAX_CREDIT) || 2000;
    const newCredits = user.credits + request.amount;
    if (newCredits > maxCredit) {
      request.status = 'rejected';
      request.adminNote = `Auto-rejected: Credit limit would exceed ${maxCredit}`;
      await request.save();
      return 'rejected';
    }

    user.credits = newCredits;
    await user.save();

    await Transaction.create({
      user: user._id,
      amount: request.amount,
      type: 'credit',
      reason: `Auto-approved via Telegram listener - ${request.transactionId}`,
    });

    request.status = 'approved';
    request.adminNote = `Auto-approved by Telegram listener (Chat ID: ${chatId})`;
    request.processedAt = new Date();
    await request.save();

    console.log(`✅ Auto-approved ${request.amount} credits for user: ${user.username}`);
    return 'approved';
  } catch (error) {
    console.error('Auto-approval error:', error);
    return 'error';
  }
};

// ---------- Retry queue ----------
const scheduleRetry = (parsed) => {
  const { transactionId } = parsed;

  // Already queued — don't double-queue
  if (retryQueue.has(transactionId)) return;

  const firstSeenAt = Date.now();
  console.log(`🕐 Queuing retry for TXID: ${transactionId} (will retry every ${RETRY_INTERVAL_MS / 1000}s for up to ${RETRY_MAX_DURATION_MS / 60000} mins)`);

  const attempt = async () => {
    const elapsed = Date.now() - firstSeenAt;

    if (elapsed > RETRY_MAX_DURATION_MS) {
      console.log(`⏰ Retry timeout reached for TXID: ${transactionId} — giving up.`);
      retryQueue.delete(transactionId);
      return;
    }

    console.log(`🔄 Retrying TXID: ${transactionId} (${Math.round(elapsed / 1000)}s elapsed)`);
    const result = await autoApproveRequest(parsed.transactionId, parsed.fromNumber, parsed.amount);

    if (result === 'not_found') {
      // Still not submitted — schedule next retry
      const timer = setTimeout(attempt, RETRY_INTERVAL_MS);
      retryQueue.set(transactionId, { parsed, firstSeenAt, timer });
    } else {
      // Approved, rejected, or error — stop retrying
      retryQueue.delete(transactionId);
    }
  };

  // First retry after one interval
  const timer = setTimeout(attempt, RETRY_INTERVAL_MS);
  retryQueue.set(transactionId, { parsed, firstSeenAt, timer });
};

// ---------- Main listener ----------
const startTelegramListener = async () => {
  const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });

  await client.start({
    phoneNumber: async () => phoneNumber,
    phoneCode: async () =>
      new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question('Please enter the code you received: ', (code) => {
          rl.close();
          resolve(code);
        });
      }),
    onError: (err) => console.error('Login error:', err),
  });

  console.log('✅ Logged in as user!');

  const savedSession = client.session.save();
  if (!process.env.TELEGRAM_SESSION_STRING) {
    console.log('💾 Copy this session string into .env as TELEGRAM_SESSION_STRING:\n', savedSession);
  }

  try {
    const group = await client.getEntity(chatId);
    console.log(`👂 Listening to group: ${group.title || 'unnamed'}`);
  } catch (e) {
    console.warn('⚠️ Could not resolve group name, continuing anyway:', e.message);
  }

  client.addEventHandler(
    async (event) => {
      const message = event.message;
      if (!message || !message.text) return;

      const messageText = message.text;
      console.log(`📨 New message: ${messageText.substring(0, 120)}`);

      const parsed = parseTransactionMessage(messageText);
      if (!parsed) {
        console.log('⚠️ Not a recharge notification, skipping.');
        return;
      }

      console.log('✅ Parsed transaction:', parsed);

      // Try immediately first
      const result = await autoApproveRequest(parsed.transactionId, parsed.fromNumber, parsed.amount);

      if (result === 'not_found') {
        // User hasn't submitted the request yet — queue retries
        scheduleRetry(parsed);
      }
    },
    new NewMessage({ chats: [chatId] })
  );

  console.log('🚀 Waiting for new messages...');
};

module.exports = { startTelegramListener };