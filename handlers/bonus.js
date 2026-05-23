const { Markup } = require('telegraf');
const rewardService = require('../services/rewardService');

async function bonusHandler(ctx) {
  const result = await rewardService.claimDaily(ctx.from.id);

  if (!result.success) {
    if (result.reason === 'cooldown') {
      const hours = Math.floor(result.remaining / 3600000);
      const mins = Math.floor((result.remaining % 3600000) / 60000);
      const text = `━━━━━━━━━━━━━━━━━━━
⏳ *ডেইলি বোনাস* ⏳
━━━━━━━━━━━━━━━━━━━

আপনি ইতিমধ্যে আজকের বোনাস নিয়ে নিয়েছেন! 😊

━━━━━━━━━━━━━━━━━━━
*পরবর্তী বোনাস:* \`${hours}ঘ ${mins}মি\`
━━━━━━━━━━━━━━━━━━━

⏰ ফিরে আসুন এবং আবার ক্লেইম করুন!`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 মেনুতে ফিরুন', 'back_menu')],
      ]);

      return await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard.reply_markup,
      }).catch(() => {
        ctx.replyWithMarkdown(text, keyboard);
      });
    }
    return ctx.reply('❌ ' + result.reason);
  }

  const text = `━━━━━━━━━━━━━━━━━━━
🎁 *ডেইলি বোনাস ক্লেইমড!* 🎁
━━━━━━━━━━━━━━━━━━━

✅ আপনি *+${result.reward} কয়েন* পেয়েছেন${result.multiplier > 1 ? ' (২x ভিআইপি বোনাস!) 🎉' : ''}!

━━━━━━━━━━━━━━━━━━━
⏳ *পরবর্তী বোনাস:* ২৪ ঘন্টা পর
━━━━━━━━━━━━━━━━━━━

🚀 আরও আয় করতে টাস্ক কমপ্লিট করুন! 💪`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🎯 টাস্ক দেখুন', 'tasks')],
    [Markup.button.callback('🔙 মেনুতে ফিরুন', 'back_menu')],
  ]);

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    reply_markup: keyboard.reply_markup,
  }).catch(() => {
    ctx.replyWithMarkdown(text, keyboard);
  });
}

module.exports = bonusHandler;
