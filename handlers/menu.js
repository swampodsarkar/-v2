const { Markup } = require('telegraf');

function menuHandler(ctx) {
  const menuText = `━━━━━━━━━━━━━━━━━━━
🌟 *কামাই বিডি — Main Menu* 🌟
━━━━━━━━━━━━━━━━━━━

⬇️ *নিচের অপশন থেকে বেছে নিন:* ⬇️`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('💰 ব্যালেন্স', 'balance'),
      Markup.button.callback('🎯 টাস্ক', 'tasks'),
    ],
    [
      Markup.button.callback('👥 রেফারেল', 'referral'),
      Markup.button.callback('💳 উইথড্র', 'withdraw'),
    ],
    [
      Markup.button.callback('🎁 ডেইলি বোনাস', 'bonus'),
      Markup.button.callback('🏆 লিডারবোর্ড', 'leaderboard'),
    ],
    [
      Markup.button.callback('👑 ভিআইপি', 'vip'),
      Markup.button.callback('⚙️ প্রোফাইল', 'profile'),
    ],
  ]);

  ctx.replyWithMarkdown(menuText, keyboard);
}

module.exports = menuHandler;
