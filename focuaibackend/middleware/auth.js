const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
  
    const authHeader = req.header('Authorization');
    
    
    console.log('Auth header received:', authHeader);
    

    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header provided' });
    }
    
    
   
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : authHeader;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
  
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('Token decoded, user:', { id: decoded.userId, email: decoded.email });
    
  
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    if (user.email !== decoded.email) {
      return res.status(401).json({ error: 'User email mismatch' });
    }
    
    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(401).json({ error: 'Please authenticate. ' + error.message });
  }
};

module.exports = auth;