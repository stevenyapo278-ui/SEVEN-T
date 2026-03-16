import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { contentExtractor } from '../services/contentExtractor.js';
import { indexAgentKnowledge, indexGlobalKnowledge, deleteChunksBySource } from '../services/knowledgeRetrieval.js';
import { activityLogger } from '../services/activityLogger.js';
import { getPlan, isLimitReached, getEffectivePlanName } from '../config/plans.js';

const router = Router();
const MAX_KNOWLEDGE_CHARS = 150000; // ~150k characters max per item

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads/knowledge';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.txt', '.md', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Type de fichier non supporté: ${ext}`));
        }
    }
});

// Get all knowledge items for an agent
router.get('/agent/:agentId', authenticateToken, async (req, res) => {
    try {
        const agent = await db.get('SELECT id FROM agents WHERE id = ? AND user_id = ?', req.params.agentId, req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        const items = await db.all(`
            SELECT * FROM knowledge_base 
            WHERE agent_id = ?
            ORDER BY created_at DESC
        `, req.params.agentId);

        // Parse metadata for each item
        const parsedItems = items.map(item => {
            let metadata = {};
            try {
                metadata = item.metadata ? JSON.parse(item.metadata) : {};
            } catch (e) {
                console.warn(`[Knowledge] Failed to parse metadata for item ${item.id}:`, e.message);
            }
            return { ...item, metadata };
        });

        // Calculate total characters
        const totalChars = items.reduce((acc, item) => acc + (item.content?.length || 0), 0);

        // Count by type
        const typeStats = {};
        for (const item of items) {
            const type = item.type || 'text';
            typeStats[type] = (typeStats[type] || 0) + 1;
        }

        res.json({ 
            items: parsedItems,
            stats: {
                total_items: items.length,
                total_characters: totalChars,
                by_type: typeStats
            }
        });
    } catch (error) {
        console.error('Get knowledge error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Add knowledge item (text)
router.post('/agent/:agentId', authenticateToken, async (req, res) => {
    try {
        const { title, content, type, metadata, url } = req.body;

        const agent = await db.get('SELECT id FROM agents WHERE id = ? AND user_id = ?', req.params.agentId, req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        // Check plan limits
        const user = await db.get('SELECT plan, subscription_end_date FROM users WHERE id = ?', req.user.id);
        const effectivePlan = await getEffectivePlanName(user.plan, user);
        const itemsCountRow = await db.get('SELECT COUNT(*) as count FROM knowledge_base WHERE agent_id = ?', req.params.agentId);
        const itemsCount = itemsCountRow?.count ?? 0;

        if (await isLimitReached(effectivePlan, 'knowledge_items', itemsCount)) {
            const plan = await getPlan(effectivePlan);
            return res.status(403).json({ 
                error: `Limite de base de connaissances atteinte (${plan.limits.knowledge_items} max)`,
                upgrade_required: true
            });
        }

        let finalContent = content;
        let finalMetadata = metadata || {};
        let finalType = type || 'text';
        let finalTitle = title;

        // If URL is provided, extract content
        if (url) {
            console.log(`[Knowledge] Extracting content from URL: ${url}`);
            const extracted = await contentExtractor.autoExtract(url);
            finalContent = extracted.content;
            finalMetadata = { ...finalMetadata, ...extracted.metadata, sourceUrl: url };
            finalType = extracted.metadata?.type || 'website';
            
            // Use extracted title if not provided
            if (!finalTitle && extracted.title) {
                finalTitle = extracted.title;
            }
        }

        if (!finalTitle || !finalContent) {
            return res.status(400).json({ error: 'Titre et contenu requis' });
        }

        if (finalContent.length > MAX_KNOWLEDGE_CHARS) {
            finalContent = finalContent.substring(0, MAX_KNOWLEDGE_CHARS) + '\n\n... [Contenu tronqué]';
            finalMetadata.characters = finalContent.length;
        }

        const itemId = uuidv4();
        await db.run(`
            INSERT INTO knowledge_base (id, agent_id, title, content, type, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `, itemId, req.params.agentId, finalTitle, finalContent, finalType, JSON.stringify(finalMetadata));

        const item = await db.get('SELECT * FROM knowledge_base WHERE id = ?', itemId);
        let parsedMetadata = {};
        try {
            parsedMetadata = JSON.parse(item.metadata || '{}');
        } catch (e) {
            console.warn(`[Knowledge] Failed to parse metadata for new item ${itemId}`);
        }

        indexAgentKnowledge(req.params.agentId, itemId, finalTitle, finalContent).catch(err =>
            console.warn('[Knowledge] Vector index error:', err?.message)
        );

        await activityLogger.log({
            userId: req.user.id,
            action: 'add_knowledge',
            entityType: 'knowledge',
            entityId: itemId,
            details: { agent_id: req.params.agentId, title: finalTitle, type: finalType },
            req
        });

        res.status(201).json({ 
            message: 'Élément ajouté à la base de connaissances',
            item: {
                ...item,
                metadata: parsedMetadata
            }
        });
    } catch (error) {
        console.error('Add knowledge error:', error);
        res.status(500).json({ error: error.message || 'Erreur lors de l\'ajout' });
    }
});

// Upload file (PDF, TXT, etc.)
router.post('/agent/:agentId/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const { title } = req.body;

        const agent = await db.get('SELECT id FROM agents WHERE id = ? AND user_id = ?', req.params.agentId, req.user.id);
        if (!agent) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        // Check plan limits
        const user = await db.get('SELECT plan, subscription_end_date FROM users WHERE id = ?', req.user.id);
        const effectivePlan = await getEffectivePlanName(user.plan, user);
        const itemsCountRow = await db.get('SELECT COUNT(*) as count FROM knowledge_base WHERE agent_id = ?', req.params.agentId);
        const itemsCount = itemsCountRow?.count ?? 0;

        if (await isLimitReached(effectivePlan, 'knowledge_items', itemsCount)) {
            if (req.file) fs.unlinkSync(req.file.path);
            const plan = await getPlan(effectivePlan);
            return res.status(403).json({ 
                error: `Limite de base de connaissances atteinte (${plan.limits.knowledge_items} max)`,
                upgrade_required: true
            });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Fichier requis' });
        }

        console.log(`[Knowledge] Processing uploaded file: ${req.file.originalname}`);

        const ext = path.extname(req.file.originalname).toLowerCase();
        let content = '';
        let metadata = {
            originalName: req.file.originalname,
            size: req.file.size,
            mimeType: req.file.mimetype
        };

        // Extract content based on file type
        if (ext === '.pdf') {
            const result = await contentExtractor.extractFromPDF(req.file.path);
            content = result.content;
            metadata = { ...metadata, ...result.metadata };
        } else if (['.doc', '.docx'].includes(ext)) {
            const result = await contentExtractor.extractFromWord(req.file.path);
            content = result.content;
            metadata = { ...metadata, ...result.metadata };
        } else if (['.txt', '.md'].includes(ext)) {
            content = fs.readFileSync(req.file.path, 'utf-8');
            metadata.type = ext === '.md' ? 'markdown' : 'text';
            metadata.characters = content.length;
        } else {
            // For other types, try to read as text
            try {
                content = fs.readFileSync(req.file.path, 'utf-8');
                metadata.type = 'text';
                metadata.characters = content.length;
            } catch {
                // Clean up and return error
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: 'Impossible de lire le fichier' });
            }
        }

        // Clean up the uploaded file
        fs.unlinkSync(req.file.path);

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Le fichier ne contient pas de texte extractible' });
        }

        if (content.length > MAX_KNOWLEDGE_CHARS) {
            content = content.substring(0, MAX_KNOWLEDGE_CHARS) + '\n\n... [Contenu tronqué]';
            metadata.characters = content.length;
        }

        // Use original filename as title if not provided
        const finalTitle = title || req.file.originalname.replace(/\.[^/.]+$/, '');

        const itemId = uuidv4();
        await db.run(`
            INSERT INTO knowledge_base (id, agent_id, title, content, type, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `, itemId, req.params.agentId, finalTitle, content, metadata.type || 'pdf', JSON.stringify(metadata));

        const item = await db.get('SELECT * FROM knowledge_base WHERE id = ?', itemId);
        let parsedMetadata = {};
        try {
            parsedMetadata = JSON.parse(item.metadata || '{}');
        } catch (e) {
            console.warn(`[Knowledge] Failed to parse metadata for uploaded item ${itemId}`);
        }

        indexAgentKnowledge(req.params.agentId, itemId, finalTitle, content).catch(err =>
            console.warn('[Knowledge] Vector index error:', err?.message)
        );

        await activityLogger.log({
            userId: req.user.id,
            action: 'upload_knowledge',
            entityType: 'knowledge',
            entityId: itemId,
            details: { agent_id: req.params.agentId, title: finalTitle, fileName: req.file.originalname },
            req
        });

        res.status(201).json({ 
            message: 'Fichier ajouté à la base de connaissances',
            item: {
                ...item,
                metadata: parsedMetadata
            }
        });
    } catch (error) {
        console.error('Upload knowledge error:', error);
        // Clean up file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message || 'Erreur lors de l\'upload' });
    }
});

// Extract content from URL (YouTube or Website)
router.post('/agent/:agentId/extract-url', authenticateToken, async (req, res) => {
    try {
        const { url, title } = req.body;

        const agent = await db.get('SELECT id FROM agents WHERE id = ? AND user_id = ?', req.params.agentId, req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        if (!url) {
            return res.status(400).json({ error: 'URL requise' });
        }

        console.log(`[Knowledge] Extracting content from URL: ${url}`);

        // Detect type and extract
        const urlType = contentExtractor.detectUrlType(url);
        let result;

        if (urlType === 'youtube') {
            result = await contentExtractor.extractFromYouTube(url);
        } else {
            result = await contentExtractor.extractFromWebsite(url);
        }

        if (result.content && result.content.length > MAX_KNOWLEDGE_CHARS) {
            result.content = result.content.substring(0, MAX_KNOWLEDGE_CHARS) + '\n\n... [Contenu tronqué]';
        }

        // Use provided title or extracted title
        const finalTitle = title || result.title || result.metadata?.title || url;

        const itemId = uuidv4();
        await db.run(`
            INSERT INTO knowledge_base (id, agent_id, title, content, type, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `,
            itemId, 
            req.params.agentId, 
            finalTitle, 
            result.content, 
            result.metadata?.type || 'website',
            JSON.stringify({ ...result.metadata, sourceUrl: url })
        );

        const item = await db.get('SELECT * FROM knowledge_base WHERE id = ?', itemId);
        let parsedMetadata = {};
        try {
            parsedMetadata = JSON.parse(item.metadata || '{}');
        } catch (e) {
            console.warn(`[Knowledge] Failed to parse metadata for extracted item ${itemId}`);
        }

        // Customize message based on whether we got full content or fallback
        let message;
        if (result.metadata?.fallback) {
            message = 'Métadonnées de la vidéo ajoutées (transcription non disponible)';
        } else if (urlType === 'youtube') {
            message = 'Transcription YouTube ajoutée';
        } else {
            message = 'Contenu du site web ajouté';
        }

        indexAgentKnowledge(req.params.agentId, itemId, finalTitle, result.content).catch(err =>
            console.warn('[Knowledge] Vector index error:', err?.message)
        );

        await activityLogger.log({
            userId: req.user.id,
            action: 'extract_url_knowledge',
            entityType: 'knowledge',
            entityId: itemId,
            details: { agent_id: req.params.agentId, title: finalTitle, url },
            req
        });

        res.status(201).json({ 
            message,
            item: {
                ...item,
                metadata: parsedMetadata
            },
            metadata: parsedMetadata // Also include at root level for easier access
        });
    } catch (error) {
        console.error('Extract URL error:', error);
        res.status(500).json({ error: error.message || 'Erreur lors de l\'extraction' });
    }
});

// Update knowledge item
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { title, content, type } = req.body;

        const item = await db.get(`
            SELECT k.* FROM knowledge_base k
            JOIN agents a ON k.agent_id = a.id
            WHERE k.id = ? AND a.user_id = ?
        `, req.params.id, req.user.id);

        if (!item) {
            return res.status(404).json({ error: 'Élément non trouvé' });
        }

        await db.run(`
            UPDATE knowledge_base SET 
                title = COALESCE(?, title),
                content = COALESCE(?, content),
                type = COALESCE(?, type)
            WHERE id = ?
        `, title, content, type, req.params.id);

        const updated = await db.get('SELECT * FROM knowledge_base WHERE id = ?', req.params.id);
        let parsedMetadata = {};
        try {
            parsedMetadata = JSON.parse(updated.metadata || '{}');
        } catch (e) {
            console.warn(`[Knowledge] Failed to parse metadata for updated item ${req.params.id}`);
        }

        if (updated && (title != null || content != null)) {
            indexAgentKnowledge(updated.agent_id, req.params.id, updated.title, updated.content).catch(err =>
                console.warn('[Knowledge] Vector index error:', err?.message)
            );
        }

        // Calculate changes
        const changes = {};
        const fieldsToTrack = ['title', 'type'];
        fieldsToTrack.forEach(field => {
            if (req.body[field] !== undefined && String(item[field]) !== String(req.body[field])) {
                changes[field] = { old: item[field], new: req.body[field] };
            }
        });

        await activityLogger.log({
            userId: req.user.id,
            action: 'update_knowledge',
            entityType: 'knowledge',
            entityId: req.params.id,
            details: { 
                title: updated.title,
                changes: Object.keys(changes).length > 0 ? changes : 'Content updated'
            },
            req
        });

        res.json({ 
            item: {
                ...updated,
                metadata: parsedMetadata
            }
        });
    } catch (error) {
        console.error('Update knowledge error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

// Delete knowledge item
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        let item = await db.get(`
            SELECT k.id FROM knowledge_base k
            JOIN agents a ON k.agent_id = a.id
            WHERE k.id = ? AND a.user_id = ?
        `, req.params.id, req.user.id);

        if (item) {
            await deleteChunksBySource('agent', req.params.id);
            await db.run('DELETE FROM knowledge_base WHERE id = ?', req.params.id);
            
            await activityLogger.log({
                userId: req.user.id,
                action: 'delete_knowledge',
                entityType: 'knowledge',
                entityId: req.params.id,
                req
            });
            
            return res.json({ message: 'Élément supprimé' });
        }

        item = await db.get('SELECT id FROM global_knowledge WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        
        if (item) {
            await deleteChunksBySource('global', req.params.id);
            await db.run('DELETE FROM global_knowledge WHERE id = ?', req.params.id);

            await activityLogger.log({
                userId: req.user.id,
                action: 'delete_global_knowledge',
                entityType: 'knowledge',
                entityId: req.params.id,
                req
            });

            return res.json({ message: 'Élément supprimé' });
        }

        return res.status(404).json({ error: 'Élément non trouvé' });
    } catch (error) {
        console.error('Delete knowledge error:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// ============================================
// GLOBAL KNOWLEDGE (User-level, shared across agents)
// ============================================

// Get all global knowledge items
router.get('/global', authenticateToken, async (req, res) => {
    try {
        const items = await db.all(`
            SELECT * FROM global_knowledge 
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, req.user.id);

        const parsedItems = items.map(item => {
            let metadata = {};
            try {
                metadata = JSON.parse(item.metadata || '{}');
            } catch (e) {
                console.warn(`[GlobalKnowledge] Failed to parse metadata for item ${item.id}`);
            }
            return { ...item, metadata };
        });

        res.json({ items: parsedItems });
    } catch (error) {
        console.error('Get global knowledge error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération' });
    }
});

