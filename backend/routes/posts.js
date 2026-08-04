const express = require('express');
const multer = require('multer');
const supabase = require('../supabase');
const { withRetry } = require('../lib/supabaseRetry');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image/video files are allowed'), false);
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
      id, image_url, image_urls, caption, created_at,
      user:users!posts_user_id_fkey(*),
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

    // Fetch followed user IDs if current user is authenticated
    let followedUserIds = new Set();
    if (currentUserId) {
        const { data: followsData } = await withRetry(() =>
            supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', currentUserId)
                .eq('status', 'accepted')
        );
        if (followsData) {
            followsData.forEach(f => followedUserIds.add(f.following_id));
        }
    }

    // Enrich posts with user info and like status, and filter private posts
    const enrichedPosts = (posts || [])
        .filter(post => {
            // If post user is not private, always show
            if (!post.user?.is_private) return true;
            // If current user is the owner of the post, always show
            if (post.user.id === currentUserId) return true;
            // If current user follows the post owner, show
            if (followedUserIds.has(post.user.id)) return true;
            // Otherwise, hide private posts
            return false;
        })
        .map(post => ({
            ...post,
            user: { id: post.user.id, username: post.user.username, profile_image: post.user.profile_image, is_private: post.user.is_private, hide_likes: post.user.hide_likes },
            likes_count: post.likes?.[0]?.count ?? 0,
            comments_count: post.comments?.[0]?.count ?? 0,
            liked_by_me: userLikes.has(post.id),
        }));

    res.json({
        posts: enrichedPosts,
        total: count,
        page,
        hasMore: offset + limit < count,
    });
});

// GET /api/posts/cloudinary-signature - Get signature for direct frontend upload
router.get('/cloudinary-signature', authMiddleware, (req, res) => {
    try {
        const { generateSignature } = require('../cloudinary');
        const signData = generateSignature('posts');
        res.json(signData);
    } catch (err) {
        console.error('Signature error:', err);
        res.status(500).json({ error: 'Failed to generate signature' });
    }
});

// POST /api/posts - Create a new post
router.post('/', authMiddleware, upload.array('images', 10), async (req, res) => {
    const { caption, videoUrl } = req.body;
    const files = req.files || [];

    if (files.length === 0 && !videoUrl) {
        return res.status(400).json({ error: 'Media files or video URL is required' });
    }

    if (!caption || caption.trim() === '') {
        return res.status(400).json({ error: 'Caption is required' });
    }

    let imageUrl = videoUrl || '';
    let imageUrls = [];

    if (videoUrl) {
        imageUrls.push(videoUrl);
    } else {
        // Upload images/videos to storage
        for (const file of files) {
            const fileExt = file.mimetype.split('/')[1];
            const isVideo = file.mimetype.startsWith('video/');

            if (isVideo) {
                try {
                    const { uploadToCloudinary } = require('../cloudinary');
                    const result = await uploadToCloudinary(file.buffer, 'video', 'posts');
                    imageUrls.push(result.secure_url);
                    if (!imageUrl) imageUrl = result.secure_url;
                } catch (uploadError) {
                    console.error('Video upload error:', uploadError);
                    return res.status(500).json({ error: 'Failed to upload video' });
                }
            } else {
                const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
                const fileName = `post-${req.user.id}-${uniqueId}.${fileExt}`;

                // Upload image to Supabase Storage
                const { error: uploadError } = await supabase.storage
                    .from('posts')
                    .upload(fileName, file.buffer, {
                        contentType: file.mimetype,
                        upsert: false,
                    });

                if (uploadError) {
                    console.error('Image upload error:', uploadError);
                    return res.status(500).json({ error: 'Failed to upload image' });
                }

                const { data: urlData } = supabase.storage.from('posts').getPublicUrl(fileName);
                imageUrls.push(urlData.publicUrl);
                if (!imageUrl) imageUrl = urlData.publicUrl;
            }
        }
    }

    // Save post to database
    const { data: post, error } = await supabase
        .from('posts')
        .insert({
            user_id: req.user.id,
            image_url: imageUrl,
            image_urls: imageUrls,
            caption: caption.trim(),
        })
        .select(`
      id, image_url, image_urls, caption, created_at,
      user:users!posts_user_id_fkey(*)
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
        .select('id, user_id, image_url, image_urls')
        .eq('id', id)
        .single();

    if (error || !post) {
        return res.status(404).json({ error: 'Post not found' });
    }

    if (post.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    // Delete images from storage (only for Supabase Storage objects, skip Cloudinary videos)
    const urlsToDelete = post.image_urls && post.image_urls.length > 0 
        ? post.image_urls 
        : [post.image_url];
    
    const fileNames = urlsToDelete
        .filter(url => url && !url.includes('cloudinary.com'))
        .map(url => {
            const urlParts = url.split('/');
            return urlParts[urlParts.length - 1];
        });

    if (fileNames.length > 0) {
        try {
            await supabase.storage.from('posts').remove(fileNames);
        } catch (storageError) {
            console.error('Failed to remove post images from storage:', storageError);
        }
    }

    // Delete post (likes and comments will cascade)
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', id);

    if (deleteError) {
        return res.status(500).json({ error: 'Failed to delete post' });
    }

    res.json({ message: 'Post deleted successfully' });
});

// PUT /api/posts/:id - Update a post caption (owner only)
router.put('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { caption } = req.body;

    if (!caption || caption.trim() === '') {
        return res.status(400).json({ error: 'Caption is required' });
    }

    // Verify ownership
    const { data: post, error } = await supabase
        .from('posts')
        .select('id, user_id')
        .eq('id', id)
        .single();

    if (error || !post) {
        return res.status(404).json({ error: 'Post not found' });
    }

    if (post.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only edit your own posts' });
    }

    const { data: updatedPost, error: updateError } = await supabase
        .from('posts')
        .update({ caption: caption.trim() })
        .eq('id', id)
        .select()
        .single();

    if (updateError) {
        return res.status(500).json({ error: 'Failed to update post' });
    }

    res.json({ post: updatedPost });
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
      user:users!comments_user_id_fkey(*)
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
      user:users!comments_user_id_fkey(*)
    `)
        .single();

    if (error) {
        return res.status(500).json({ error: 'Failed to add comment' });
    }

    res.status(201).json({ comment });
});

// GET /api/posts/:id/likes - Get all users who liked a post
router.get('/:id/likes', async (req, res) => {
    const { id: postId } = req.params;

    const { data: likes, error } = await supabase
        .from('likes')
        .select(`
            user:users!likes_user_id_fkey(*)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

    if (error) {
        return res.status(500).json({ error: 'Failed to fetch likes' });
    }

    res.json({ likes: likes ? likes.map(l => l.user) : [] });
});

module.exports = router;
