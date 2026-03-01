const express = require('express');
const multer = require('multer');
const supabase = require('../supabase');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image/video files are allowed'), false);
        }
    },
});

// 24-hour cutoff helper
const getCutoff = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

// ─── GET /api/stories — All active stories grouped by user ────────────
router.get('/', async (req, res) => {
    const cutoff = getCutoff();

    // Get current user optionally
    let currentUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwt = require('jsonwebtoken');
        try {
            const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
            currentUserId = decoded.userId;
        } catch { }
    }

    // Fetch stories with counts
    const { data: stories, error } = await supabase
        .from('stories')
        .select(`
            id, image_url, caption, created_at,
            user:users!stories_user_id_fkey(id, username, profile_image),
            views_count:story_views(count),
            likes_count:story_likes(count)
        `)
        .gt('created_at', cutoff)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Fetch stories error:', error);
        return res.status(500).json({ error: 'Failed to fetch stories' });
    }

    // Check which stories the current user has liked
    let likedStoryIds = new Set();
    let viewedStoryIds = new Set();
    if (currentUserId && stories?.length > 0) {
        const storyIds = stories.map(s => s.id);
        const [{ data: myLikes }, { data: myViews }] = await Promise.all([
            supabase.from('story_likes').select('story_id').eq('user_id', currentUserId).in('story_id', storyIds),
            supabase.from('story_views').select('story_id').eq('viewer_id', currentUserId).in('story_id', storyIds)
        ]);
        if (myLikes) myLikes.forEach(l => likedStoryIds.add(l.story_id));
        if (myViews) myViews.forEach(v => viewedStoryIds.add(v.story_id));
    }

    // Group stories by user
    const userMap = new Map();
    for (const story of (stories || [])) {
        const userId = story.user?.id;
        if (!userId) continue;

        if (!userMap.has(userId)) {
            userMap.set(userId, {
                user: story.user,
                stories: [],
                hasUnviewed: false,
                latestAt: story.created_at,
            });
        }

        const enrichedStory = {
            id: story.id,
            image_url: story.image_url,
            caption: story.caption,
            created_at: story.created_at,
            views_count: story.views_count?.[0]?.count || 0,
            viewed_by_me: viewedStoryIds.has(story.id),
            likes_count: story.likes_count?.[0]?.count || 0,
            liked_by_me: likedStoryIds.has(story.id),
        };

        userMap.get(userId).stories.push(enrichedStory);
        if (!enrichedStory.viewed_by_me) {
            userMap.get(userId).hasUnviewed = true;
        }
    }

    // Sort: current user first, then unviewed, then viewed, each by latest
    let grouped = Array.from(userMap.values());
    grouped.sort((a, b) => {
        if (a.user.id === currentUserId) return -1;
        if (b.user.id === currentUserId) return 1;
        if (a.hasUnviewed !== b.hasUnviewed) return a.hasUnviewed ? -1 : 1;
        return new Date(b.latestAt) - new Date(a.latestAt);
    });

    res.json({ storyGroups: grouped });
});

