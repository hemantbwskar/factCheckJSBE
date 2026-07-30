require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'timelineData.json');

// Initialize Supabase Client if credentials are configured
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
let supabase = null;

if (
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseKey.includes('your-supabase')
) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase client initialized successfully.');
} else {
  console.warn('Supabase credentials missing or default placeholder. Falling back to local timelineData.json persistence.');
}

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
app.get('/api/timeline', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('timeline_items')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Supabase GET error:', error);
        return res.status(500).json({ error: error.message });
      }
      return res.json(data);
    }

    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    res.json(JSON.parse(rawData));
  } catch (err) {
    console.error('GET /api/timeline error:', err);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// PUT: Update a timeline item
app.put('/api/timeline/:id', async (req, res) => {
  try {
    const updatedItem = req.body;
    const paramId = req.params.id;
    const targetId = !isNaN(paramId) ? Number(paramId) : (updatedItem.id || paramId);

    if (!updatedItem.date || !isValidUtcString(updatedItem.date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing UTC date timestamp string. Expected format: YYYY-MM-DDTHH:mm:ssZ'
      });
    }

    const visibility = ['public', 'private'].includes(updatedItem.visibility)
      ? updatedItem.visibility
      : 'public';

    const updateData = {
      title: updatedItem.title,
      date: updatedItem.date,
      category: updatedItem.category || 'General',
      description: updatedItem.description || '',
      visibility: visibility,
      username: updatedItem.username !== undefined ? updatedItem.username : null
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('timeline_items')
        .update(updateData)
        .eq('id', targetId)
        .select();

      if (error) {
        console.error('Supabase PUT error:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      if (!data || data.length === 0) {
        console.warn(`Supabase PUT updated 0 rows for ID ${targetId}. RLS issue or item not found.`);
        return res.status(404).json({
          success: false,
          error: `Item with ID ${targetId} was not updated in Supabase. Check if the item exists and review Supabase RLS policies.`
        });
      }

      return res.json({ success: true, item: data[0] });
    }

    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    let items = JSON.parse(rawData);

    const fullUpdatedItem = { id: targetId, ...updateData };
    items = items.map((item) => (item.id == targetId ? fullUpdatedItem : item));

    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
    res.json({ success: true, item: fullUpdatedItem });
  } catch (err) {
    console.error('PUT /api/timeline/:id error:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// POST: Add a new timeline item
app.post('/api/timeline', async (req, res) => {
  try {
    const { date, title, category, description, visibility, username } = req.body;

    if (!date || !isValidUtcString(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing UTC date timestamp string. Expected format: YYYY-MM-DDTHH:mm:ssZ'
      });
    }

    const validVisibility = ['public', 'private'].includes(visibility) ? visibility : 'public';

    const insertData = {
      title: title || 'New Event',
      date: date,
      category: category || 'General',
      description: description || '',
      visibility: validVisibility,
      username: username || null
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('timeline_items')
        .insert([insertData])
        .select();

      if (error) {
        console.error('Supabase POST error:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      if (!data || data.length === 0) {
        console.warn('Supabase POST inserted 0 rows. RLS permissions issue.');
        return res.status(500).json({
          success: false,
          error: 'Failed to insert item into Supabase. Check Supabase Row Level Security (RLS) policies.'
        });
      }

      return res.json({ success: true, item: data[0] });
    }

    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    const items = JSON.parse(rawData);

    const newItem = {
      id: Date.now(),
      ...insertData
    };

    items.push(newItem);
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));

    res.json({ success: true, item: newItem });
  } catch (err) {
    console.error('POST /api/timeline error:', err);
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