// Add global knowledge item (text)
router.post('/global', authenticateToken, async (req, res) => {
    try {
        const { title, content, type } = req.body;

        // Check plan limits
        const user = await db.get('SELECT plan, subscription_end_date FROM users WHERE id = ?', req.user.id);
        const effectivePlan = await getEffectivePlanName(user.plan, user);
        
        if (effectivePlan === 'free_expired') {
            return res.status(403).json({ 
                error: "Votre période d'essai est terminée. Passez à un plan supérieur pour ajouter des éléments à la base de connaissances.",
                upgrade_required: true
            });
        }

        const itemsCountRow = await db.get('SELECT COUNT(*) as count FROM global_knowledge WHERE user_id = ?', req.user.id);
        const itemsCount = itemsCountRow?.count ?? 0;

        if (await isLimitReached(effectivePlan, 'knowledge_items', itemsCount)) {
            const plan = await getPlan(effectivePlan);
            return res.status(403).json({ 
                error: `Limite de base de connaissances atteinte (${plan.limits.knowledge_items} max)`,
                upgrade_required: true
            });
        }

        if (!title?.trim() || !content?.trim()) {
            return res.status(400).json({ error: 'Titre et contenu requis' });
        }

        let finalContent = content;
        if (finalContent.length > MAX_KNOWLEDGE_CHARS) {
            finalContent = finalContent.substring(0, MAX_KNOWLEDGE_CHARS) + '\n\n... [Contenu tronqué]';
        }

        const itemId = uuidv4();
        await db.run(`
            INSERT INTO global_knowledge (id, user_id, title, content, type, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `, itemId, req.user.id, title, finalContent, type || 'text', JSON.stringify({ characters: finalContent.length }));

        const item = await db.get('SELECT * FROM global_knowledge WHERE id = ?', itemId);
        let parsedMetadata = {};
        try {
            parsedMetadata = JSON.parse(item.metadata || '{}');
        } catch (e) {
            console.warn(`[GlobalKnowledge] Failed to parse metadata for item ${itemId}`);
        }

        indexGlobalKnowledge(itemId, title, content).catch(err =>
            console.warn('[Knowledge] Vector index error:', err?.message)
        );

        await activityLogger.log({
            userId: req.user.id,
            action: 'add_global_knowledge',
            entityType: 'knowledge',
            entityId: itemId,
            details: { title, type: type || 'text' },
            req
        });

        res.status(201).json({ 
            message: 'Ajouté à la base de connaissances',
            item: {
                ...item,
                metadata: parsedMetadata
            }
        });
    } catch (error) {
        console.error('Add global knowledge error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'ajout' });
    }
});

// Upload file to global knowledge
router.post('/global/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        // Check plan limits
        const user = await db.get('SELECT plan, subscription_end_date FROM users WHERE id = ?', req.user.id);
        const effectivePlan = await getEffectivePlanName(user.plan, user);
        
        if (effectivePlan === 'free_expired') {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(403).json({ 
                error: "Votre période d'essai est terminée. Passez à un plan supérieur pour ajouter des fichiers.",
                upgrade_required: true
            });
        }

        const itemsCountRow = await db.get('SELECT COUNT(*) as count FROM global_knowledge WHERE user_id = ?', req.user.id);
        const itemsCount = itemsCountRow?.count ?? 0;

        if (await isLimitReached(effectivePlan, 'knowledge_items', itemsCount)) {
            if (req.file) fs.unlinkSync(req.file.path);
            const plan = await getPlan(effectivePlan);
            return res.status(403).json({ 
                error: `Limite de base de connaissances atteinte (${plan.limits.knowledge_items} max)`,
                upgrade_required: true
            });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Fichier requis' });
        }

        const filePath = req.file.path;
        const originalName = req.file.originalname;
        const ext = path.extname(originalName).toLowerCase();

        console.log(`[GlobalKnowledge] Processing uploaded file: ${originalName}`);

        let content = '';
        let metadata = { type: 'file', originalName };

        // Extract content based on file type
        if (ext === '.pdf') {
            const result = await contentExtractor.extractFromPDF(filePath);
            content = result.content;
            metadata = { ...metadata, ...result.metadata, type: 'pdf' };
        } else if (['.doc', '.docx'].includes(ext)) {
            const result = await contentExtractor.extractFromWord(filePath);
            content = result.content;
            metadata = { ...metadata, ...result.metadata, type: 'docx' };
        } else if (['.txt', '.md'].includes(ext)) {
            content = fs.readFileSync(filePath, 'utf-8');
            metadata.type = 'text';
            metadata.characters = content.length;
        } else {
            // Try to read as text
            content = fs.readFileSync(filePath, 'utf-8');
            metadata.type = 'text';
        }

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        if (!content?.trim()) {
            return res.status(400).json({ error: 'Aucun contenu extrait du fichier' });
        }

        if (content.length > MAX_KNOWLEDGE_CHARS) {
            content = content.substring(0, MAX_KNOWLEDGE_CHARS) + '\n\n... [Contenu tronqué]';
            metadata.characters = content.length;
        }

        const title = req.body.title || originalName.replace(ext, '');
        const itemId = uuidv4();
        
        await db.run(`
            INSERT INTO global_knowledge (id, user_id, title, content, type, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `, itemId, req.user.id, title, content, metadata.type, JSON.stringify(metadata));

        const item = await db.get('SELECT * FROM global_knowledge WHERE id = ?', itemId);
        let parsedMetadata = {};
        try {
            parsedMetadata = JSON.parse(item.metadata || '{}');
        } catch (e) {
            console.warn(`[GlobalKnowledge] Failed to parse metadata for item ${itemId}`);
        }

        indexGlobalKnowledge(itemId, title, content).catch(err =>
            console.warn('[Knowledge] Vector index error:', err?.message)
        );

        await activityLogger.log({
            userId: req.user.id,
            action: 'upload_global_knowledge',
            entityType: 'knowledge',
            entityId: itemId,
            details: { title, fileName: originalName },
            req
        });

        res.status(201).json({ 
            message: 'Fichier ajouté',
            item: {
                ...item,
                metadata: parsedMetadata
            }
        });
    } catch (error) {
        console.error('Upload global knowledge error:', error);
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message || 'Erreur lors de l\'upload' });
    }
});