// ─── POST /api/stories — Upload a new story ──────────────────────────
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
    const { caption } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: 'Image is required' });
    }

    const fileExt = req.file.mimetype.split('/')[1];
    const fileName = `story-${req.user.id}-${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false,
        });

    if (uploadError) {
        console.error('Story upload error:', uploadError);
        return res.status(500).json({ error: 'Failed to upload story image' });
    }

    const { data: urlData } = supabase.storage.from('stories').getPublicUrl(fileName);
    const imageUrl = urlData.publicUrl;

    // Save to database
    const { data: story, error } = await supabase
        .from('stories')
        .insert({
            user_id: req.user.id,
            image_url: imageUrl,
            caption: (caption || '').trim(),
        })
        .select(`
            id, image_url, caption, created_at,
            user:users!stories_user_id_fkey(id, username, profile_image)
        `)
        .single();

    if (error) {
        console.error('Create story error:', error);
        return res.status(500).json({ error: 'Failed to create story' });
    }

    res.status(201).json({
        story: {
            ...story,
            views_count: 0,
            viewed_by_me: true,
        },
    });
});

// ─── POST /api/stories/:id/view — Record a view ─────────────────────
router.post('/:id/view', authMiddleware, async (req, res) => {
    const { id: storyId } = req.params;
    const viewerId = req.user.id;

    // Don't record self-views
    const { data: story } = await supabase
        .from('stories')
        .select('user_id')
        .eq('id', storyId)
        .single();

    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (story.user_id === viewerId) return res.json({ recorded: false });

    // Upsert view (ignore if already exists via UNIQUE constraint)
    const { error } = await supabase
        .from('story_views')
        .upsert(
            { story_id: storyId, viewer_id: viewerId },
            { onConflict: 'story_id,viewer_id' }
        );

    if (error) {
        console.error('Record view error:', error);
        return res.status(500).json({ error: 'Failed to record view' });
    }

    res.json({ recorded: true });
});

// ─── GET /api/stories/:id/viewers — Get viewers of a story ──────────
router.get('/:id/viewers', authMiddleware, async (req, res) => {
    const { id: storyId } = req.params;

    // Verify ownership
    const { data: story } = await supabase
        .from('stories')
        .select('user_id')
        .eq('id', storyId)
        .single();

    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (story.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Only the story owner can view viewers' });
    }

    const [{ data: views, error: viewsError }, { data: likes }] = await Promise.all([
        supabase
            .from('story_views')
            .select(`
                viewed_at,
                viewer:users!story_views_viewer_id_fkey(id, username, profile_image)
            `)
            .eq('story_id', storyId)
            .order('viewed_at', { ascending: false }),
        supabase
            .from('story_likes')
            .select('user_id')
            .eq('story_id', storyId)
    ]);

    if (viewsError) {
        console.error('Fetch viewers error:', viewsError);
        return res.status(500).json({ error: 'Failed to fetch viewers' });
    }

    const likedUserIds = new Set(likes?.map(l => l.user_id) || []);
    const viewersWithLikes = (views || []).map(v => ({
        ...v,
        has_liked: likedUserIds.has(v.viewer?.id)
    }));

    res.json({ viewers: viewersWithLikes });
});

// ─── POST /api/stories/:id/like — Toggle like on a story ────────────
router.post('/:id/like', authMiddleware, async (req, res) => {
    const { id: storyId } = req.params;
    const userId = req.user.id;

    const { data: story } = await supabase
        .from('stories')
        .select('id, user_id')
        .eq('id', storyId)
        .single();

    if (!story) return res.status(404).json({ error: 'Story not found' });

    // Check if already liked
    const { data: existing } = await supabase
        .from('story_likes')
        .select('id')
        .eq('story_id', storyId)
        .eq('user_id', userId)
        .maybeSingle();

    if (existing) {
        // Unlike
        const { error: deleteError } = await supabase.from('story_likes').delete().eq('id', existing.id);
        if (deleteError) {
            console.error('Unlike error:', deleteError);
            return res.status(500).json({ error: 'Failed to unlike story' });
        }
    } else {
        // Like
        const { error: insertError } = await supabase.from('story_likes').insert({ story_id: storyId, user_id: userId });
        if (insertError) {
            console.error('Like error:', insertError);
            return res.status(500).json({ error: 'Failed to like story' });
        }

        // Also record a view if not owner (socially, liking implies viewing)
        if (story.user_id !== userId) {
            try {
                await supabase.from('story_views').upsert(
                    { story_id: storyId, viewer_id: userId },
                    { onConflict: 'story_id,viewer_id' }
                );
            } catch (e) {
                // Non-critical, ignore
            }
        }
    }

    // Return updated count
    const { count, error: countError } = await supabase
        .from('story_likes')
        .select('*', { count: 'exact', head: true })
        .eq('story_id', storyId);

    if (countError) {
        console.error('Fetch likes count error:', countError);
    }

    res.json({ liked: !existing, likes_count: count || 0 });
});

// ─── POST /api/stories/:id/reply — Send a reply to a story ─────────
router.post('/:id/reply', authMiddleware, async (req, res) => {
    const { id: storyId } = req.params;
    const { content } = req.body;
    const senderId = req.user.id;

    if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Reply cannot be empty' });
    }
    if (content.trim().length > 500) {
        return res.status(400).json({ error: 'Reply too long (max 500 chars)' });
    }

    // Make sure story exists
    const { data: story } = await supabase
        .from('stories')
        .select('id, user_id, users!stories_user_id_fkey(id, username)')
        .eq('id', storyId)
        .single();

    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (story.user_id === senderId) {
        return res.status(400).json({ error: 'You cannot reply to your own story' });
    }

    // Save reply
    const { data: reply, error } = await supabase
        .from('story_replies')
        .insert({ story_id: storyId, sender_id: senderId, content: content.trim() })
        .select(`
            id, content, created_at,
            sender:users!story_replies_sender_id_fkey(id, username, profile_image)
        `)
        .single();

    if (error) {
        console.error('Story reply error:', error);
        return res.status(500).json({ error: 'Failed to send reply' });
    }

    // Also send as a direct message to the story owner so they see it in DMs
    // NOTE: Supabase v2 query builders are thenables, NOT full Promises — use try/catch
    try {
        await supabase.from('messages').insert({
            sender_id: senderId,
            receiver_id: story.user_id,
            content: `Replied to your story: "${content.trim()}"`,
        });
    } catch { /* non-critical — don't fail the reply if DM forward fails */ }

    res.status(201).json({ reply });
});

// ─── GET /api/stories/:id/replies — Get replies (story owner only) ───
router.get('/:id/replies', authMiddleware, async (req, res) => {
    const { id: storyId } = req.params;

    const { data: story } = await supabase
        .from('stories')
        .select('user_id')
        .eq('id', storyId)
        .single();

    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (story.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Only the story owner can see replies' });
    }

    const { data: replies, error } = await supabase
        .from('story_replies')
        .select(`
            id, content, created_at,
            sender:users!story_replies_sender_id_fkey(id, username, profile_image)
        `)
        .eq('story_id', storyId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Fetch replies error:', error);
        return res.status(500).json({ error: 'Failed to fetch replies' });
    }

    res.json({ replies: replies || [] });
});

// ─── DELETE /api/stories/:id — Manually delete a story ──────────────
router.delete('/:id', authMiddleware, async (req, res) => {
    const { id: storyId } = req.params;

    // Verify ownership
    const { data: story } = await supabase
        .from('stories')
        .select('id, user_id, image_url')
        .eq('id', storyId)
        .single();

    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (story.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only delete your own stories' });
    }

    // Delete image from storage
    const urlParts = story.image_url.split('/');
    const storageFileName = urlParts[urlParts.length - 1];
    await supabase.storage.from('stories').remove([storageFileName]);

    // Delete from DB (views will cascade)
    const { error } = await supabase.from('stories').delete().eq('id', storyId);

    if (error) {
        console.error('Delete story error:', error);
        return res.status(500).json({ error: 'Failed to delete story' });
    }

    res.json({ message: 'Story deleted' });
});

// ─── CLEANUP: Delete expired stories (run periodically) ─────────────
// This runs on server start and every hour
const cleanupExpiredStories = async () => {
    const cutoff = getCutoff();
    try {
        // Get expired stories to clean up their storage files
        const { data: expired } = await supabase
            .from('stories')
            .select('id, image_url')
            .lt('created_at', cutoff);

        if (expired && expired.length > 0) {
            // Delete storage files
            const fileNames = expired.map(s => {
                const parts = s.image_url.split('/');
                return parts[parts.length - 1];
            });
            await supabase.storage.from('stories').remove(fileNames);

            // Delete from database (views cascade)
            const ids = expired.map(s => s.id);
            await supabase.from('stories').delete().in('id', ids);
            console.log(`🧹 Cleaned up ${expired.length} expired stories`);
        }
    } catch (err) {
        console.error('Story cleanup error:', err.message);
    }
};

// Run cleanup on import & every hour
cleanupExpiredStories();
setInterval(cleanupExpiredStories, 60 * 60 * 1000);

module.exports = router;
