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
        .select('*')
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

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('username', username)
        .limit(1);

    const user = data && data.length > 0 ? data[0] : null;

    if (error || !user) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Get follower / following counts
    const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id)
        .eq('status', 'accepted');

    const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id)
        .eq('status', 'accepted');

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
        user: { id: user.id, username: user.username, profile_image: user.profile_image, is_private: user.is_private, hide_likes: user.hide_likes },
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
    const { username, bio, address, website, link_instagram, link_twitter, link_linkedin, link_github, is_private, hide_likes } = req.body;
    const userId = req.user.id;

    const updates = {};

    if (username && username.trim() !== req.user.username) {
        const cleanUsername = username.trim();
        // Check username uniqueness
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .ilike('username', cleanUsername)
            .neq('id', userId)
            .limit(1);

        if (existing && existing.length > 0) {
            return res.status(409).json({ error: 'Username already taken' });
        }
        updates.username = cleanUsername;
    }

    if (bio !== undefined) updates.bio = bio;
    if (address !== undefined) updates.address = address;
    if (website !== undefined) updates.website = website;
    if (link_instagram !== undefined) updates.link_instagram = link_instagram;
    if (link_twitter !== undefined) updates.link_twitter = link_twitter;
    if (link_linkedin !== undefined) updates.link_linkedin = link_linkedin;
    if (link_github !== undefined) updates.link_github = link_github;
    if (is_private !== undefined) updates.is_private = is_private;
    if (hide_likes !== undefined) updates.hide_likes = hide_likes;

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
        .select('*')
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

    // Check if already following or pending
    const { data: existing } = await supabase
        .from('follows')
        .select('id, status')
        .eq('follower_id', followerId)
        .eq('following_id', targetId)
        .single();

    if (existing) {
        // Unfollow / Cancel request
        await supabase.from('follows').delete().eq('id', existing.id);
        return res.json({ following: false, status: 'none' });
    } else {
        // Fetch target user's privacy setting
        const { data: targetUser } = await supabase.from('users').select('is_private').eq('id', targetId).single();
        const followStatus = targetUser?.is_private ? 'pending' : 'accepted';
        
        await supabase.from('follows').insert({ follower_id: followerId, following_id: targetId, status: followStatus });
        return res.json({ following: followStatus === 'accepted', status: followStatus });
    }
});

// GET /api/users/:userId/is-following
router.get('/:userId/is-following', authMiddleware, async (req, res) => {
    const { userId: targetId } = req.params;
    const followerId = req.user.id;

    const { data } = await supabase
        .from('follows')
        .select('status')
        .eq('follower_id', followerId)
        .eq('following_id', targetId)
        .single();

    res.json({ following: data?.status === 'accepted', status: data?.status || 'none' });
});

// GET /api/users/:userId/followers - Get list of followers
router.get('/:userId/followers', async (req, res) => {
    const { userId } = req.params;

    const { data: follows, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId)
        .eq('status', 'accepted');

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
        .eq('follower_id', userId)
        .eq('status', 'accepted');

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

// DELETE /api/users/account — Delete user account
router.delete('/account', authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
        // Delete user's likes on posts
        await supabase.from('likes').delete().eq('user_id', userId);

        // Delete user's comments on posts
        await supabase.from('comments').delete().eq('user_id', userId);

        // Delete comments and likes on user's posts
        const { data: userPosts } = await supabase
            .from('posts')
            .select('id')
            .eq('user_id', userId);

        if (userPosts && userPosts.length > 0) {
            const postIds = userPosts.map(p => p.id);
            await supabase.from('likes').delete().in('post_id', postIds);
            await supabase.from('comments').delete().in('post_id', postIds);
        }

        // Delete user's posts
        await supabase.from('posts').delete().eq('user_id', userId);

        // Delete user's story likes (likes given by user)
        await supabase.from('story_likes').delete().eq('user_id', userId);

        // Delete likes, views, and replies on user's stories
        const { data: userStories } = await supabase
            .from('stories')
            .select('id')
            .eq('user_id', userId);

        if (userStories && userStories.length > 0) {
            const storyIds = userStories.map(s => s.id);
            await supabase.from('story_likes').delete().in('story_id', storyIds);
            await supabase.from('story_views').delete().in('story_id', storyIds);
            await supabase.from('story_replies').delete().in('story_id', storyIds);
        }

        // Delete user's stories
        await supabase.from('stories').delete().eq('user_id', userId);

        // Delete story views by user (viewing others' stories)
        await supabase.from('story_views').delete().eq('viewer_id', userId);

        // Delete story replies by user (replying to others' stories)
        await supabase.from('story_replies').delete().eq('sender_id', userId);

        // Delete user's follows (both as follower and following)
        await supabase.from('follows').delete().eq('follower_id', userId);
        await supabase.from('follows').delete().eq('following_id', userId);

        // Delete user's messages
        await supabase.from('messages').delete().eq('sender_id', userId);
        await supabase.from('messages').delete().eq('receiver_id', userId);

        // Finally, delete the user account
        const { error } = await supabase.from('users').delete().eq('id', userId);

        if (error) {
            console.error('Delete account error:', error);
            return res.status(500).json({ error: 'Failed to delete account' });
        }

        // Remove from online users
        onlineUsers.delete(userId);

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

// GET /api/users/auth/follow-requests
router.get('/auth/follow-requests', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { data: requests, error } = await supabase
        .from('follows')
        .select('id, follower_id')
        .eq('following_id', userId)
        .eq('status', 'pending');

    if (error) return res.status(500).json({ error: 'Failed to fetch requests' });
    if (!requests || requests.length === 0) return res.json({ requests: [] });

    const followerIds = requests.map(f => f.follower_id);
    const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, username, profile_image, bio')
        .in('id', followerIds);

    if (usersErr) return res.status(500).json({ error: 'Failed to fetch user details' });

    // Map the follow request ID directly into the user object for ease of accept/reject
    const enrichedUsers = users.map(u => {
        const reqData = requests.find(r => r.follower_id === u.id);
        return { ...u, request_id: reqData?.id };
    });

    res.json({ requests: enrichedUsers });
});

// PUT /api/users/auth/follow-requests/:id/accept
router.put('/auth/follow-requests/:id/accept', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
        .from('follows')
        .update({ status: 'accepted' })
        .eq('id', id)
        .eq('following_id', req.user.id);

    if (error) return res.status(500).json({ error: 'Failed to accept request' });
    res.json({ success: true });
});

// DELETE /api/users/auth/follow-requests/:id/reject
router.delete('/auth/follow-requests/:id/reject', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
        .from('follows')
        .delete()
        .eq('id', id)
        .eq('following_id', req.user.id);

    if (error) return res.status(500).json({ error: 'Failed to reject request' });
    res.json({ success: true });
});

module.exports = router;
