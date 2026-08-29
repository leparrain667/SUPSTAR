const buckets = new Map();
let lastCleanup = 0;

function rateLimit({ windowMs = 15 * 60 * 1000, max = 20 } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    if (now - lastCleanup > 60 * 1000) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
      lastCleanup = now;
    }
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    current.count += 1;
    if (current.count > max) {
      res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
      return res.status(429).json({ error: { message: 'Trop de tentatives, veuillez réessayer plus tard' } });
    }
    return next();
  };
}

module.exports = rateLimit;
