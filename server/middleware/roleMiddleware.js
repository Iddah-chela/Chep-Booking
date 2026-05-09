import { hasRole } from '../utils/roleUtils.js';

// Middleware to require admin role
export const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    
    if (!hasRole(req.user, 'admin')) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
    
    next();
};

// Middleware to require house owner role
export const requireOwner = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    
    if (!hasRole(req.user, 'houseOwner') && !hasRole(req.user, 'admin')) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. House owner privileges required.'
        });
    }
    
    next();
};

// Generic middleware to require a specific role
export const requireRole = (requiredRole) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        if (!hasRole(req.user, requiredRole) && !hasRole(req.user, 'admin')) {
            return res.status(403).json({
                success: false,
                message: `Access denied. ${requiredRole} privileges required.`
            });
        }
        
        next();
    };
};
