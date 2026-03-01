const express = require('express');
const multer = require('multer');
const supabase = require('../supabase');
const { withRetry } = require('../lib/supabaseRetry');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    },
});

// GET /api/posts - Global feed (latest posts)
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get auth user optionally
    let currentUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwt = require('jsonwebtoken');
        try {
            const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
            currentUserId = decoded.userId;
        } catch { }
    }

    const { data: posts, error, count } = await withRetry(() =>
        supabase
            .from('posts')
            .select(`
      id, image_url, caption, created_at,
      user:users!posts_user_id_fkey(id, username, profile_image),
      likes(count),
      comments(count)
    `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)
    );

    if (error) {
        console.error('Fetch posts error:', error);
        return res.status(500).json({ error: 'Failed to fetch posts' });
    }

    // Fetch likes by current user if authenticated
    let userLikes = new Set();
    if (currentUserId && posts && posts.length > 0) {
        const postIds = posts.map((p) => p.id);
        const { data: likes } = await withRetry(() =>
            supabase
                .from('likes')
                .select('post_id')
                .eq('user_id', currentUserId)
                .in('post_id', postIds)
        );

        if (likes) {
            likes.forEach((l) => userLikes.add(l.post_id));
        }
    }

    const enriched = (posts || []).map((post) => ({
        ...post,
        likes_count: post.likes?.[0]?.count ?? 0,
        comments_count: post.comments?.[0]?.count ?? 0,
        liked_by_me: userLikes.has(post.id),
    }));

    res.json({
        posts: enriched,
        total: count,
        page,
        hasMore: offset + limit < count,
    });
});

// POST /api/posts - Create a new post
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
    const { caption } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: 'Image is required' });
    }

    if (!caption || caption.trim() === '') {
        return res.status(400).json({ error: 'Caption is required' });
    }

    const fileExt = req.file.mimetype.split('/')[1];
    const fileName = `post-${req.user.id}-${Date.now()}.${fileExt}`;

    // Upload image to Supabase Storage
    const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false,
        });

    if (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(500).json({ error: 'Failed to upload image' });
    }

    const { data: urlData } = supabase.storage.from('posts').getPublicUrl(fileName);
    const imageUrl = urlData.publicUrl;

    // Save post to database
    const { data: post, error } = await supabase
        .from('posts')
        .insert({
            user_id: req.user.id,
            image_url: imageUrl,
            caption: caption.trim(),
        })
        .select(`
      id, image_url, caption, created_at,
      user:users!posts_user_id_fkey(id, username, profile_image)
    `)
        .single();

    if (error) {
        console.error('Create post error:', error);
        return res.status(500).json({ error: 'Failed to create post' });
    }

    res.status(201).json({ post: { ...post, likes_count: 0, comments_count: 0, liked_by_me: false } });
});

// DELETE /api/posts/:id - Delete a post (owner only)
router.delete('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;

    // Verify ownership
    const { data: post, error } = await supabase
        .from('posts')
        .select('id, user_id, image_url')
        .eq('id', id)
        .single();

    if (error || !post) {
        return res.status(404).json({ error: 'Post not found' });
    }

    if (post.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    // Delete image from storage
    const urlParts = post.image_url.split('/');
    const storageFileName = urlParts[urlParts.length - 1];
    await supabase.storage.from('posts').remove([storageFileName]);

    // Delete post (likes and comments will cascade)
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', id);

    if (deleteError) {
        return res.status(500).json({ error: 'Failed to delete post' });
    }

    res.json({ message: 'Post deleted successfully' });
});

// POST /api/posts/:id/like - Like or unlike a post
router.post('/:id/like', authMiddleware, async (req, res) => {
    const { id: postId } = req.params;
    const userId = req.user.id;

    // Check if post exists
    const { data: post } = await supabase.from('posts').select('id').eq('id', postId).single();
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Check if already liked
    const { data: existing } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

    if (existing) {
        // Unlike
        await supabase.from('likes').delete().eq('id', existing.id);

        const { count } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);

        return res.json({ liked: false, likes_count: count || 0 });
    } else {
        // Like
        await supabase.from('likes').insert({ post_id: postId, user_id: userId });

        const { count } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);

        return res.json({ liked: true, likes_count: count || 0 });
    }
});

// GET /api/posts/:id/comments - Get all comments for a post
router.get('/:id/comments', async (req, res) => {
    const { id: postId } = req.params;

    const { data: comments, error } = await supabase
        .from('comments')
        .select(`
      id, comment_text, created_at,
      user:users!comments_user_id_fkey(id, username, profile_image)
    `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (error) {
        return res.status(500).json({ error: 'Failed to fetch comments' });
    }

    res.json({ comments: comments || [] });
});

// POST /api/posts/:id/comments - Add a comment
router.post('/:id/comments', authMiddleware, async (req, res) => {
    const { id: postId } = req.params;
    const { comment_text } = req.body;

    if (!comment_text || comment_text.trim() === '') {
        return res.status(400).json({ error: 'Comment text is required' });
    }

    // Check if post exists
    const { data: post } = await supabase.from('posts').select('id').eq('id', postId).single();
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const { data: comment, error } = await supabase
        .from('comments')
        .insert({
            post_id: postId,
            user_id: req.user.id,
            comment_text: comment_text.trim(),
        })
        .select(`
      id, comment_text, created_at,
      user:users!comments_user_id_fkey(id, username, profile_image)
    `)
        .single();

    if (error) {
        return res.status(500).json({ error: 'Failed to add comment' });
    }

    res.status(201).json({ comment });
});

module.exports = router;
