const express = require('express');
const router = express.Router();

// POST: Sign in endpoint
router.post('/signin', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }

  if (username === 'hemantB' && password === 'serverjspass') {
    return res.json({
      success: true,
      message: 'Sign in successful',
      user: { username: 'hemantB' }
    });
  }

  return res.status(401).json({ success: false, error: 'Invalid username or password' });
});

module.exports = router;
