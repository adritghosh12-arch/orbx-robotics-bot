import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

export const generateToken = (userId, email) => {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '30d' });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
};

export const middleware = (handler) => {
  return async (req, res) => {
    const token = extractToken(req);
    const decoded = token ? verifyToken(token) : null;
    
    req.user = decoded;
    return handler(req, res);
  };
};

export const requireAuth = (handler) => {
  return middleware(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return handler(req, res);
  });
};
