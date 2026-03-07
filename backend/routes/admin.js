const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../supabase');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

// ─── ADMIN LOGIN ───────────────────────────────────────────────────────────
// POST /api/admin/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

    if (username !== ADMIN_USERNAME) {
        return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Support both plain-text env password and bcrypt hash
    let isValid = false;
    if (ADMIN_PASSWORD.startsWith('$2')) {
        isValid = await bcrypt.compare(password, ADMIN_PASSWORD);
    } else {
        isValid = password === ADMIN_PASSWORD;
    }

    if (!isValid) {
        return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const token = jwt.sign(
        { isAdmin: true, username: ADMIN_USERNAME },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );

    res.json({ token, admin: { username: ADMIN_USERNAME } });
});

// ─── VERIFY TOKEN ──────────────────────────────────────────────────────────
// GET /api/admin/verify
router.get('/verify', adminMiddleware, (req, res) => {
    res.json({ valid: true, admin: req.admin });
});

// ─── STATS ────────────────────────────────────────────────────────────────
// GET /api/admin/stats
router.get('/stats', adminMiddleware, async (req, res) => {
    const [
        { count: totalUsers },
        { count: totalPosts },
        { count: totalStories },
        { count: totalMessages },
    ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('stories').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
    ]);

    // Users registered in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: newUsersThisWeek } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo);

    res.json({
        totalUsers: totalUsers || 0,
        totalPosts: totalPosts || 0,
        totalStories: totalStories || 0,
        totalMessages: totalMessages || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
    });
});

