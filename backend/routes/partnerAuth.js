import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database/init.js';
import { authenticateToken, requirePartner } from '../middleware/auth.js';
import { generateAccessToken, generateRefreshToken, rotateRefreshToken, revokeAllUserTokens, setAuthCookies, clearAuthCookies } from '../utils/tokens.js';
import { activityLogger } from '../services/activityLogger.js';

const router = Router();

// Partner Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email et mot de passe requis' });
        }

        const user = await db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', email);
        if (!user) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        if (user.is_active === 0) {
            return res.status(403).json({ error: 'Compte désactivé.' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Verify if user is a partner (influencer)
        const userRoleRow = await db.get(`
            SELECT r.key 
            FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            WHERE ur.user_id = ? AND r.key = 'influencer'
        `, user.id);

        const isPartiallyAdmin = user.is_admin || user.can_manage_users || user.can_view_stats;

        if (!userRoleRow && !isPartiallyAdmin) {
            return res.status(403).json({ error: 'Ce compte n\'a pas les accès partenaire.' });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user.id);
        setAuthCookies(res, accessToken, refreshToken);

        const { password: _, ...userWithoutPassword } = user;

        await activityLogger.log({
            userId: user.id,
            action: 'partner_login',
            entityType: 'user',
            entityId: user.id,
            req
        });

        res.json({
            message: 'Connexion réussie',
            user: { ...userWithoutPassword, roles: ['influencer'] }
        });
    } catch (error) {
        console.error('Partner Login error:', error);
        res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
});

// Get Partner Me
router.get('/me', authenticateToken, requirePartner, async (req, res) => {
    try {
        const user = await db.get('SELECT id, email, name, company, is_admin, created_at, notification_number FROM users WHERE id = ?', req.user.id);
        
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        res.json({ user: { ...user, roles: ['influencer'] } });
    } catch (error) {
        console.error('Partner Get user error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Partner Refresh access token
router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies?.refresh_token;
        if (!refreshToken) return res.status(401).json({ error: 'Refresh token manquant' });

        const result = await rotateRefreshToken(refreshToken);
        if (!result) {
            clearAuthCookies(res);
            return res.status(401).json({ error: 'Session expirée' });
        }

        // Verify partner status again during refresh just in case it was revoked
        const userRoleRow = await db.get(`
            SELECT r.key 
            FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            WHERE ur.user_id = ? AND r.key = 'influencer'
        `, result.user.id);

        if (!userRoleRow && !result.user.is_admin) {
            clearAuthCookies(res);
            return res.status(403).json({ error: 'Accès partenaire révoqué' });
        }

        setAuthCookies(res, result.accessToken, result.refreshToken);

        res.json({ user: { ...result.user, roles: ['influencer'] } });
    } catch (err) {
        console.error('Partner Refresh token error:', err);
        clearAuthCookies(res);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        await revokeAllUserTokens(req.user.id);
        clearAuthCookies(res);
        res.json({ message: 'Déconnecté avec succès' });
    } catch (err) {
        console.error('Partner Logout error:', err);
        res.status(500).json({ error: 'Erreur lors de la déconnexion' });
    }
});

export default router;
