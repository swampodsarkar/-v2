const { Markup } = require('telegraf');
const referralService = require('../services/referralService');
const config = require('../config');

async function referralHandler(ctx) {
  const stats = await referralService.getReferralStats(ctx.from.id);
  const history = await referralService.getReferralHistory(ctx.from.id);

  const text = `━━━━━━━━━━━━━━━━━━━
👥 *রেফারেল প্রোগ্রাম* 👥
━━━━━━━━━━━━━━━━━━━

🔗 *আপনার রেফারেল লিংক:*
\`${stats.link}\`

━━━━━━━━━━━━━━━━━━━
📊 *পরিসংখ্যান*
━━━━━━━━━━━━━━━━━━━
👤 মোট রেফারেল: *${stats.total}*
💰 মোট আয়: *${stats.earnings}* কয়েন
🎁 প্রতি রেফারেলে: *${config.REFERRAL_REWARD}* কয়েন
👑 ভিআইপি বোনাস: *২x*

━━━━━━━━━━━━━━━━━━━
📌 *কিভাবে কাজ করে:*
━━━━━━━━━━━━━━━━━━━
১️⃣ আপনার রেফারেল লিংক শেয়ার করুন
২️⃣ বন্ধু আপনার লিংক থেকে জয়েন করবে
৩️⃣ আপনি instantly ${config.REFERRAL_REWARD} কয়েন পাবেন!

${history.length > 0 ? `\n━━━━━━━━━━━━━━━━━━━\n📋 *সাম্প্রতিক রেফারেল:*\n${history.slice(0, 5).map((r, i) => `👤 ${i+1}. ${r.firstName} ${r.username ? '@' + r.username : ''}`).join('\n')}` : '\n📭 *এখনো কোনো রেফারেল নেই*\nলিংক শেয়ার করুন এবং আয় শুরু করুন!'}`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📋 আমার রেফারেল', 'my_referrals')],
    [Markup.button.callback('🔙 মেনুতে ফিরুন', 'back_menu')],
  ]);

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    reply_markup: keyboard.reply_markup,
  }).catch(() => {
    ctx.replyWithMarkdown(text, keyboard);
  });
}

async function myReferralsHandler(ctx) {
  const history = await referralService.getReferralHistory(ctx.from.id);

  if (history.length === 0) {
    return ctx.answerCbQuery('📭 এখনো কোনো রেফারেল নেই। আপনার লিংক শেয়ার করুন!', { show_alert: true });
  }

  let text = `━━━━━━━━━━━━━━━━━━━\n📋 *আমার রেফারেল (${history.length})*\n━━━━━━━━━━━━━━━━━━━\n\n`;
  history.slice(0, 20).forEach((r, i) => {
    const date = new Date(r.joinedAt).toLocaleDateString('bn-BD');
    text += `👤 *${i + 1}.* ${r.firstName} ${r.username ? '@' + r.username : ''}\n`;
    text += `   📅 জয়েন: ${date}\n\n`;
  });

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🔙 রেফারেলে ফিরুন', 'referral')],
  ]);

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    reply_markup: keyboard.reply_markup,
  }).catch(() => {});
}

module.exports = { referralHandler, myReferralsHandler };
