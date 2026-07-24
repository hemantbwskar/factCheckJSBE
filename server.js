const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'timelineData.json');

app.use(cors());
app.use(express.json());

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
    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    let items = JSON.parse(rawData);
    const updatedItem = req.body;

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
    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    const items = JSON.parse(rawData);

    // Generate a simple unique ID (using timestamp)
    const newItem = {
      id: Date.now(),
      title: req.body.title || 'New Event',
      date: req.body.date || 'Jan 01, 2026',
      category: req.body.category || 'General',
      description: req.body.description || 'Description details here...',
      icon: req.body.icon || '📌'
    };

    items.push(newItem);
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));

    res.json({ success: true, item: newItem });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add new item' });
  }
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));