// backend/utils/telegramListener.js
require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const readline = require('readline');
const RechargeRequest = require('../models/rechargeRequest');
const User = require('../models/user');
const Transaction = require('../models/transaction');
const Payment = require('../models/payment');

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

const POLL_INTERVAL_MS = 15 * 1000;

// ---------- Parser ----------
const parseTransactionMessage = (text) => {
  const clean = text.replace(/[`*_~]/g, '');

  const transactionIdMatch = clean.match(/Transaction\s*ID:?\s*([A-Z0-9]+)\b/i);
  if (!transactionIdMatch) return null;

  const amountMatch = clean.match(/Amount:?\s*Tk\s*([\d,]+\.?\d*)/i);
  const fromMatch = clean.match(/From:?\s*(\d{11})/i);
  const serviceMatch = clean.match(/(bKash|Nagad|Rocket)/i);
  const timeMatch = clean.match(/Time:?\s*(.+)/i);

  return {
    transactionId: transactionIdMatch[1].trim(),
    amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null,
    fromNumber: fromMatch ? fromMatch[1] : null,
    service: serviceMatch ? serviceMatch[1].toLowerCase() : null,
    time: timeMatch ? timeMatch[1].trim() : new Date().toISOString(),
  };
};

// ---------- Save incoming payment ----------
const savePayment = async (parsed) => {
  // Avoid duplicates if the same message somehow arrives twice
  const existing = await Payment.findOne({ transactionId: parsed.transactionId });
  if (existing) {
    console.log(`⚠️ Duplicate payment received, skipping save: ${parsed.transactionId}`);
    return;
  }

  await Payment.create({
    method: parsed.service,
    amount: parsed.amount,
    from: parsed.fromNumber,
    transactionId: parsed.transactionId,
    time: parsed.time,
    isProcessed: false,
  });

  console.log(`💾 Payment saved to DB: ${parsed.transactionId}`);
};

// ---------- Poll & process ----------
const processPendingPayments = async () => {
  try {
    const payments = await Payment.find({ isProcessed: false }).sort({ createdAt: 1 });

    if (payments.length === 0) return;

    console.log(`🔄 Polling — found ${payments.length} unprocessed payment(s)`);

    for (const payment of payments) {
      
      const request = await RechargeRequest.findOne({
        transactionId: payment.transactionId,
        status: 'pending',
      });

      if (!request) {
        console.log(`⏳ No matching request yet for TXID: ${payment.transactionId}`);
        continue; // leave it for next poll
      }

      // Validate mobile number
      if (payment.from && request.mobileNumber !== payment.from) {
        console.log(`❌ Mobile mismatch for TXID: ${payment.transactionId}`);
        request.status = 'rejected';
        request.adminNote = `Auto-rejected: Mobile mismatch (payment said ${payment.from})`;
        await request.save();
        await Payment.deleteOne({ _id: payment._id });
        continue;
      }

      // Validate amount
      if (payment.amount && Math.abs(request.amount - payment.amount) > 1) {
        console.log(`❌ Amount mismatch for TXID: ${payment.transactionId}`);
        request.status = 'rejected';
        request.adminNote = `Auto-rejected: Amount mismatch (payment said ${payment.amount})`;
        await request.save();
        await Payment.deleteOne({ _id: payment._id });
        continue;
      }

      // Validate user
      const user = await User.findById(request.user);
      if (!user) {
        console.log(`❌ User not found for request: ${request._id}`);
        await Payment.deleteOne({ _id: payment._id });
        continue;
      }

      // Validate credit limit
      const maxCredit = Number(process.env.MAX_CREDIT) || 2000;
      const newCredits = user.credits + request.amount;
      if (newCredits > maxCredit) {
        request.status = 'rejected';
        request.adminNote = `Auto-rejected: Credit limit would exceed ${maxCredit}`;
        await request.save();
        await Payment.deleteOne({ _id: payment._id });
        continue;
      }

      // All checks passed — approve
      user.credits = newCredits;
      await user.save();

      await Transaction.create({
        user: user._id,
        amount: request.amount,
        type: 'credit',
        reason: `Auto-approved via Telegram listener - ${request.transactionId}`,
      });

      request.status = 'approved';
      request.adminNote = `Auto-approved`;
      request.processedAt = new Date();
      await request.save();

      await Payment.deleteOne({ _id: payment._id });

      console.log(`✅ Approved ${request.amount} credits for user: ${user.username} | TXID: ${payment.transactionId}`);
    }
  } catch (err) {
    console.error('❌ Poll processor error:', err);
  }
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

  // Listen and save only — no processing here
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
      await savePayment(parsed);
    },
    new NewMessage({ chats: [chatId] })
  );

  // Start poll loop
  console.log(`⏱️ Poll processor started — runs every ${POLL_INTERVAL_MS / 1000}s`);
  setInterval(processPendingPayments, POLL_INTERVAL_MS);

  console.log('🚀 Waiting for new messages...');
};

module.exports = { startTelegramListener };