const jwt = require('jsonwebtoken');

const adminMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Admin token required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        req.admin = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired admin token' });
    }
};

module.exports = adminMiddleware;
