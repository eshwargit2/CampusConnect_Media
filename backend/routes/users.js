const express = require('express');
const multer = require('multer');
const supabase = require('../supabase');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Multer memory storage for profile images
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    },
});

// GET /api/users/search?q=... - Search users by username
router.get('/search', async (req, res) => {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
        return res.json({ users: [] });
    }

    const { data: users, error } = await supabase
        .from('users')
        .select('id, username, bio, profile_image')
        .ilike('username', `%${q.trim()}%`)
        .limit(8);

    if (error) {
        console.error('Search error:', error);
        return res.status(500).json({ error: 'Search failed' });
    }

    res.json({ users: users || [] });
});

// GET /api/users/:username - Get user profile
router.get('/:username', async (req, res) => {
    const { username } = req.params;

    const { data: user, error } = await supabase
        .from('users')
        .select('id, email, username, bio, profile_image, address, website, link_instagram, link_twitter, link_linkedin, link_github, created_at')
        .eq('username', username)
        .single();

    if (error || !user) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Get follower / following counts
    const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);

    const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id);

    // Get user's posts with likes/comments counts
    const { data: posts } = await supabase
        .from('posts')
        .select(`
      id, image_url, caption, created_at,
      likes(count),
      comments(count)
    `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    // Check current user's likes (if authenticated)
    let currentUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwt = require('jsonwebtoken');
        try {
            const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
            currentUserId = decoded.userId;
        } catch { }
    }

    let userLikes = new Set();
    if (currentUserId && posts && posts.length > 0) {
        const postIds = posts.map(p => p.id);
        const { data: likes } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', currentUserId)
            .in('post_id', postIds);
        if (likes) likes.forEach(l => userLikes.add(l.post_id));
    }

    // Enrich posts with user info and like status (matching Feed format)
    const enrichedPosts = (posts || []).map(post => ({
        ...post,
        user: { id: user.id, username: user.username, profile_image: user.profile_image },
        likes_count: post.likes?.[0]?.count ?? 0,
        comments_count: post.comments?.[0]?.count ?? 0,
        liked_by_me: userLikes.has(post.id),
    }));

    res.json({
        user: {
            ...user,
            followers_count: followersCount || 0,
            following_count: followingCount || 0,
        },
        posts: enrichedPosts,
    });
});


// PUT /api/users/profile/update - Update profile
router.put('/profile/update', authMiddleware, upload.single('profile_image'), async (req, res) => {
    const { username, bio, address, website, link_instagram, link_twitter, link_linkedin, link_github } = req.body;
    const userId = req.user.id;

    const updates = {};

    if (username && username !== req.user.username) {
        // Check username uniqueness
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .neq('id', userId)
            .single();

        if (existing) {
            return res.status(409).json({ error: 'Username already taken' });
        }
        updates.username = username;
    }

    if (bio !== undefined) updates.bio = bio;
    if (address !== undefined) updates.address = address;
    if (website !== undefined) updates.website = website;
    if (link_instagram !== undefined) updates.link_instagram = link_instagram;
    if (link_twitter !== undefined) updates.link_twitter = link_twitter;
    if (link_linkedin !== undefined) updates.link_linkedin = link_linkedin;
    if (link_github !== undefined) updates.link_github = link_github;

    // Handle profile image upload
    if (req.file) {
        const fileExt = req.file.mimetype.split('/')[1];
        const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true,
            });

        if (uploadError) {
            console.error('Avatar upload error:', uploadError);
            return res.status(500).json({ error: 'Failed to upload profile image' });
        }

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        updates.profile_image = urlData.publicUrl;
    }

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select('id, email, username, bio, profile_image, address, website, link_instagram, link_twitter, link_linkedin, link_github, created_at')
        .single();

    if (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({ error: 'Failed to update profile' });
    }

    res.json({ user: updatedUser });
});

// POST /api/users/:userId/follow - Follow/unfollow a user
router.post('/:userId/follow', authMiddleware, async (req, res) => {
    const { userId: targetId } = req.params;
    const followerId = req.user.id;

    if (followerId === targetId) {
        return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    // Check if already following
    const { data: existing } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', targetId)
        .single();

    if (existing) {
        // Unfollow
        await supabase.from('follows').delete().eq('id', existing.id);
        return res.json({ following: false });
    } else {
        // Follow
        await supabase.from('follows').insert({ follower_id: followerId, following_id: targetId });
        return res.json({ following: true });
    }
});

// GET /api/users/:userId/is-following
router.get('/:userId/is-following', authMiddleware, async (req, res) => {
    const { userId: targetId } = req.params;
    const followerId = req.user.id;

    const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', targetId)
        .single();

    res.json({ following: !!data });
});

// GET /api/users/:userId/followers - Get list of followers
router.get('/:userId/followers', async (req, res) => {
    const { userId } = req.params;

    const { data: follows, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId);

    if (error) return res.status(500).json({ error: 'Failed to fetch followers' });
    if (!follows || follows.length === 0) return res.json({ users: [] });

    const followerIds = follows.map(f => f.follower_id);

    const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, username, profile_image, bio')
        .in('id', followerIds);

    if (usersErr) return res.status(500).json({ error: 'Failed to fetch user details' });

    res.json({ users: users || [] });
});

// GET /api/users/:userId/following - Get list of users being followed
router.get('/:userId/following', async (req, res) => {
    const { userId } = req.params;

    const { data: follows, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

    if (error) return res.status(500).json({ error: 'Failed to fetch following' });
    if (!follows || follows.length === 0) return res.json({ users: [] });

    const followingIds = follows.map(f => f.following_id);

    const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, username, profile_image, bio')
        .in('id', followingIds);

    if (usersErr) return res.status(500).json({ error: 'Failed to fetch user details' });

    res.json({ users: users || [] });
});

// ─── ONLINE PRESENCE (in-memory) ──────────────────────────────────────
const onlineUsers = new Map(); // userId -> lastSeen timestamp
const ONLINE_THRESHOLD = 2 * 60 * 1000; // 2 minutes

// Clean up stale entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [userId, lastSeen] of onlineUsers) {
        if (now - lastSeen > ONLINE_THRESHOLD * 2) onlineUsers.delete(userId);
    }
}, 5 * 60 * 1000);

// POST /api/users/heartbeat — keep user online
router.post('/heartbeat', authMiddleware, (req, res) => {
    onlineUsers.set(req.user.id, Date.now());
    res.json({ ok: true });
});

// POST /api/users/online-status — check which users are online
// Body: { userIds: ["id1", "id2", ...] }
router.post('/online-status', async (req, res) => {
    const { userIds } = req.body;
    if (!Array.isArray(userIds)) return res.json({ online: {} });

    const now = Date.now();
    const online = {};
    for (const id of userIds) {
        const lastSeen = onlineUsers.get(id);
        online[id] = lastSeen ? (now - lastSeen < ONLINE_THRESHOLD) : false;
    }
    res.json({ online });
});

module.exports = router;
