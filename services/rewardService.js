const userService = require('./userService');

const rewardService = {
  async completeTask(userId, taskId, reward) {
    const user = await userService.getUser(userId);
    if (!user) return { success: false, reason: 'User not found' };

    if (user.completedTasks && user.completedTasks[taskId]) {
      return { success: false, reason: 'Task already completed' };
    }

    const multiplier = user.vip ? 2 : 1;
    const finalReward = reward * multiplier;

    const completedTasks = user.completedTasks || {};
    completedTasks[taskId] = Date.now();

    await userService.updateUser(userId, {
      balance: (user.balance || 0) + finalReward,
      totalEarned: (user.totalEarned || 0) + finalReward,
      completedTasks,
    });

    return { success: true, reward: finalReward, multiplier };
  },

  async claimDaily(userId) {
    const user = await userService.getUser(userId);
    if (!user) return { success: false, reason: 'User not found' };

    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;

    if (user.lastBonus && now - user.lastBonus < cooldown) {
      const remaining = cooldown - (now - user.lastBonus);
      return { success: false, reason: 'cooldown', remaining };
    }

    const multiplier = user.vip ? 2 : 1;
    const baseReward = 20;
    const finalReward = baseReward * multiplier;

    await userService.updateUser(userId, {
      balance: (user.balance || 0) + finalReward,
      totalEarned: (user.totalEarned || 0) + finalReward,
      lastBonus: now,
    });

    return { success: true, reward: finalReward, multiplier };
  },

  async watchAd(userId) {
    const user = await userService.getUser(userId);
    if (!user) return { success: false, reason: 'User not found' };

    const now = Date.now();
    const cooldown = 30000;

    if (user.lastAd && now - user.lastAd < cooldown) {
      const remaining = cooldown - (now - user.lastAd);
      return { success: false, reason: 'cooldown', remaining };
    }

    const multiplier = user.vip ? 2 : 1;
    const reward = 10 * multiplier;

    await userService.updateUser(userId, {
      balance: (user.balance || 0) + reward,
      totalEarned: (user.totalEarned || 0) + reward,
      lastAd: now,
    });

    return { success: true, reward, multiplier };
  },
};

module.exports = rewardService;
