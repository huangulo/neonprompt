module.exports = (req, res, next) => {
    console.log('[DEBUG] Session exists:', !!req.session);
    console.log('[DEBUG] Session authenticated:', req.session?.authenticated);
    console.log('[DEBUG] Session ID:', req.sessionID);
    console.log('[DEBUG] Cookie:', req.headers.cookie);
    next();
};
