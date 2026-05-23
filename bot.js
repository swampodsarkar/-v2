require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { db } = require('./firebase');
const config = require('./config');
const userService = require('./services/userService');
const rewardService = require('./services/rewardService');
const referralService = require('./services/referralService');
const antiFakeService = require('./services/antiFakeService');
const startHandler = require('./handlers/start');
const menuHandler = require('./handlers/menu');
const taskHandlers = require('./handlers/tasks');
const withdrawHandlers = require('./handlers/withdraw');
const { referralHandler, myReferralsHandler } = require('./handlers/referral');
const bonusHandler = require('./handlers/bonus');

const bot = new Telegraf(config.BOT_TOKEN);
const app = express();

bot.use(session());

bot.start(startHandler);

bot.use(async (ctx, next) => {
  try {
    if (ctx.from) {
      await db.ref(`users/${ctx.from.id}/lastActive`).set(Date.now());
    }
  } catch (e) {}
  return next();
});

bot.command('menu', (ctx) => {
  menuHandler(ctx);
});

bot.command('help', (ctx) => {
  ctx.replyWithMarkdown(
    `━━━━━━━━━━━━━━━━━━━\n` +
    `🤖 *কামাই বিডি — হেল্প*\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `/start — রেজিস্টার ও শুরু\n` +
    `/menu — মেইন মেনু\n` +
    `/balance — ব্যালেন্স দেখুন\n` +
    `/tasks — টাস্ক সেন্টার\n` +
    `/referral — রেফারেল সিস্টেম\n` +
    `/withdraw — উইথড্র করুন\n` +
    `/bonus — ডেইলি বোনাস\n` +
    `/leaderboard — টপ লিডারবোর্ড\n` +
    `/profile — আপনার প্রোফাইল\n` +
    `/vip — ভিআইপি তথ্য\n` +
    `/help — এই হেল্প\n\n` +
    `━━━━━━━━━━━━━━━━━━━`
  );
});

bot.command('balance', async (ctx) => {
  const user = await userService.getUser(ctx.from.id);
  if (!user) return ctx.reply('❌ /start ব্যবহার করুন।');
  ctx.replyWithMarkdown(
    `━━━━━━━━━━━━━━━━━━━\n` +
    `💰 *আপনার ব্যালেন্স* 💰\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `বর্তমান ব্যালেন্স: *${user.balance}* কয়েন\n` +
    `মোট আয়: *${user.totalEarned || 0}* কয়েন\n` +
    `মোট রেফারেল: *${user.totalReferrals || 0}*\n` +
    `${user.vip ? '\n👑 *ভিআইপি মেম্বার* — ২x রিওয়ার্ড সক্রিয়!\n' : ''}\n` +
    `━━━━━━━━━━━━━━━━━━━`
  );
});

bot.command('tasks', (ctx) => taskHandlers.showTasks(ctx));
bot.command('referral', (ctx) => referralHandler(ctx));
bot.command('withdraw', (ctx) => withdrawHandlers.showWithdraw(ctx));
bot.command('bonus', (ctx) => bonusHandler(ctx));

bot.command('leaderboard', async (ctx) => {
  await showLeaderboard(ctx);
});

bot.command('profile', async (ctx) => {
  const user = await userService.getUser(ctx.from.id);
  if (!user) return ctx.reply('❌ /start ব্যবহার করুন।');
  const date = new Date(user.joinedAt).toLocaleDateString('bn-BD');
  ctx.replyWithMarkdown(
    `━━━━━━━━━━━━━━━━━━━\n` +
    `⚙️ *আপনার প্রোফাইল* ⚙️\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `🆔 *আইডি:* \`${ctx.from.id}\`\n` +
    `👤 *নাম:* ${user.firstName}\n` +
    `📛 *ইউজারনেম:* ${user.username ? '@' + user.username : 'নেই'}\n` +
    `💰 *ব্যালেন্স:* ${user.balance} কয়েন\n` +
    `📈 *মোট আয়:* ${user.totalEarned} কয়েন\n` +
    `👥 *রেফারেল:* ${user.totalReferrals}\n` +
    `📅 *জয়েন:* ${date}\n` +
    `👑 *ভিআইপি:* ${user.vip ? '✅ সক্রিয়' : '❌ নিষ্ক্রিয়'}\n` +
    `🔰 *স্ট্যাটাস:* ${user.banned ? '🚫 ব্যানড' : '✅ সক্রিয়'}\n\n` +
    `━━━━━━━━━━━━━━━━━━━`
  );
});

