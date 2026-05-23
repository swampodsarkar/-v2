const userService = require('./userService');
const config = require('../config');

const referralService = {
  getReferralLink(userId) {
    return `https://t.me/${config.BOT_USERNAME}?start=${userId}`;
  },

  async getReferralStats(userId) {
    const user = await userService.getUser(userId);
    if (!user) return { total: 0, earnings: 0, link: '' };
    return {
      total: user.totalReferrals || 0,
      earnings: (user.referrals || 0) * config.REFERRAL_REWARD * (user.vip ? 2 : 1),
      link: this.getReferralLink(userId),
    };
  },

  async getReferralHistory(userId) {
    const { db } = require('../firebase');
    const ref = db.ref('users');
    const snap = await ref.once('value');
    if (!snap.exists()) return [];
    const all = snap.val();
    return Object.entries(all)
      .filter(([id, u]) => u && u.invitedBy === String(userId))
      .map(([id, u]) => ({
        userId: id,
        username: u.username,
        firstName: u.firstName,
        joinedAt: u.joinedAt,
      }))
      .sort((a, b) => b.joinedAt - a.joinedAt);
  },
};

module.exports = referralService;