// Extract URL content for global knowledge
router.post('/global/extract-url', authenticateToken, async (req, res) => {
    try {
        const { url, title } = req.body;

        // Check plan limits
        const user = await db.get('SELECT plan, subscription_end_date FROM users WHERE id = ?', req.user.id);
        const effectivePlan = await getEffectivePlanName(user.plan, user);
        
        if (effectivePlan === 'free_expired') {
            return res.status(403).json({ 
                error: "Votre période d'essai est terminée. Passez à un plan supérieur pour extraire des contenus.",
                upgrade_required: true
            });
        }

        const itemsCountRow = await db.get('SELECT COUNT(*) as count FROM global_knowledge WHERE user_id = ?', req.user.id);
        const itemsCount = itemsCountRow?.count ?? 0;

        if (await isLimitReached(effectivePlan, 'knowledge_items', itemsCount)) {
            const plan = await getPlan(effectivePlan);
            return res.status(403).json({ 
                error: `Limite de base de connaissances atteinte (${plan.limits.knowledge_items} max)`,
                upgrade_required: true
            });
        }

        if (!url) {
            return res.status(400).json({ error: 'URL requise' });
        }

        console.log(`[GlobalKnowledge] Extracting content from URL: ${url}`);

        // Detect type and extract
        const urlType = contentExtractor.detectUrlType(url);
        let result;

        if (urlType === 'youtube') {
            result = await contentExtractor.extractFromYouTube(url);
        } else {
            result = await contentExtractor.extractFromWebsite(url);
        }

        if (result.content && result.content.length > MAX_KNOWLEDGE_CHARS) {
            result.content = result.content.substring(0, MAX_KNOWLEDGE_CHARS) + '\n\n... [Contenu tronqué]';
        }

        const finalTitle = title || result.title || result.metadata?.title || url;
        const itemId = uuidv4();
        
        await db.run(`
            INSERT INTO global_knowledge (id, user_id, title, content, type, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `,
            itemId, 
            req.user.id, 
            finalTitle, 
            result.content, 
            result.metadata?.type || 'website',
            JSON.stringify({ ...result.metadata, sourceUrl: url })
        );

        const item = await db.get('SELECT * FROM global_knowledge WHERE id = ?', itemId);
        let parsedMetadata = {};
        try {
            parsedMetadata = JSON.parse(item.metadata || '{}');
        } catch (e) {
            console.warn(`[GlobalKnowledge] Failed to parse metadata for item ${itemId}`);
        }

        indexGlobalKnowledge(itemId, finalTitle, result.content).catch(err =>
            console.warn('[Knowledge] Vector index error:', err?.message)
        );

        await activityLogger.log({
            userId: req.user.id,
            action: 'extract_url_global_knowledge',
            entityType: 'knowledge',
            entityId: itemId,
            details: { title: finalTitle, url },
            req
        });

        let message;
        if (result.metadata?.fallback) {
            message = 'Métadonnées de la vidéo ajoutées (transcription non disponible)';
        } else if (urlType === 'youtube') {
            message = 'Transcription YouTube ajoutée';
        } else {
            message = 'Contenu du site web ajouté';
        }

        res.status(201).json({ 
            message,
            item: {
                ...item,
                metadata: parsedMetadata
            },
            metadata: parsedMetadata
        });
    } catch (error) {
        console.error('Extract URL global knowledge error:', error);
        res.status(500).json({ error: error.message || 'Erreur lors de l\'extraction' });
    }
});