bot.command('vip', async (ctx) => {
  const user = await userService.getUser(ctx.from.id);
  if (!user) return ctx.reply('❌ /start ব্যবহার করুন।');
  ctx.replyWithMarkdown(
    `━━━━━━━━━━━━━━━━━━━\n` +
    `👑 *ভিআইপি মেম্বারশিপ* 👑\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `*সুবিধাসমূহ:* 🎯\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `✅ ২x রিওয়ার্ড সব টাস্কে\n` +
    `✅ কম ন্যূনতম উইথড্র (${config.VIP_MIN_WITHDRAW} কয়েন)\n` +
    `✅ দ্রুত উইথড্র প্রসেসিং\n` +
    `✅ এক্সক্লুসিভ ভিআইপি টাস্ক\n` +
    `✅ প্রাইওরিটি সাপোর্ট\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `*স্ট্যাটাস:* ${user.vip ? '✅ সক্রিয়' : '❌ সক্রিয় নয়'}\n\n` +
    `ভিআইপি হতে অ্যাডমিনের সাথে যোগাযোগ করুন! 📩`
  );
});

bot.on('text', async (ctx) => {
  if (ctx.session && ctx.session.withdrawStep === 'wallet') {
    return withdrawHandlers.processWalletInput(ctx);
  }
});

bot.action('balance', async (ctx) => {
  const user = await userService.getUser(ctx.from.id);
  if (!user) return ctx.answerCbQuery('❌ /start ব্যবহার করুন।', { show_alert: true });
  const text =
    `━━━━━━━━━━━━━━━━━━━\n` +
    `💰 *আপনার ব্যালেন্স* 💰\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `ব্যালেন্স: *${user.balance}* কয়েন\n` +
    `মোট আয়: *${user.totalEarned || 0}* কয়েন\n` +
    `রেফারেল আয়: *${(user.referrals || 0) * config.REFERRAL_REWARD}* কয়েন\n` +
    `${user.vip ? '\n👑 *ভিআইপি বোনাস:* ২x রিওয়ার্ড সক্রিয়!\n' : ''}\n\n` +
    `আরও আয় করতে টাস্ক কমপ্লিট করুন! 🚀`;
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [Markup.button.callback('📋 ট্রানজেকশন হিস্টরি', 'tx_history')],
        [Markup.button.callback('🔙 মেনুতে ফিরুন', 'back_menu')],
      ],
    },
  }).catch(() => {});
  ctx.answerCbQuery().catch(() => {});
});

bot.action('tasks', async (ctx) => {
  await taskHandlers.showTasks(ctx);
  ctx.answerCbQuery().catch(() => {});
});

bot.action('referral', async (ctx) => {
  await referralHandler(ctx);
  ctx.answerCbQuery().catch(() => {});
});

bot.action('withdraw', async (ctx) => {
  await withdrawHandlers.showWithdraw(ctx);
  ctx.answerCbQuery().catch(() => {});
});

bot.action('bonus', async (ctx) => {
  await bonusHandler(ctx);
  ctx.answerCbQuery().catch(() => {});
});

bot.action('leaderboard', async (ctx) => {
  await showLeaderboard(ctx);
  ctx.answerCbQuery().catch(() => {});
});

