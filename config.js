require('dotenv').config();

module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  ADMIN_IDS: (process.env.ADMIN_IDS || '').split(',').map(Number).filter(Boolean),
  MIN_WITHDRAW: Number(process.env.MIN_WITHDRAW) || 50,
  VIP_MIN_WITHDRAW: Number(process.env.VIP_MIN_WITHDRAW) || 30,
  REFERRAL_REWARD: Number(process.env.REFERRAL_REWARD) || 25,
  DAILY_BONUS: Number(process.env.DAILY_BONUS) || 20,
  PORT: Number(process.env.PORT) || 3000,
  BOT_USERNAME: process.env.BOT_USERNAME || 'bot',
  MAX_ADS_PER_DAY: 20,
  COOLDOWN_ADS: 30,
  AD_WAIT_TIME: 30,
  AD_LINK: 'https://omg10.com/4/11047692',
  SERVER_URL: process.env.SERVER_URL || 'http://127.0.0.1:3000',
  CAPTCHA_SECRET: process.env.CAPTCHA_SECRET || 'default_secret',
  TASKS: [
    { id: 'channel', title: '📢 চ্যানেলে জয়েন', reward: 30, type: 'channel', emoji: '📢' },
    { id: 'ads', title: '🎥 বিজ্ঞাপন দেখুন', reward: 10, type: 'ads', emoji: '🎥' },
    { id: 'invite', title: '👥 বন্ধুদের আমন্ত্রণ', reward: 25, type: 'invite', emoji: '👥' },
    { id: 'website', title: '🌐 ওয়েবসাইট ভিজিট', reward: 15, type: 'website', emoji: '🌐' },
    { id: 'daily', title: '🎁 ডেইলি বোনাস', reward: 20, type: 'daily', emoji: '🎁' },
  ],
  VIP_TASKS: [
    { id: 'vip_special', title: '💎 ভিআইপি স্পেশাল', reward: 100, type: 'vip', emoji: '💎' },
    { id: 'vip_share', title: '📢 ভিআইপি শেয়ার', reward: 75, type: 'vip', emoji: '📢' },
  ],
};
