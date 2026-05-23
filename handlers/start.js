const { Markup } = require('telegraf');
const userService = require('../services/userService');
const { db } = require('../firebase');

async function startHandler(ctx) {
  try {
    const payload = ctx.startPayload;

    if (payload && payload.startsWith('ad_done_')) {
      const code = payload.replace('ad_done_', '');
      const ref = db.ref(`adVerifications/${code}`);
      const snap = await ref.once('value');
      if (snap.exists()) {
        const data = snap.val();
        if (String(data.userId) === String(ctx.from.id) && data.verified) {
          await ref.remove();
        }
      }
      await userService.findOrCreate({ ...ctx, startPayload: null });
      await ctx.replyWithMarkdown(
        `━━━━━━━━━━━━━━━━━━━\n✅ *বিজ্ঞাপন দেখা সম্পন্ন!* ✅\n━━━━━━━━━━━━━━━━━━━\n\nআপনার কয়েন অ্যাড হয়েছে! 🎉\nআরও আয় করতে /menu দিন।`,
        Markup.inlineKeyboard([Markup.button.callback('📋 মেনু খুলুন', 'back_menu')])
      );
      return;
    }

    const user = await userService.findOrCreate(ctx);

    const welcomeText = `🌟 *কামাই বিডি — Airdrop Bot* 🌟

━━━━━━━━━━━━━━━━━━━
🎉 *সুস্বাগতম!* 🎉
━━━━━━━━━━━━━━━━━━━

🔥 টাস্ক সম্পূর্ণ করুন, বন্ধুদের ইনভাইট করুন
এবং রিয়েল রিওয়ার্ড অর্জন করুন!

━━━━━━━━━━━━━━━━━━━
📌 *ইউজার:* ${ctx.from.username ? '@' + ctx.from.username : '`' + ctx.from.id + '`'}
💰 *ব্যালেন্স:* \`${user.balance || 0} coins\`
━━━━━━━━━━━━━━━━━━━

⚡ *কমান্ড লিখে শুরু করুন:*
🔹 /menu — ইয়ার্নিং প্যানেল খুলুন
🔹 /tasks — টাস্ক দেখুন
🔹 /bonus — ডেইলি বোনাস নিন

_রিওয়ার্ড সংগ্রহ করতে এখনি /menu লিখুন!_ 🚀`;

    await ctx.replyWithMarkdown(welcomeText);
  } catch (err) {
    console.error('Start handler error:', err);
    await ctx.reply('❌ একটি ত্রুটি হয়েছে। দয়া করে /start দিন।');
  }
}

module.exports = startHandler;