bot.action('vip', async (ctx) => {
  const user = await userService.getUser(ctx.from.id);
  if (!user) return ctx.answerCbQuery('❌ /start ব্যবহার করুন।', { show_alert: true });
  const text =
    `━━━━━━━━━━━━━━━━━━━\n` +
    `👑 *ভিআইপি মেম্বারশিপ* 👑\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `*সুবিধাসমূহ:* 🎯\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `✅ ২x রিওয়ার্ড সব টাস্কে\n` +
    `✅ কম ন্যূনতম উইথড্র (${config.VIP_MIN_WITHDRAW} কয়েন)\n` +
    `✅ দ্রুত উইথড্র প্রসেসিং\n` +
    `✅ এক্সক্লুসিভ ভিআইপি টাস্ক\n` +
    `✅ প্রাইওরিটি সাপোর্ট\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `*স্ট্যাটাস:* ${user.vip ? '✅ সক্রিয়' : '❌ সক্রিয় নয়'}\n\n` +
    `ভিআইপি হতে অ্যাডমিনের সাথে যোগাযোগ করুন! 📩`;
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[Markup.button.callback('🔙 মেনুতে ফিরুন', 'back_menu')]],
    },
  }).catch(() => {});
  ctx.answerCbQuery().catch(() => {});
});

bot.action('profile', async (ctx) => {
  const user = await userService.getUser(ctx.from.id);
  if (!user) return ctx.answerCbQuery('❌ /start ব্যবহার করুন।', { show_alert: true });
  const date = new Date(user.joinedAt).toLocaleDateString('bn-BD');
  const text =
    `━━━━━━━━━━━━━━━━━━━\n` +
    `⚙️ *আপনার প্রোফাইল* ⚙️\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `🆔 *আইডি:* \`${ctx.from.id}\`\n` +
    `👤 *নাম:* ${user.firstName}\n` +
    `📛 *ইউজারনেম:* ${user.username ? '@' + user.username : 'নেই'}\n` +
    `💰 *ব্যালেন্স:* ${user.balance} কয়েন\n` +
    `📈 *মোট আয়:* ${user.totalEarned} কয়েন\n` +
    `👥 *রেফারেল:* ${user.totalReferrals}\n` +
    `📅 *জয়েন:* ${date}\n` +
    `👑 *ভিআইপি:* ${user.vip ? '✅ সক্রিয়' : '❌ নিষ্ক্রিয়'}\n` +
    `🔰 *স্ট্যাটাস:* ${user.banned ? '🚫 ব্যানড' : '✅ সক্রিয়'}\n\n` +
    `━━━━━━━━━━━━━━━━━━━`;
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[Markup.button.callback('🔙 মেনুতে ফিরুন', 'back_menu')]],
    },
  }).catch(() => {});
  ctx.answerCbQuery().catch(() => {});
});

bot.action('my_referrals', async (ctx) => {
  await myReferralsHandler(ctx);
  ctx.answerCbQuery().catch(() => {});
});

bot.action('back_menu', async (ctx) => {
  menuHandler(ctx);
  ctx.answerCbQuery().catch(() => {});
});

bot.action('tx_history', async (ctx) => {
  const user = await userService.getUser(ctx.from.id);
  if (!user) return ctx.answerCbQuery('❌ কোনো হিস্টরি নেই।', { show_alert: true });
  const text =
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📋 *ট্রানজেকশন হিস্টরি* 📋\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `💰 বর্তমান ব্যালেন্স: *${user.balance}* কয়েন\n` +
    `📈 মোট আয়: *${user.totalEarned || 0}* কয়েন\n` +
    `👥 রেফারেল রিওয়ার্ড: *${(user.referrals || 0) * config.REFERRAL_REWARD}* কয়েন\n\n` +
    `_বিস্তারিত ট্রানজেকশন হিস্টরি শীগ্রই আসছে..._ 🚀\n\n` +
    `━━━━━━━━━━━━━━━━━━━`;
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[Markup.button.callback('🔙 পিছনে', 'balance')]],
    },
  }).catch(() => {});
  ctx.answerCbQuery().catch(() => {});
});

bot.action('ad_waiting', async (ctx) => {
  const user = await userService.getUser(ctx.from.id);
  if (!user || !user.adStartedAt) return ctx.answerCbQuery('⏳ প্রথমে বিজ্ঞাপন ওপেন করুন', { show_alert: true });
  const elapsed = Date.now() - user.adStartedAt;
  const waitMs = config.AD_WAIT_TIME * 1000;
  if (elapsed >= waitMs) return ctx.answerCbQuery('✅ সময় শেষ! এখন ক্লেইম বাটন ব্যবহার করুন।', { show_alert: true });
  const left = Math.ceil((waitMs - elapsed) / 1000);
  return ctx.answerCbQuery(`⏳ আরও ${left} সেকেন্ড বাকি...`, { show_alert: true });
});

