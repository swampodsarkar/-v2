const crypto = require('crypto');
const config = require('../config');

const antiFakeService = {
  generateCaptcha() {
    const num1 = Math.floor(Math.random() * 20) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const ops = ['+', '-'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let answer;
    if (op === '+') answer = num1 + num2;
    else answer = num1 - num2;
    return { question: `${num1} ${op} ${num2} = ?`, answer };
  },

  verifyCaptcha(userAnswer, correctAnswer) {
    return Number(userAnswer) === Number(correctAnswer);
  },

  generateChallenge(userId) {
    const ts = Date.now();
    const hash = crypto
      .createHash('sha256')
      .update(`${userId}:${ts}:${config.CAPTCHA_SECRET}`)
      .digest('hex')
      .substring(0, 8);
    return { hash, ts };
  },

  verifyChallenge(userId, hash, ts) {
    const expected = crypto
      .createHash('sha256')
      .update(`${userId}:${ts}:${config.CAPTCHA_SECRET}`)
      .digest('hex')
      .substring(0, 8);
    const elapsed = Date.now() - Number(ts);
    return hash === expected && elapsed < 300000;
  },

  isOnCooldown(lastAction, cooldownMs) {
    if (!lastAction) return false;
    return Date.now() - lastAction < cooldownMs;
  },

  getCooldownRemaining(lastAction, cooldownMs) {
    if (!lastAction) return 0;
    return Math.max(0, cooldownMs - (Date.now() - lastAction));
  },
};

module.exports = antiFakeService;