// Update global knowledge item
router.put('/global/:id', authenticateToken, async (req, res) => {
    try {
        const { title, content, type } = req.body;

        const item = await db.get(`
            SELECT * FROM global_knowledge 
            WHERE id = ? AND user_id = ?
        `, req.params.id, req.user.id);

        if (!item) {
            return res.status(404).json({ error: 'Élément non trouvé' });
        }

        await db.run(`
            UPDATE global_knowledge SET 
                title = COALESCE(?, title),
                content = COALESCE(?, content),
                type = COALESCE(?, type)
            WHERE id = ?
        `, title, content, type, req.params.id);

        const updated = await db.get('SELECT * FROM global_knowledge WHERE id = ?', req.params.id);
        let parsedMetadata = {};
        try {
            parsedMetadata = JSON.parse(updated.metadata || '{}');
        } catch (e) {
            console.warn(`[GlobalKnowledge] Failed to parse metadata for updated item ${req.params.id}`);
        }
        
        if (updated && (title != null || content != null)) {
            indexGlobalKnowledge(req.params.id, updated.title, updated.content).catch(err =>
                console.warn('[Knowledge] Vector index error:', err?.message)
            );
        }

        const changes = {};
        if (title !== undefined && String(item.title) !== String(title)) changes.title = { old: item.title, new: title };
        if (type !== undefined && String(item.type) !== String(type)) changes.type = { old: item.type, new: type };

        await activityLogger.log({
            userId: req.user.id,
            action: 'update_global_knowledge',
            entityType: 'knowledge',
            entityId: req.params.id,
            details: { 
                title: updated.title,
                changes: Object.keys(changes).length > 0 ? changes : 'Content updated'
            },
            req
        });

        res.json({ 
            item: {
                ...updated,
                metadata: parsedMetadata
            }
        });
    } catch (error) {
        console.error('Update global knowledge error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

export default router;