// ─── GET ALL USERS ────────────────────────────────────────────────────────
// GET /api/admin/users?page=1&limit=20&search=query
router.get('/users', adminMiddleware, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = supabase
        .from('users')
        .select('id, email, username, bio, profile_image, address, website, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (search.trim()) {
        query = query.or(`username.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
    }

    const { data: users, error, count } = await query;

    if (error) {
        console.error('Admin get users error:', error);
        return res.status(500).json({ error: 'Failed to fetch users' });
    }

    // Enrich each user with post count and follower count
    const enriched = await Promise.all((users || []).map(async (user) => {
        const [{ count: postsCount }, { count: followersCount }, { count: followingCount }] = await Promise.all([
            supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
        ]);
        return { ...user, posts_count: postsCount || 0, followers_count: followersCount || 0, following_count: followingCount || 0 };
    }));

    res.json({
        users: enriched,
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
    });
});

// ─── GET SINGLE USER ──────────────────────────────────────────────────────
// GET /api/admin/users/:userId
router.get('/users/:userId', adminMiddleware, async (req, res) => {
    const { userId } = req.params;

    const { data: user, error } = await supabase
        .from('users')
        .select('id, email, username, bio, profile_image, address, website, link_instagram, link_twitter, link_linkedin, link_github, created_at')
        .eq('id', userId)
        .single();

    if (error || !user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const [{ count: postsCount }, { count: followersCount }, { count: followingCount }, { count: storiesCount }] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('stories').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ]);

    res.json({
        user: {
            ...user,
            posts_count: postsCount || 0,
            followers_count: followersCount || 0,
            following_count: followingCount || 0,
            stories_count: storiesCount || 0,
        }
    });
});

// ─── UPDATE USER ──────────────────────────────────────────────────────────
// PUT /api/admin/users/:userId
router.put('/users/:userId', adminMiddleware, async (req, res) => {
    const { userId } = req.params;
    const { username, email, bio, address, website, link_instagram, link_twitter, link_linkedin, link_github } = req.body;

    const updates = {};
    if (username !== undefined) {
        // Check username uniqueness
        const { data: existing } = await supabase
            .from('users').select('id').eq('username', username).neq('id', userId).single();
        if (existing) return res.status(409).json({ error: 'Username already taken by another user' });
        updates.username = username;
    }
    if (email !== undefined) {
        const { data: existingEmail } = await supabase
            .from('users').select('id').eq('email', email.toLowerCase()).neq('id', userId).single();
        if (existingEmail) return res.status(409).json({ error: 'Email already taken by another user' });
        updates.email = email.toLowerCase();
    }
    if (bio !== undefined) updates.bio = bio;
    if (address !== undefined) updates.address = address;
    if (website !== undefined) updates.website = website;
    if (link_instagram !== undefined) updates.link_instagram = link_instagram;
    if (link_twitter !== undefined) updates.link_twitter = link_twitter;
    if (link_linkedin !== undefined) updates.link_linkedin = link_linkedin;
    if (link_github !== undefined) updates.link_github = link_github;

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
        console.error('Admin update user error:', error);
        return res.status(500).json({ error: 'Failed to update user' });
    }

    res.json({ user: updatedUser });
});

// ─── RESET USER PASSWORD ──────────────────────────────────────────────────
// PUT /api/admin/users/:userId/reset-password
router.put('/users/:userId/reset-password', adminMiddleware, async (req, res) => {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    const { error } = await supabase
        .from('users')
        .update({ password_hash: newHash })
        .eq('id', userId);

    if (error) {
        console.error('Admin reset password error:', error);
        return res.status(500).json({ error: 'Failed to reset password' });
    }

    res.json({ message: 'Password reset successfully' });
});

// ─── DELETE USER ──────────────────────────────────────────────────────────
// DELETE /api/admin/users/:userId
router.delete('/users/:userId', adminMiddleware, async (req, res) => {
    const { userId } = req.params;

    try {
        // Delete in proper order to avoid FK conflicts
        await supabase.from('likes').delete().eq('user_id', userId);
        await supabase.from('comments').delete().eq('user_id', userId);

        const { data: userPosts } = await supabase.from('posts').select('id').eq('user_id', userId);
        if (userPosts && userPosts.length > 0) {
            const postIds = userPosts.map(p => p.id);
            await supabase.from('likes').delete().in('post_id', postIds);
            await supabase.from('comments').delete().in('post_id', postIds);
        }
        await supabase.from('posts').delete().eq('user_id', userId);

        await supabase.from('story_likes').delete().eq('user_id', userId);
        const { data: userStories } = await supabase.from('stories').select('id').eq('user_id', userId);
        if (userStories && userStories.length > 0) {
            const storyIds = userStories.map(s => s.id);
            await supabase.from('story_likes').delete().in('story_id', storyIds);
            await supabase.from('story_views').delete().in('story_id', storyIds);
            await supabase.from('story_replies').delete().in('story_id', storyIds);
        }
        await supabase.from('stories').delete().eq('user_id', userId);
        await supabase.from('story_views').delete().eq('viewer_id', userId);
        await supabase.from('story_replies').delete().eq('sender_id', userId);

        await supabase.from('follows').delete().eq('follower_id', userId);
        await supabase.from('follows').delete().eq('following_id', userId);

        await supabase.from('messages').delete().eq('sender_id', userId);
        await supabase.from('messages').delete().eq('receiver_id', userId);

        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (error) throw error;

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Admin delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// ─── GET USER POSTS ────────────────────────────────────────────────────────
// GET /api/admin/users/:userId/posts
router.get('/users/:userId/posts', adminMiddleware, async (req, res) => {
    const { userId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const { data: posts, error, count } = await supabase
        .from('posts')
        .select(`
            id, image_url, caption, created_at,
            likes(count),
            comments(count)
        `, { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('Admin get user posts error:', error);
        return res.status(500).json({ error: 'Failed to fetch posts' });
    }

    const enriched = (posts || []).map(p => ({
        ...p,
        likes_count:    p.likes?.[0]?.count    ?? 0,
        comments_count: p.comments?.[0]?.count ?? 0,
    }));

    res.json({
        posts: enriched,
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
    });
});

// ─── DELETE SINGLE POST ───────────────────────────────────────────────────
// DELETE /api/admin/posts/:postId
router.delete('/posts/:postId', adminMiddleware, async (req, res) => {
    const { postId } = req.params;

    try {
        // Remove likes and comments first
        await supabase.from('likes').delete().eq('post_id', postId);
        await supabase.from('comments').delete().eq('post_id', postId);

        const { error } = await supabase.from('posts').delete().eq('id', postId);
        if (error) throw error;

        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Admin delete post error:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

module.exports = router;