bot.action('ad_claim', async (ctx) => {
  const user = await userService.getUser(ctx.from.id);
  if (!user) return ctx.answerCbQuery('❌ ইউজার পাওয়া যায়নি।', { show_alert: true });

  const now = Date.now();
  const waitMs = config.AD_WAIT_TIME * 1000;

  if (!user.adStartedAt || now - user.adStartedAt < waitMs) {
    return ctx.answerCbQuery(`⏳ এখনও সময় হয়নি! ${config.AD_WAIT_TIME} সেকেন্ড অপেক্ষা করুন।`, { show_alert: true });
  }

  const adCode = user.adCode;
  if (!adCode) {
    return ctx.answerCbQuery('❌ প্রথমে ভেরিফিকেশন পেজ খুলুন! 🖥️', { show_alert: true });
  }

  const adRef = db.ref(`adVerifications/${adCode}`);
  const adSnap = await adRef.once('value');
  const adData = adSnap.val();
  if (!adData || adData.tabClosed) {
    await userService.updateUser(ctx.from.id, { adStartedAt: null, adCode: null });
    return ctx.answerCbQuery('❌ ট্যাব বন্ধ করায় ভেরিফিকেশন ব্যর্থ!', { show_alert: true });
  }
  if (!adData.verified) {
    return ctx.answerCbQuery('⏳ পেজ থেকে ভেরিফাই করুন প্রথমে! 🖥️', { show_alert: true });
  }

  if (adData.rewardedAt) {
    await adRef.remove();
    await userService.updateUser(ctx.from.id, { adStartedAt: null, adCode: null });
    await ctx.answerCbQuery('✅ আপনি ইতিমধ্যে ব্রাউজার থেকে ক্লেইম করেছেন!', { show_alert: true });
    const updated = await userService.getUser(ctx.from.id);
    return ctx.editMessageText(
      `━━━━━━━━━━━━━━━━━━━\n✅ *বিজ্ঞাপন দেখা হয়েছে!*\n━━━━━━━━━━━━━━━━━━━\n\n💰 বর্তমান ব্যালেন্স: *${updated.balance}* কয়েন\n\nআরও এড দেখতে 🔙 বাটনে ক্লিক করুন।`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[Markup.button.callback('🔙 টাস্কে ফিরুন', 'tasks')]] } }
    ).catch(() => {});
  }

  await adRef.remove();

  const multiplier = user.vip ? 2 : 1;
  const reward = 10 * multiplier;

  const today = new Date().toDateString();
  let adCountToday = user.adCountToday || 0;
  if (user.adDate !== today) adCountToday = 0;
  adCountToday += 1;

  await userService.updateUser(ctx.from.id, {
    balance: (user.balance || 0) + reward,
    totalEarned: (user.totalEarned || 0) + reward,
    lastAd: now,
    adStartedAt: null,
    adCode: null,
    adCountToday,
    adDate: today,
  });

  await ctx.answerCbQuery(`🎥 +${reward} কয়েন!${multiplier > 1 ? ' (২x VIP)' : ''}`, { show_alert: true });

  const updated = await userService.getUser(ctx.from.id);
  await ctx.editMessageText(
    `━━━━━━━━━━━━━━━━━━━\n✅ *বিজ্ঞাপন দেখা হয়েছে!*\n━━━━━━━━━━━━━━━━━━━\n\n🎉 আপনি *+${reward} কয়েন* পেয়েছেন!\n💰 বর্তমান ব্যালেন্স: *${updated.balance}* কয়েন\n\n⏳ ${config.COOLDOWN_ADS} সেকেন্ড পর আবার দেখতে পারবেন।`,
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[Markup.button.callback('🔙 টাস্কে ফিরুন', 'tasks')]] } }
  ).catch(() => {});
});

bot.action(/^task_(.+)$/, async (ctx) => {
  await taskHandlers.handleTaskAction(ctx);
});

bot.action(/^wd_(.+)$/, async (ctx) => {
  await withdrawHandlers.handleWithdrawMethod(ctx);
});

bot.action('withdraw_history', async (ctx) => {
  await withdrawHandlers.showWithdrawHistory(ctx);
  ctx.answerCbQuery().catch(() => {});
});

