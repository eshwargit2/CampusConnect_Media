const express = require('express');
const supabase = require('../supabase');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ─── GET /api/messages — Get all conversations for current user ──────
router.get('/', authMiddleware, async (req, res) => {
    const userId = req.user.id;

    // Get all messages involving this user, latest per conversation partner
    const { data: msgs, error } = await supabase
        .from('messages')
        .select(`
            id, sender_id, receiver_id, content, read_at, created_at
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Failed to fetch messages' });

    // Group into conversations (one entry per partner)
    const convMap = new Map();
    for (const msg of (msgs || [])) {
        const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        if (!convMap.has(partnerId)) {
            convMap.set(partnerId, msg);
        }
    }

    if (convMap.size === 0) return res.json({ conversations: [] });

    // Fetch partner user info
    const partnerIds = Array.from(convMap.keys());
    const { data: users } = await supabase
        .from('users')
        .select('id, username, profile_image')
        .in('id', partnerIds);

    const userMap = {};
    (users || []).forEach(u => { userMap[u.id] = u; });

    // Count unread per conversation
    const { data: unreadRows } = await supabase
        .from('messages')
        .select('sender_id, id')
        .eq('receiver_id', userId)
        .is('read_at', null);

    const unreadByPartner = {};
    (unreadRows || []).forEach(r => {
        unreadByPartner[r.sender_id] = (unreadByPartner[r.sender_id] || 0) + 1;
    });

    const conversations = partnerIds.map(partnerId => ({
        partner: userMap[partnerId] || { id: partnerId, username: 'Unknown' },
        lastMessage: convMap.get(partnerId),
        unread: unreadByPartner[partnerId] || 0,
    })).sort((a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at));

    res.json({ conversations });
});

// ─── GET /api/messages/unread-count — Total unread for current user ──
router.get('/unread-count', authMiddleware, async (req, res) => {
    const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', req.user.id)
        .is('read_at', null);
    res.json({ count: count || 0 });
});

// ─── GET /api/messages/:partnerId — Get message thread ───────────────
router.get('/:partnerId', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { partnerId } = req.params;

    const { data: messages, error } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, read_at, created_at')
        .or(
            `and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`
        )
        .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: 'Failed to fetch messages' });

    // Mark all received messages as read
    const unreadIds = (messages || [])
        .filter(m => m.receiver_id === userId && !m.read_at)
        .map(m => m.id);

    if (unreadIds.length > 0) {
        await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadIds);
    }

    // Fetch partner info
    const { data: partner } = await supabase
        .from('users')
        .select('id, username, profile_image')
        .eq('id', partnerId)
        .single();

    res.json({ messages: messages || [], partner });
});

// ─── POST /api/messages/:partnerId — Send a message ──────────────────
router.post('/:partnerId', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { partnerId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Message content is required' });
    }

    if (userId === partnerId) {
        return res.status(400).json({ error: 'Cannot message yourself' });
    }

    const { data: msg, error } = await supabase
        .from('messages')
        .insert({
            sender_id: userId,
            receiver_id: partnerId,
            content: content.trim(),
        })
        .select('id, sender_id, receiver_id, content, read_at, created_at')
        .single();

    if (error) {
        console.error('Send message error:', error);
        return res.status(500).json({ error: 'Failed to send message' });
    }

    res.status(201).json({ message: msg });
});

// ─── PATCH /api/messages/:messageId — Edit own message ───────────────
router.patch('/:messageId', authMiddleware, async (req, res) => {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Content is required' });
    }

    const { data: msg } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();

    if (!msg || msg.sender_id !== req.user.id) {
        return res.status(403).json({ error: 'Cannot edit this message' });
    }

    const { data: updated, error } = await supabase
        .from('messages')
        .update({ content: content.trim() })
        .eq('id', messageId)
        .select('id, sender_id, receiver_id, content, read_at, created_at')
        .single();

    if (error) return res.status(500).json({ error: 'Failed to edit message' });
    res.json({ message: updated });
});

// ─── DELETE /api/messages/:messageId — Delete own message ────────────
router.delete('/:messageId', authMiddleware, async (req, res) => {
    const { messageId } = req.params;

    const { data: msg } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();

    if (!msg || msg.sender_id !== req.user.id) {
        return res.status(403).json({ error: 'Cannot delete this message' });
    }

    await supabase.from('messages').delete().eq('id', messageId);
    res.json({ ok: true });
});

module.exports = router;
