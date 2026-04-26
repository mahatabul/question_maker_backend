const TelegramBot = require('node-telegram-bot-api');
const RechargeRequest = require('../models/rechargeRequest');
const User = require('../models/user');
const Transaction = require('../models/transaction');

// Initialize bot with your bot token
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Helper function to parse message and extract data
const parseTransactionMessage = (text) => {
  // Example message format:
  // 💸 bKash — Money Received
  // 💵 Amount: Tk 1,500.00
  // 📱 From: 01711123456
  // 🔖 Transaction ID: 8T3ABC12345
  // 🕐 Time: 25-04-2026 14:32

  const transactionIdMatch = text.match(/Transaction ID:?\s*([A-Z0-9]+)/i);
  const amountMatch = text.match(/Amount:?\s*Tk\s*([\d,]+\.?\d*)/i);
  const fromMatch = text.match(/From:?\s*(\d{11})/i);
  const serviceMatch = text.match(/(bKash|Nagad|Rocket)/i);

  if (!transactionIdMatch) return null;

  return {
    transactionId: transactionIdMatch[1].trim(),
    amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null,
    fromNumber: fromMatch ? fromMatch[1] : null,
    service: serviceMatch ? serviceMatch[1].toLowerCase() : null,
  };
};

// Auto-approve function (reuses logic from controller)
const autoApproveRequest = async (transactionId, fromNumber, amount) => {
  try {
    // Find pending request with matching transaction ID
    const request = await RechargeRequest.findOne({ 
      transactionId: transactionId,
      status: 'pending'
    });

    if (!request) {
      console.log(`No pending request found for TXID: ${transactionId}`);
      return false;
    }

    // Optional: Verify mobile number (if fromNumber available)
    if (fromNumber && request.mobileNumber !== fromNumber) {
      console.log(`Mobile number mismatch: expected ${request.mobileNumber}, got ${fromNumber}`);
      // Could also reject request automatically
      request.status = 'rejected';
      request.adminNote = `Auto-rejected: Mobile number mismatch (SMS said ${fromNumber})`;
      await request.save();
      return false;
    }

    // Optional: Verify amount (if amount available)
    if (amount && Math.abs(request.amount - amount) > 1) {
      console.log(`Amount mismatch: expected ${request.amount}, got ${amount}`);
      request.status = 'rejected';
      request.adminNote = `Auto-rejected: Amount mismatch (SMS said ${amount})`;
      await request.save();
      return false;
    }

    // Apply credit limit check
    const user = await User.findById(request.user);
    if (!user) return false;

    const maxCredit = Number(process.env.MAX_CREDIT) || 2000;
    const newCredits = user.credits + request.amount;
    if (newCredits > maxCredit) {
      request.status = 'rejected';
      request.adminNote = `Auto-rejected: Credit limit would exceed ${maxCredit}`;
      await request.save();
      return false;
    }

    // Update user credits
    user.credits = newCredits;
    await user.save();

    // Create transaction record
    await Transaction.create({
      user: user._id,
      amount: request.amount,
      type: 'credit',
      reason: `Auto-approved via Telegram bot - ${request.transactionId}`,
    });

    // Update request status
    request.status = 'approved';
    request.adminNote = `Auto-approved by Telegram bot from ${request.paymentMethod} SMS`;
    request.processedAt = new Date();
    await request.save();

    console.log(`✅ Auto-approved recharge request ${request._id} for ${user.username}`);
    return true;
  } catch (error) {
    console.error('Auto-approval error:', error);
    return false;
  }
};

// Start listening for messages
const startTelegramListener = () => {
  console.log('Telegram bot listener started...');

  bot.on('message', async (msg) => {
    // Only process messages from the configured chat/channel
    const allowedChatId = process.env.TELEGRAM_CHAT_ID;
    if (allowedChatId && msg.chat.id.toString() !== allowedChatId) {
      return; // Ignore messages from other chats
    }

    const text = msg.text;
    if (!text) return;

    const parsed = parseTransactionMessage(text);
    if (!parsed) return;

    console.log('Parsed Telegram message:', parsed);

    await autoApproveRequest(parsed.transactionId, parsed.fromNumber, parsed.amount);
  });

  // Handle polling errors
  bot.on('polling_error', (error) => {
    console.error('Telegram polling error:', error);
  });
};

module.exports = { startTelegramListener };