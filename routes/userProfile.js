const express = require('express');
const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');

const router = express.Router();
const PROFILES_FILE = path.join(__dirname, '../userProfilesData.json');

// GET /api/userprofile - List all user profiles
router.get('/', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('❌ Supabase GET /api/userprofile error:', error);
        return res.status(500).json({ error: error.message });
      }
      console.log(`📤 Returned ${data ? data.length : 0} user profiles from Supabase.`);
      return res.json(data);
    }

    const rawData = fs.readFileSync(PROFILES_FILE, 'utf8');
    const profiles = JSON.parse(rawData);
    console.log(`📤 Returned ${profiles.length} user profiles from local JSON.`);
    return res.json(profiles);
  } catch (err) {
    console.error('❌ GET /api/userprofile error:', err);
    res.status(500).json({ error: 'Failed to read user profiles' });
  }
});

// GET /api/userprofile/:username - Fetch profile by username
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (supabase) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (error || !data) {
        console.warn(`⚠️ Profile for username '${username}' not found in Supabase.`);
        return res.status(404).json({ success: false, error: 'User profile not found' });
      }
      console.log(`📤 Returned user profile for '${username}':`, data);
      return res.json(data);
    }

    const rawData = fs.readFileSync(PROFILES_FILE, 'utf8');
    const profiles = JSON.parse(rawData);
    const profile = profiles.find((p) => p.username === username);

    if (!profile) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    return res.json(profile);
  } catch (err) {
    console.error('❌ GET /api/userprofile/:username error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// POST /api/userprofile - Create new user profile
router.post('/', async (req, res) => {
  try {
    const { username, email, full_name, bio, avatar_url, role } = req.body;

    console.log('📥 Processing POST /api/userprofile with body:', req.body);

    if (!username || typeof username !== 'string' || username.trim() === '') {
      console.warn('❌ Validation failed: username is required.');
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    const profileData = {
      username: username.trim(),
      email: email || null,
      full_name: full_name || '',
      bio: bio || '',
      avatar_url: avatar_url || null,
      role: role || 'user',
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert([{ ...profileData, created_at: new Date().toISOString() }])
        .select();

      if (error) {
        console.error('❌ Supabase POST /api/userprofile error:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ Supabase POST /api/userprofile inserted 0 rows. Check RLS policies.');
        return res.status(500).json({
          success: false,
          error: 'Failed to create profile. Check Supabase RLS policies.'
        });
      }

      console.log('✅ Supabase POST /api/userprofile created profile:', data[0]);
      return res.status(201).json({ success: true, profile: data[0] });
    }

    const rawData = fs.readFileSync(PROFILES_FILE, 'utf8');
    const profiles = JSON.parse(rawData);

    if (profiles.some((p) => p.username === profileData.username)) {
      return res.status(409).json({ success: false, error: 'Username already exists' });
    }

    const newProfile = {
      id: Date.now(),
      created_at: new Date().toISOString(),
      ...profileData
    };

    profiles.push(newProfile);
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));

    console.log('✅ Local file created user profile:', newProfile);
    return res.status(201).json({ success: true, profile: newProfile });
  } catch (err) {
    console.error('❌ POST /api/userprofile error:', err);
    res.status(500).json({ error: 'Failed to create user profile' });
  }
});

// PUT /api/userprofile/:username - Update user profile
router.put('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { email, full_name, bio, avatar_url, role } = req.body;

    console.log(`📥 Processing PUT /api/userprofile/${username} with body:`, req.body);

    const updateData = {
      updated_at: new Date().toISOString()
    };
    if (email !== undefined) updateData.email = email;
    if (full_name !== undefined) updateData.full_name = full_name;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (role !== undefined) updateData.role = role;

    if (supabase) {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('username', username)
        .select();

      if (error) {
        console.error('❌ Supabase PUT /api/userprofile error:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({
          success: false,
          error: `User profile '${username}' not found or permission denied.`
        });
      }

      console.log(`✅ Supabase PUT updated profile for '${username}':`, data[0]);
      return res.json({ success: true, profile: data[0] });
    }

    const rawData = fs.readFileSync(PROFILES_FILE, 'utf8');
    let profiles = JSON.parse(rawData);

    const index = profiles.findIndex((p) => p.username === username);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    profiles[index] = { ...profiles[index], ...updateData };
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));

    console.log(`✅ Local file updated user profile for '${username}':`, profiles[index]);
    return res.json({ success: true, profile: profiles[index] });
  } catch (err) {
    console.error('❌ PUT /api/userprofile/:username error:', err);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

module.exports = router;
