const jwt = require('jsonwebtoken');
const supabase = require('../supabase');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch current user data from DB
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, username, bio, profile_image')
            .eq('id', decoded.userId)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = authMiddleware;
