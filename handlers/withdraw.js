const { Markup } = require('telegraf');
const { db } = require('../firebase');
const userService = require('../services/userService');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

const withdrawHandlers = {
  async showWithdraw(ctx) {
    const user = await userService.getUser(ctx.from.id);
    if (!user) return ctx.reply('❌ দয়া করে /start ব্যবহার করুন।');

    const minWd = user.vip ? config.VIP_MIN_WITHDRAW : config.MIN_WITHDRAW;
    const withdrawable = Math.max(0, (user.balance || 0));

    const text = `━━━━━━━━━━━━━━━━━━━
💳 *উইথড্র সেন্টার* 💳
━━━━━━━━━━━━━━━━━━━

💰 *ব্যালেন্স:* \`${user.balance}\` কয়েন
📊 *উইথড্রযোগ্য:* \`${withdrawable}\` কয়েন
⚠️ *সর্বনিম্ন উইথড্র:* \`${minWd}\` কয়েন
${user.vip ? '👑 *ভিআইপি:* কম ন্যূনতম ও দ্রুত প্রসেসিং!' : ''}

━━━━━━━━━━━━━━━━━━━
💳 *পেমেন্ট মেথড সিলেক্ট করুন:*`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔶 Binance USDT', 'wd_binance')],
      [Markup.button.callback('💧 FaucetPay', 'wd_faucetpay')],
      [Markup.button.callback('💳 Payeer', 'wd_payeer')],
      [Markup.button.callback('🏦 bKash (বিকাশ)', 'wd_bkash')],
      [Markup.button.callback('📋 হিস্টরি', 'withdraw_history')],
      [Markup.button.callback('🔙 মেনুতে ফিরুন', 'back_menu')],
    ]);

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard.reply_markup,
    }).catch(() => {
      ctx.replyWithMarkdown(text, keyboard);
    });
  },

  async handleWithdrawMethod(ctx) {
    const method = ctx.match[1];
    const user = await userService.getUser(ctx.from.id);
    if (!user) return ctx.answerCbQuery('❌ দয়া করে /start ব্যবহার করুন।', { show_alert: true });
    if (user.banned) return ctx.answerCbQuery('🚫 আপনি ব্যান করা হয়েছেন।', { show_alert: true });

    const minWd = user.vip ? config.VIP_MIN_WITHDRAW : config.MIN_WITHDRAW;
    const withdrawable = user.balance || 0;

    if (withdrawable < minWd) {
      return ctx.answerCbQuery(`⚠️ সর্বনিম্ন উইথড্র: ${minWd} কয়েন। আপনার ব্যালেন্স: ${withdrawable}`, { show_alert: true });
    }

    ctx.session = ctx.session || {};
    ctx.session.withdrawMethod = method;
    ctx.session.withdrawStep = 'wallet';

    const methodNames = { binance: '🔶 Binance USDT', faucetpay: '💧 FaucetPay', payeer: '💳 Payeer', bkash: '🏦 bKash' };
    const name = methodNames[method] || method;

    await ctx.editMessageText(
      `━━━━━━━━━━━━━━━━━━━\n💳 *উইথড্র via ${name}*\n━━━━━━━━━━━━━━━━━━━\n\n💰 ব্যালেন্স: \`${withdrawable}\` কয়েন\n⚠️ ন্যূনতম: \`${minWd}\` কয়েন\n\n━━━━━━━━━━━━━━━━━━━\n📝 *আপনার ${name} ওয়ালেট ঠিকানা লিখুন:*\n━━━━━━━━━━━━━━━━━━━\n\nনিচে মেসেজ আকারে ওয়ালেট ঠিকানা পাঠান।`,
      { parse_mode: 'Markdown' }
    ).catch(() => {});

    ctx.answerCbQuery().catch(() => {});
  },

  async processWalletInput(ctx) {
    if (!ctx.session || !ctx.session.withdrawMethod) return;

    const wallet = ctx.message.text.trim();
    const user = await userService.getUser(ctx.from.id);
    if (!user) return;

    const method = ctx.session.withdrawMethod;
    const minWd = user.vip ? config.VIP_MIN_WITHDRAW : config.MIN_WITHDRAW;
    const amount = Math.min(user.balance || 0, 1000);

    if ((user.balance || 0) < minWd) {
      delete ctx.session.withdrawStep;
      delete ctx.session.withdrawMethod;
      return ctx.reply(`⚠️ পর্যাপ্ত ব্যালেন্স নেই। ন্যূনতম: ${minWd} কয়েন।`);
    }

    const wdId = uuidv4();
    const withdrawData = {
      id: wdId,
      userId: ctx.from.id,
      username: ctx.from.username || '',
      amount: amount,
      method: method,
      wallet: wallet,
      status: 'pending',
      createdAt: Date.now(),
      processedAt: null,
    };

    await db.ref(`withdrawals/${wdId}`).set(withdrawData);
    await userService.updateUser(ctx.from.id, { balance: (user.balance || 0) - amount });

    delete ctx.session.withdrawStep;
    delete ctx.session.withdrawMethod;

    const methodNames = { binance: 'Binance USDT', faucetpay: 'FaucetPay', payeer: 'Payeer', bkash: 'bKash' };
    const name = methodNames[method] || method;

    await ctx.replyWithMarkdown(
      `━━━━━━━━━━━━━━━━━━━\n✅ *উইথড্রাল সাবমিটেড!* ✅\n━━━━━━━━━━━━━━━━━━━\n\n📌 *আইডি:* \`${wdId.substring(0, 8)}...\`\n💳 *মেথড:* ${name}\n📝 *ওয়ালেট:* \`${wallet.substring(0, 12)}...\`\n💰 *পরিমাণ:* ${amount} কয়েন\n⏳ *স্ট্যাটাস:* পেন্ডিং\n\n━━━━━━━━━━━━━━━━━━━\n⏰ ২৪-৪৮ ঘন্টার মধ্যে প্রসেস করা হবে।\n━━━━━━━━━━━━━━━━━━━`
    );
  },

  async showWithdrawHistory(ctx) {
    const ref = db.ref('withdrawals');
    const snap = await ref.orderByChild('userId').equalTo(ctx.from.id).once('value');
    if (!snap.exists()) {
      return ctx.reply('📭 কোনো উইথড্র হিস্টরি পাওয়া যায়নি।');
    }

    const wds = Object.values(snap.val()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
    let text = `━━━━━━━━━━━━━━━━━━━\n📋 *উইথড্র হিস্টরি*\n━━━━━━━━━━━━━━━━━━━\n\n`;
    const statusEmoji = { pending: '⏳', approved: '✅', rejected: '❌' };
    const statusText = { pending: 'পেন্ডিং', approved: 'অপ্রুভড', rejected: 'রিজেক্টেড' };

    wds.forEach((w, i) => {
      const date = new Date(w.createdAt).toLocaleDateString('bn-BD');
      text += `${statusEmoji[w.status] || '❓'} *${w.amount}* কয়েন — ${w.method.toUpperCase()}\n`;
      text += `   📅 ${date} | ${statusText[w.status] || w.status}\n\n`;
    });

    ctx.replyWithMarkdown(text);
  },
};

module.exports = withdrawHandlers;
