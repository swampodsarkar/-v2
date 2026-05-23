const { Markup } = require('telegraf');
const userService = require('../services/userService');
const rewardService = require('../services/rewardService');
const config = require('../config');

function getTodayDate() {
  return new Date().toDateString();
}

function getAdLabel(user) {
  const today = getTodayDate();
  let count = user.adCountToday || 0;
  if (user.adDate !== today) count = 0;
  const remaining = config.MAX_ADS_PER_DAY - count;
  if (remaining <= 0) return '✅ ২০/২০ দেখা হয়েছে';
  return `🎥 বিজ্ঞাপন দেখুন (${count}/${config.MAX_ADS_PER_DAY})`;
}

const taskHandlers = {
  async showTasks(ctx) {
    const user = await userService.getUser(ctx.from.id);
    if (!user) return ctx.reply('❌ দয়া করে /start ব্যবহার করুন।');

    const completed = user.completedTasks || {};

    let text = `━━━━━━━━━━━━━━━━━━━\n`;
    text += `🎯 *টাস্ক সেন্টার* 🎯\n`;
    text += `━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `টাস্ক সম্পূর্ণ করুন এবং কয়েন অর্জন করুন! 👇\n\n`;

    config.TASKS.forEach(t => {
      if (t.id === 'ads') {
        const today = getTodayDate();
        let count = user.adCountToday || 0;
        if (user.adDate !== today) count = 0;
        const done = count >= config.MAX_ADS_PER_DAY ? '✅' : '⬜';
        text += `${done} ${t.emoji} *বিজ্ঞাপন দেখুন (${count}/${config.MAX_ADS_PER_DAY})* — \`+${t.reward}\` কয়েন\n`;
      } else {
        const done = completed[t.id] ? '✅' : '⬜';
        text += `${done} ${t.emoji} *${t.title}* — \`+${t.reward}\` কয়েন\n`;
      }
    });

    if (user.vip) {
      text += `\n━━━ 👑 *ভিআইপি টাস্কসমূহ* 👑 ━━━\n`;
      config.VIP_TASKS.forEach(t => {
        const done = completed[t.id] ? '✅' : '⬜';
        text += `${done} ${t.emoji} *${t.title}* — \`+${t.reward}\` কয়েন\n`;
      });
    }

    text += `\n━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *আপনার ব্যালেন্স:* \`${user.balance}\` কয়েন\n`;
    if (user.vip) text += `👑 *ভিআইপি বোনাস:* ২x রিওয়ার্ড সক্রিয়!\n`;
    text += `━━━━━━━━━━━━━━━━━━━`;

    const buttons = [];
    config.TASKS.forEach(t => {
      if (t.id === 'ads') {
        const today = getTodayDate();
        let count = user.adCountToday || 0;
        if (user.adDate !== today) count = 0;
        if (count < config.MAX_ADS_PER_DAY) {
          buttons.push([Markup.button.callback(getAdLabel(user), `task_ads`)]);
        }
      } else if (!completed[t.id]) {
        buttons.push([Markup.button.callback(`${t.emoji} ${t.title}`, `task_${t.id}`)]);
      }
    });

    if (user.vip) {
      config.VIP_TASKS.forEach(t => {
        if (!completed[t.id]) {
          buttons.push([Markup.button.callback(`${t.emoji} ${t.title}`, `task_${t.id}`)]);
        }
      });
    }

    buttons.push([Markup.button.callback('🔙 মেনুতে ফিরুন', 'back_menu')]);

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    }).catch(() => {
      ctx.replyWithMarkdown(text, { reply_markup: { inline_keyboard: buttons } });
    });
  },

  async handleTaskAction(ctx) {
    const taskId = ctx.match[1];
    const user = await userService.getUser(ctx.from.id);
    if (!user) return ctx.answerCbQuery('❌ দয়া করে /start ব্যবহার করুন।', { show_alert: true });

    const allTasks = [...config.TASKS, ...(user.vip ? config.VIP_TASKS : [])];
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return ctx.answerCbQuery('❌ টাস্ক পাওয়া যায়নি।', { show_alert: true });

    if (taskId !== 'ads' && user.completedTasks && user.completedTasks[taskId]) {
      return ctx.answerCbQuery('✅ আপনি ইতিমধ্যে এই টাস্ক সম্পূর্ণ করেছেন!', { show_alert: true });
    }

    if (taskId === 'channel') {
      return ctx.answerCbQuery('📢 আমাদের চ্যানেলে জয়েন করুন: https://t.me/your_channel', { show_alert: true });
    }

    if (taskId === 'website') {
      return ctx.answerCbQuery('🌐 ভিজিট করুন: https://yourairdrop.com', { show_alert: true });
    }

    if (taskId === 'ads') {
      const today = getTodayDate();
      let count = user.adCountToday || 0;
      if (user.adDate !== today) count = 0;

      if (count >= config.MAX_ADS_PER_DAY) {
        return ctx.answerCbQuery(`✅ আজকের ${config.MAX_ADS_PER_DAY} টি এড সম্পূর্ণ! আগামীকাল আবার দেখুন।`, { show_alert: true });
      }

      const now = Date.now();
      if (user.lastAd && now - user.lastAd < config.COOLDOWN_ADS * 1000) {
        const left = Math.ceil((config.COOLDOWN_ADS * 1000 - (now - user.lastAd)) / 1000);
        return ctx.answerCbQuery(`⏳ কুলডাউন: ${left}সেকেন্ড`, { show_alert: true });
      }

      await userService.updateUser(ctx.from.id, {
        adStartedAt: now,
        adMsgId: ctx.callbackQuery.message.message_id,
        adChatId: ctx.callbackQuery.message.chat.id,
      });

      const serverUrl = config.SERVER_URL;
      const verifPageUrl = `${serverUrl}/ad-start/${ctx.from.id}`;

      await ctx.editMessageText(
        `━━━━━━━━━━━━━━━━━━━\n🎥 *বিজ্ঞাপন দেখুন (${count + 1}/${config.MAX_ADS_PER_DAY})* 🎥\n━━━━━━━━━━━━━━━━━━━\n\n🔗 *নিচের বাটনে ক্লিক করে বিজ্ঞাপন পেজ খুলুন:*\n\n⏳ *দয়া করে ${config.AD_WAIT_TIME} সেকেন্ড অপেক্ষা করুন...*\n✅ সময় শেষ হলে "ক্লেইম" বাটন আসবে!\n\n⚠️ *ট্যাব বন্ধ করলে ভেরিফিকেশন ব্যর্থ হবে!*`,
        {
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [
              [Markup.button.url('🖥️ ভেরিফিকেশন পেজ খুলুন', verifPageUrl)],
              [Markup.button.callback(`⏳ ${config.AD_WAIT_TIME}সেকেন্ড বাকি...`, 'ad_waiting')],
              [Markup.button.callback('🔙 ফিরুন', 'tasks')],
            ],
          },
        }
      ).catch(() => {});

      const chatId = ctx.callbackQuery.message.chat.id;
      const msgId = ctx.callbackQuery.message.message_id;

      setTimeout(async () => {
        try {
          await ctx.telegram.editMessageReplyMarkup(chatId, msgId, null, {
            inline_keyboard: [
              [Markup.button.url('🖥️ ভেরিফিকেশন পেজ', verifPageUrl)],
              [Markup.button.callback('🎉 ক্লেইম +10 কয়েন', 'ad_claim')],
              [Markup.button.callback('🔙 ফিরুন', 'tasks')],
            ],
          });
        } catch (e) {}
      }, config.AD_WAIT_TIME * 1000);

      return ctx.answerCbQuery().catch(() => {});
    }

    if (taskId === 'daily') {
      return ctx.answerCbQuery('🎁 মেইন মেনুতে বোনাস বাটন ব্যবহার করুন!', { show_alert: true });
    }

    if (taskId === 'invite') {
      return ctx.answerCbQuery('👥 মেইন মেনুতে রেফারেল বাটন ব্যবহার করুন!', { show_alert: true });
    }

    const result = await rewardService.completeTask(ctx.from.id, taskId, task.reward);
    if (result.success) {
      await ctx.answerCbQuery(`✅ +${result.reward} কয়েন অর্জিত!${result.multiplier > 1 ? ' (২x ভিআইপি বোনাস!)' : ''}`, { show_alert: true });
    } else {
      await ctx.answerCbQuery('❌ ' + result.reason, { show_alert: true });
    }
  },
};

module.exports = taskHandlers;