async function showLeaderboard(ctx) {
  const topEarners = await userService.getTopEarners(10);
  const topReferrers = await userService.getTopReferrers(10);

  let text = `━━━━━━━━━━━━━━━━━━━\n`;
  text += `🏆 *লিডারবোর্ড* 🏆\n`;
  text += `━━━━━━━━━━━━━━━━━━━\n\n`;

  text += `🌟 *টপ আর্নার* 🌟\n`;
  text += `━━━━━━━━━━━━━━━━━━━\n`;
  topEarners.forEach((u, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ` ${i + 1}.`;
    text += `${medal} ${u.firstName} — ${u.totalEarned || 0} কয়েন\n`;
  });

  text += `\n━━━━━━━━━━━━━━━━━━━\n`;
  text += `👥 *টপ রেফারার* 👥\n`;
  text += `━━━━━━━━━━━━━━━━━━━\n`;
  topReferrers.forEach((u, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ` ${i + 1}.`;
    text += `${medal} ${u.firstName} — ${u.totalReferrals || 0} রেফারেল\n`;
  });

  text += `\n━━━━━━━━━━━━━━━━━━━`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🔄 রিফ্রেশ', 'leaderboard')],
    [Markup.button.callback('🔙 মেনুতে ফিরুন', 'back_menu')],
  ]);

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    reply_markup: keyboard.reply_markup,
  }).catch(() => {
    ctx.replyWithMarkdown(text, keyboard);
  });
}

bot.command('stats', async (ctx) => {
  if (!config.ADMIN_IDS.includes(ctx.from.id)) return ctx.reply('🚫 অনুমতি নেই।');
  const stats = await userService.getTotalStats();
  ctx.replyWithMarkdown(
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📊 *বট পরিসংখ্যান* 📊\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `👥 মোট ইউজার: *${stats.totalUsers}*\n` +
    `📈 মোট আয়: *${stats.totalEarned}* কয়েন\n` +
    `👥 মোট রেফারেল: *${stats.totalReferrals}*\n` +
    `🟢 আজ সক্রিয়: *${stats.activeToday}*\n` +
    `👑 ভিআইপি ইউজার: *${stats.vipUsers}*\n\n` +
    `━━━━━━━━━━━━━━━━━━━`
  );
});

bot.command('broadcast', async (ctx) => {
  if (!config.ADMIN_IDS.includes(ctx.from.id)) return ctx.reply('🚫 অনুমতি নেই।');
  const msg = ctx.message.text.replace(/\/broadcast\s*/i, '');
  if (!msg) return ctx.reply('⚠️ ব্যবহার: /broadcast <বার্তা>');
  const users = await userService.getAllUsers();
  let sent = 0, failed = 0;
  for (const uid of Object.keys(users)) {
    try {
      await bot.telegram.sendMessage(uid, msg, { parse_mode: 'Markdown' });
      sent++;
    } catch (e) {
      failed++;
    }
    await new Promise(r => setTimeout(r, 50));
  }
  ctx.replyWithMarkdown(
    `━━━━━━━━━━━━━━━━━━━\n` +
    `✅ *ব্রডকাস্ট সম্পন্ন!*\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `✅ পাঠানো: *${sent}*\n` +
    `❌ ব্যর্থ: *${failed}*\n\n` +
    `━━━━━━━━━━━━━━━━━━━`
  );
});

bot.command('addcoins', async (ctx) => {
  if (!config.ADMIN_IDS.includes(ctx.from.id)) return ctx.reply('🚫 অনুমতি নেই।');
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 2) return ctx.reply('⚠️ ব্যবহার: /addcoins <userId> <পরিমাণ>');
  const [targetId, amount] = [args[0], Number(args[1])];
  if (!amount || amount <= 0) return ctx.reply('⚠️ ভুল পরিমাণ।');
  const user = await userService.getUser(targetId);
  if (!user) return ctx.reply('❌ ইউজার পাওয়া যায়নি।');
  await userService.addBalance(targetId, amount);
  ctx.reply(`✅ ইউজার ${targetId} কে ${amount} কয়েন যোগ করা হয়েছে।`);
  try {
    await bot.telegram.sendMessage(targetId, `🎉 আপনি অ্যাডমিনের কাছ থেকে *+${amount}* কয়েন পেয়েছেন!`, { parse_mode: 'Markdown' });
  } catch (e) {}
});

bot.command('ban', async (ctx) => {
  if (!config.ADMIN_IDS.includes(ctx.from.id)) return ctx.reply('🚫 অনুমতি নেই।');
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 1) return ctx.reply('⚠️ ব্যবহার: /ban <userId>');
  const targetId = args[0];
  const user = await userService.getUser(targetId);
  if (!user) return ctx.reply('❌ ইউজার পাওয়া যায়নি।');
  await userService.updateUser(targetId, { banned: true });
  ctx.reply(`✅ ইউজার ${targetId} ব্যান করা হয়েছে।`);
  try {
    await bot.telegram.sendMessage(targetId, '🚫 আপনি এই বট থেকে ব্যান করা হয়েছেন।');
  } catch (e) {}
});

bot.command('unban', async (ctx) => {
  if (!config.ADMIN_IDS.includes(ctx.from.id)) return ctx.reply('🚫 অনুমতি নেই।');
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 1) return ctx.reply('⚠️ ব্যবহার: /unban <userId>');
  const targetId = args[0];
  const user = await userService.getUser(targetId);
  if (!user) return ctx.reply('❌ ইউজার পাওয়া যায়নি।');
  await userService.updateUser(targetId, { banned: false });
  ctx.reply(`✅ ইউজার ${targetId} আনব্যান করা হয়েছে।`);
});

bot.command('withdraws', async (ctx) => {
  if (!config.ADMIN_IDS.includes(ctx.from.id)) return ctx.reply('🚫 অনুমতি নেই।');
  const ref = db.ref('withdrawals');
  const snap = await ref.orderByChild('status').equalTo('pending').once('value');
  if (!snap.exists()) return ctx.reply('📭 কোনো পেন্ডিং উইথড্র নেই।');
  const wds = Object.values(snap.val()).sort((a, b) => a.createdAt - b.createdAt);
  let text = `━━━━━━━━━━━━━━━━━━━\n📋 *পেন্ডিং উইথড্র (${wds.length})*\n━━━━━━━━━━━━━━━━━━━\n\n`;
  wds.slice(0, 10).forEach((w, i) => {
    const date = new Date(w.createdAt).toLocaleDateString('bn-BD');
    text += `${i + 1}. 👤 ${w.username || 'N/A'} (${w.userId})\n`;
    text += `   💰 \`${w.amount}\` কয়েন via ${w.method.toUpperCase()}\n`;
    text += `   📝 \`${w.wallet}\`\n`;
    text += `   📅 ${date} | \`${w.id.substring(0, 8)}...\`\n\n`;
  });
  text += `━━━━━━━━━━━━━━━━━━━\n`;
  text += `/approve <id> অথবা /reject <id> ব্যবহার করুন।`;
  ctx.replyWithMarkdown(text);
});

