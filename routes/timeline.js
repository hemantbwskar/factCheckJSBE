const express = require('express');
const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');
const { isValidUtcString } = require('../utils/validation');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '../timelineData.json');

// GET: Load timeline data
router.get('/', async (req, res) => {
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
      console.log(`📤 Returned ${data ? data.length : 0} items from Supabase.`);
      return res.json(data);
    }

    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    const items = JSON.parse(rawData);
    console.log(`📤 Returned ${items.length} items from local timelineData.json.`);
    res.json(items);
  } catch (err) {
    console.error('GET /api/timeline error:', err);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// PUT: Update a timeline item
router.put('/:id', async (req, res) => {
  try {
    const updatedItem = req.body;
    const paramId = req.params.id;
    const targetId = !isNaN(paramId) ? Number(paramId) : (updatedItem.id || paramId);

    console.log(`📥 Processing PUT /api/timeline/${targetId} with body:`, updatedItem);

    if (!updatedItem.date || !isValidUtcString(updatedItem.date)) {
      console.warn('❌ Validation failed: date is missing or not a valid UTC string:', updatedItem.date);
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing UTC date timestamp string. Expected format: YYYY-MM-DDTHH:mm:ssZ'
      });
    }

    const visibility = ['public', 'private'].includes(updatedItem.visibility)
      ? updatedItem.visibility
      : 'public';

    const tags = Array.isArray(updatedItem.tags) ? updatedItem.tags.map(String) : [];

    const updateData = {
      title: updatedItem.title,
      date: updatedItem.date,
      category: updatedItem.category || 'General',
      description: updatedItem.description || '',
      tags: tags,
      visibility: visibility,
      username: updatedItem.username !== undefined ? updatedItem.username : null
    };

    console.log(`📝 Payload prepared for update (ID ${targetId}):`, updateData);

    if (supabase) {
      const { data, error } = await supabase
        .from('timeline_items')
        .update(updateData)
        .eq('id', targetId)
        .select();

      if (error) {
        console.error('❌ Supabase PUT error:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      if (!data || data.length === 0) {
        console.warn(`⚠️ Supabase PUT updated 0 rows for ID ${targetId}. Check RLS or item existence.`);
        return res.status(404).json({
          success: false,
          error: `Item with ID ${targetId} was not updated in Supabase. Check if the item exists and review Supabase RLS policies.`
        });
      }

      console.log('✅ Supabase PUT successfully updated row:', data[0]);
      return res.json({ success: true, item: data[0] });
    }

    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    let items = JSON.parse(rawData);

    const fullUpdatedItem = { id: targetId, ...updateData };
    items = items.map((item) => (item.id == targetId ? fullUpdatedItem : item));

    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
    console.log('✅ Local file updated with item:', fullUpdatedItem);
    res.json({ success: true, item: fullUpdatedItem });
  } catch (err) {
    console.error('❌ PUT /api/timeline/:id error:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// POST: Add a new timeline item
router.post('/', async (req, res) => {
  try {
    const { date, title, category, description, tags, visibility, username } = req.body;

    console.log('📥 Processing POST /api/timeline with body:', req.body);

    if (!date || !isValidUtcString(date)) {
      console.warn('❌ Validation failed: date is missing or not a valid UTC string:', date);
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing UTC date timestamp string. Expected format: YYYY-MM-DDTHH:mm:ssZ'
      });
    }

    const validVisibility = ['public', 'private'].includes(visibility) ? visibility : 'public';
    const formattedTags = Array.isArray(tags) ? tags.map(String) : [];

    const insertData = {
      title: title || 'New Event',
      date: date,
      category: category || 'General',
      description: description || '',
      tags: formattedTags,
      visibility: validVisibility,
      username: username || null
    };

    console.log('📝 Payload prepared for insert:', insertData);

    if (supabase) {
      const { data, error } = await supabase
        .from('timeline_items')
        .insert([insertData])
        .select();

      if (error) {
        console.error('❌ Supabase POST error:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ Supabase POST inserted 0 rows. Check RLS permissions.');
        return res.status(500).json({
          success: false,
          error: 'Failed to insert item into Supabase. Check Supabase Row Level Security (RLS) policies.'
        });
      }

      console.log('✅ Supabase POST successfully created row:', data[0]);
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
    console.log('✅ Local file updated with new item:', newItem);

    res.json({ success: true, item: newItem });
  } catch (err) {
    console.error('❌ POST /api/timeline error:', err);
    res.status(500).json({ error: 'Failed to add new item' });
  }
});

module.exports = router;
