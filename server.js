const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'timelineData.json');

app.use(cors());
app.use(express.json());

// Helper to validate if a string is a valid UTC date timestamp string
function isValidUtcString(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const utcRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|([+-]\d{2}:\d{2}))$/i;
  if (!utcRegex.test(dateStr)) return false;
  return !isNaN(Date.parse(dateStr));
}

// GET: Load timeline data
app.get('/api/timeline', (req, res) => {
  try {
    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    res.json(JSON.parse(rawData));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read data file' });
  }
});

// PUT: Update a timeline item
app.put('/api/timeline/:id', (req, res) => {
  try {
    const updatedItem = req.body;

    if (!updatedItem.date || !isValidUtcString(updatedItem.date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing UTC date timestamp string. Expected format: YYYY-MM-DDTHH:mm:ssZ'
      });
    }

    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    let items = JSON.parse(rawData);

    items = items.map((item) => (item.id === updatedItem.id ? updatedItem : item));

    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
    res.json({ success: true, item: updatedItem });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update data file' });
  }
});

// POST: Add a new timeline item
app.post('/api/timeline', (req, res) => {
  try {
    const { date, title, category, description, icon } = req.body;

    if (!date || !isValidUtcString(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing UTC date timestamp string. Expected format: YYYY-MM-DDTHH:mm:ssZ'
      });
    }

    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    const items = JSON.parse(rawData);

    // Generate a simple unique ID (using timestamp)
    const newItem = {
      id: Date.now(),
      title: title || 'New Event',
      date: date,
      category: category || 'General',
      description: description || 'Description details here...',
      icon: icon || '📌'
    };

    items.push(newItem);
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));

    res.json({ success: true, item: newItem });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add new item' });
  }
});

// POST: Sign in endpoint
app.post('/api/signin', (req, res) => {
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


app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));