bot.command('approve', async (ctx) => {
  if (!config.ADMIN_IDS.includes(ctx.from.id)) return ctx.reply('🚫 অনুমতি নেই।');
  const id = ctx.message.text.replace('/approve', '').trim();
  if (!id) return ctx.reply('⚠️ ব্যবহার: /approve <withdrawId>');
  const ref = db.ref('withdrawals');
  const snap = await ref.once('value');
  if (!snap.exists()) return ctx.reply('❌ পাওয়া যায়নি।');
  const entries = Object.entries(snap.val());
  const entry = entries.find(([k, v]) => k.startsWith(id) || v.id === id);
  if (!entry) return ctx.reply('❌ উইথড্র পাওয়া যায়নি।');
  const [wdKey, wd] = entry;
  await db.ref(`withdrawals/${wdKey}/status`).set('approved');
  await db.ref(`withdrawals/${wdKey}/processedAt`).set(Date.now());
  ctx.replyWithMarkdown(
    `━━━━━━━━━━━━━━━━━━━\n` +
    `✅ *উইথড্র অপ্রুভড!*\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `আইডি: \`${wdKey.substring(0, 8)}...\`\n` +
    `পরিমাণ: ${wd.amount} কয়েন\n` +
    `ইউজার: ${wd.userId}\n\n` +
    `━━━━━━━━━━━━━━━━━━━`
  );
  try {
    await bot.telegram.sendMessage(wd.userId,
      `━━━━━━━━━━━━━━━━━━━\n✅ *উইথড্র অপ্রুভড!* ✅\n━━━━━━━━━━━━━━━━━━━\n\n💰 পরিমাণ: ${wd.amount} কয়েন\n💳 মেথড: ${wd.method.toUpperCase()}\n📝 ওয়ালেট: \`${wd.wallet}\`\n\nআপনার উইথড্র সফলভাবে প্রসেস করা হয়েছে! 🎉\n━━━━━━━━━━━━━━━━━━━`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {}
});

bot.command('reject', async (ctx) => {
  if (!config.ADMIN_IDS.includes(ctx.from.id)) return ctx.reply('🚫 অনুমতি নেই।');
  const id = ctx.message.text.replace('/reject', '').trim();
  if (!id) return ctx.reply('⚠️ ব্যবহার: /reject <withdrawId>');
  const ref = db.ref('withdrawals');
  const snap = await ref.once('value');
  if (!snap.exists()) return ctx.reply('❌ পাওয়া যায়নি।');
  const entries = Object.entries(snap.val());
  const entry = entries.find(([k, v]) => k.startsWith(id) || v.id === id);
  if (!entry) return ctx.reply('❌ উইথড্র পাওয়া যায়নি।');
  const [wdKey, wd] = entry;
  await db.ref(`withdrawals/${wdKey}/status`).set('rejected');
  await db.ref(`withdrawals/${wdKey}/processedAt`).set(Date.now());
  await userService.addBalance(wd.userId, wd.amount);
  ctx.replyWithMarkdown(
    `━━━━━━━━━━━━━━━━━━━\n` +
    `❌ *উইথড্র রিজেক্টেড*\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `আইডি: \`${wdKey.substring(0, 8)}...\`\n` +
    `পরিমাণ: ${wd.amount} কয়েন\n` +
    `ইউজার: ${wd.userId}\n\n` +
    `ব্যালেন্স রিফান্ড করা হয়েছে। ✅\n` +
    `━━━━━━━━━━━━━━━━━━━`
  );
  try {
    await bot.telegram.sendMessage(wd.userId,
      `━━━━━━━━━━━━━━━━━━━\n❌ *উইথড্র রিজেক্টেড*\n━━━━━━━━━━━━━━━━━━━\n\n💰 পরিমাণ: ${wd.amount} কয়েন\n💳 মেথড: ${wd.method.toUpperCase()}\n\nআপনার উইথড্র রিজেক্ট করা হয়েছে। ব্যালেন্স রিফান্ড করা হয়েছে।\n━━━━━━━━━━━━━━━━━━━`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {}
});

bot.command('setvip', async (ctx) => {
  if (!config.ADMIN_IDS.includes(ctx.from.id)) return ctx.reply('🚫 অনুমতি নেই।');
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 1) return ctx.reply('⚠️ ব্যবহার: /setvip <userId>');
  const targetId = args[0];
  const user = await userService.getUser(targetId);
  if (!user) return ctx.reply('❌ ইউজার পাওয়া যায়নি।');
  await userService.updateUser(targetId, { vip: true, vipUntil: Date.now() + 365 * 24 * 3600 * 1000 });
  ctx.reply(`✅ ইউজার ${targetId} এখন ভিআইপি!`);
  try {
    await bot.telegram.sendMessage(targetId,
      `━━━━━━━━━━━━━━━━━━━\n👑 *অভিনন্দন!* 👑\n━━━━━━━━━━━━━━━━━━━\n\nআপনি এখন একটি *ভিআইপি মেম্বার*!\n✅ ২x রিওয়ার্ড\n✅ কম উইথড্র ন্যূনতম\n✅ এক্সক্লুসিভ টাস্ক\n━━━━━━━━━━━━━━━━━━━`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {}
});

bot.command('removevip', async (ctx) => {
  if (!config.ADMIN_IDS.includes(ctx.from.id)) return ctx.reply('🚫 অনুমতি নেই।');
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 1) return ctx.reply('⚠️ ব্যবহার: /removevip <userId>');
  const targetId = args[0];
  const user = await userService.getUser(targetId);
  if (!user) return ctx.reply('❌ ইউজার পাওয়া যায়নি।');
  await userService.updateUser(targetId, { vip: false, vipUntil: 0 });
  ctx.reply(`✅ ইউজার ${targetId} থেকে ভিআইপি সরানো হয়েছে।`);
});

bot.catch((err, ctx) => {
  console.error('Bot error:', err);
});

app.use(express.json());
app.use('/ad', express.static(path.join(__dirname, 'public')));

app.get('/ad-start/:userId', async (req, res) => {
  const userId = req.params.userId;
  const user = await userService.getUser(userId);
  if (!user) return res.status(404).send('User not found');

  const code = crypto.randomBytes(8).toString('hex');
  await userService.updateUser(userId, { adCode: code, adTabClosed: false });
  await db.ref(`adVerifications/${code}`).set({
    userId: Number(userId),
    tabClosed: false,
    verified: false,
    createdAt: Date.now(),
    heartbeat: Date.now(),
  });

  const adPageUrl = `${config.SERVER_URL}/ad/ad-view.html?uid=${userId}&code=${code}&ad=${encodeURIComponent(config.AD_LINK)}&t=${config.AD_WAIT_TIME}&bot=${config.BOT_USERNAME}`;
  res.redirect(adPageUrl);
});

app.post('/ad-heartbeat/:userId/:code', async (req, res) => {
  const { userId, code } = req.params;
  const ref = db.ref(`adVerifications/${code}`);
  const snap = await ref.once('value');
  if (!snap.exists()) return res.json({ ok: false });
  const data = snap.val();
  if (String(data.userId) !== String(userId)) return res.json({ ok: false });
  if (data.tabClosed) return res.json({ ok: false, tabClosed: true });
  await ref.update({ heartbeat: Date.now() });
  res.json({ ok: true });
});

app.post('/ad-close/:userId/:code', async (req, res) => {
  const { userId, code } = req.params;
  const ref = db.ref(`adVerifications/${code}`);
  const snap = await ref.once('value');
  if (!snap.exists()) return res.json({ ok: false });
  const data = snap.val();
  if (String(data.userId) !== String(userId)) return res.json({ ok: false });
  await ref.update({ tabClosed: true, closedAt: Date.now() });
  await userService.updateUser(userId, { adTabClosed: true });
  res.json({ ok: true });
});

app.post('/ad-verify/:userId/:code', async (req, res) => {
  const { userId, code } = req.params;
  const ref = db.ref(`adVerifications/${code}`);
  const snap = await ref.once('value');
  if (!snap.exists()) return res.json({ success: false, reason: 'Invalid code' });
  const data = snap.val();
  if (String(data.userId) !== String(userId)) return res.json({ success: false, reason: 'User mismatch' });
  if (data.tabClosed) return res.json({ success: false, reason: 'Tab was closed' });
  if (data.rewardedAt) return res.json({ success: true, reward: data.rewardAmount || 10, vip: data.wasVip || false, alreadyClaimed: true });

  const uid = Number(userId);
  const user = await userService.getUser(uid);
  if (!user) return res.json({ success: false, reason: 'User not found' });

  const multiplier = user.vip ? 2 : 1;
  const reward = 10 * multiplier;

  const today = new Date().toDateString();
  let adCountToday = user.adCountToday || 0;
  if (user.adDate !== today) adCountToday = 0;
  adCountToday += 1;

  await userService.updateUser(uid, {
    balance: (user.balance || 0) + reward,
    totalEarned: (user.totalEarned || 0) + reward,
    lastAd: Date.now(),
    adStartedAt: null,
    adCode: null,
    adTabClosed: null,
    adCountToday,
    adDate: today,
  });

  await ref.update({ verified: true, verifiedAt: Date.now(), rewardedAt: Date.now(), rewardAmount: reward, wasVip: multiplier > 1 });

  if (user.adMsgId && user.adChatId) {
    try {
      await bot.telegram.editMessageText(user.adChatId, user.adMsgId, null,
        `━━━━━━━━━━━━━━━━━━━\n✅ *বিজ্ঞাপন দেখা সম্পন্ন!* ✅\n━━━━━━━━━━━━━━━━━━━\n\n🎉 আপনি *+${reward} কয়েন* পেয়েছেন!\n💰 বর্তমান ব্যালেন্স: *${(user.balance || 0) + reward}* কয়েন\n\nআরও এড দেখতে টাস্ক সেন্টারে যান।`,
        { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[Markup.button.callback('🔙 টাস্কে ফিরুন', 'tasks')]] } }
      );
    } catch (e) {}
  }

  res.json({ success: true, reward, vip: multiplier > 1 });
});

const PORT = config.PORT;
app.get('/', (req, res) => res.send('🤖 কামাই বিডি বট চলছে!'));

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📺 Ad verification page: ${config.SERVER_URL}/ad/ad-view.html`);
});

bot.launch().then(() => {
  console.log('🤖 কামাই বিডি বট চলছে!');
}).catch((err) => {
  console.error('Failed to launch bot:', err);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = { bot, app };
