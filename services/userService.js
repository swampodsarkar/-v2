const { db } = require('../firebase');
const config = require('../config');

const defaultUser = {
  userId: 0,
  username: '',
  firstName: '',
  balance: 0,
  totalEarned: 0,
  referrals: 0,
  invitedBy: null,
  joinedAt: Date.now(),
  lastActive: Date.now(),
  lastBonus: 0,
  vip: false,
  vipUntil: 0,
  banned: false,
  completedTasks: {},
  lastAd: 0,
  adStartedAt: null,
  adCountToday: 0,
  adDate: '',
  captchaVerified: false,
  totalReferrals: 0,
};

function normalizeUser(data) {
  if (!data) return null;
  return { ...defaultUser, ...data };
}

const userService = {
  async findOrCreate(ctx) {
    const { id, username, first_name } = ctx.from;
    const ref = db.ref(`users/${id}`);
    const snap = await ref.once('value');
    const now = Date.now();

    if (!snap.exists()) {
      const userData = {
        userId: id,
        username: username || '',
        firstName: first_name || '',
        balance: 0,
        totalEarned: 0,
        referrals: 0,
        invitedBy: ctx.startPayload || null,
        joinedAt: now,
        lastActive: now,
        lastBonus: 0,
        vip: false,
        vipUntil: 0,
        banned: false,
        completedTasks: {},
        lastAd: 0,
        adStartedAt: null,
        adCountToday: 0,
        adDate: '',
        captchaVerified: false,
        totalReferrals: 0,
      };
      await ref.set(userData);

      if (ctx.startPayload && ctx.startPayload !== String(id)) {
        await this.addReferral(ctx.startPayload, id);
      }
      return userData;
    }

    const existing = snap.val();
    const merged = { ...defaultUser, ...existing, userId: id, username: username || existing.username || '', firstName: first_name || existing.firstName || '' };
    await ref.update(merged);
    return merged;
  },

  async getUser(userId) {
    const ref = db.ref(`users/${userId}`);
    const snap = await ref.once('value');
    return normalizeUser(snap.val());
  },

  async updateUser(userId, data) {
    const ref = db.ref(`users/${userId}`);
    await ref.update(data);
  },

  async addBalance(userId, amount) {
    const user = await this.getUser(userId);
    if (!user) return false;
    const multiplier = user.vip ? 2 : 1;
    const reward = amount * multiplier;
    await this.updateUser(userId, {
      balance: user.balance + reward,
      totalEarned: user.totalEarned + reward,
    });
    return reward;
  },

  async addReferral(inviterId, newUserId) {
    if (String(inviterId) === String(newUserId)) return;
    let inviter = await this.getUser(inviterId);
    if (!inviter) {
      await this.updateUser(inviterId, { userId: Number(inviterId), joinedAt: Date.now(), referrals: 1, totalReferrals: 1, balance: config.REFERRAL_REWARD, totalEarned: config.REFERRAL_REWARD });
      return;
    }
    const newRefCount = (inviter.referrals || 0) + 1;
    const newTotalRef = (inviter.totalReferrals || 0) + 1;
    const newBalance = (inviter.balance || 0) + config.REFERRAL_REWARD * (inviter.vip ? 2 : 1);
    const newEarned = (inviter.totalEarned || 0) + config.REFERRAL_REWARD * (inviter.vip ? 2 : 1);
    await this.updateUser(inviterId, {
      referrals: newRefCount,
      totalReferrals: newTotalRef,
      balance: newBalance,
      totalEarned: newEarned,
    });
  },

  async getTopEarners(limit = 10) {
    const ref = db.ref('users');
    const snap = await ref.once('value');
    if (!snap.exists()) return [];
    const users = snap.val();
    return Object.values(users)
      .filter(u => u && !u.banned)
      .map(normalizeUser)
      .sort((a, b) => b.totalEarned - a.totalEarned)
      .slice(0, limit);
  },

  async getTopReferrers(limit = 10) {
    const ref = db.ref('users');
    const snap = await ref.once('value');
    if (!snap.exists()) return [];
    const users = snap.val();
    return Object.values(users)
      .filter(u => u && !u.banned)
      .map(normalizeUser)
      .sort((a, b) => b.totalReferrals - a.totalReferrals)
      .slice(0, limit);
  },

  async getAllUsers() {
    const ref = db.ref('users');
    const snap = await ref.once('value');
    return snap.exists() ? snap.val() : {};
  },

  async getTotalStats() {
    const users = await this.getAllUsers();
    const arr = Object.values(users).filter(Boolean).map(normalizeUser);
    return {
      totalUsers: arr.length,
      totalEarned: arr.reduce((s, u) => s + u.totalEarned, 0),
      totalReferrals: arr.reduce((s, u) => s + u.totalReferrals, 0),
      activeToday: arr.filter(u => u.lastActive && Date.now() - u.lastActive < 86400000).length,
      vipUsers: arr.filter(u => u.vip).length,
    };
  },
};

module.exports = userService;
