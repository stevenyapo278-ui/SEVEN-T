import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate, productCreateSchema, productUpdateSchema } from '../middleware/security.js';
import { messageAnalyzer } from '../services/messageAnalyzer.js';
import { requireModule } from '../middleware/requireModule.js';
import { importFromUrl } from '../services/catalogImport.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Type de fichier non supporté. Utilisez JPEG, PNG, WebP ou GIF.'));
        }
    }
});

// Get all products for user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const products = await db.all(`
            SELECT * FROM products 
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, req.user.id);

        // Enrichir avec marge et taux de marge
        const enriched = products.map(p => {
            const salePrice = Number(p.price ?? 0) || 0;
            const costPrice = Number(p.cost_price ?? 0) || 0;
            const margin = salePrice - costPrice;
            const marginRate = costPrice > 0 ? margin / costPrice : null;
            return {
                ...p,
                margin,
                margin_rate: marginRate
            };
        });

        res.json({ products: enriched });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des produits' });
    }
});

// Import products from a catalog URL (module catalog_import)
router.post('/import-from-url', authenticateToken, requireModule('catalog_import'), async (req, res) => {
    try {
        const { url } = req.body;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'URL requise' });
        }
        const extracted = await importFromUrl(url.trim());
        const created = [];
        for (const item of extracted) {
            const id = uuidv4();
            const price = item.price != null && !Number.isNaN(item.price) && item.price >= 0 ? item.price : 0;
            await db.run(`
                INSERT INTO products (id, user_id, name, sku, price, cost_price, stock, category, description, image_url)
                VALUES (?, ?, ?, ?, ?, 0, 0, NULL, ?, ?)
            `, id, req.user.id, item.title || 'Sans nom', null, price, item.description || null, item.imageUrl || null);
            created.push({ id, name: item.title || 'Sans nom', price, image_url: item.imageUrl || null });
        }
        messageAnalyzer.invalidateProductCache(req.user.id);
        res.json({ imported: created.length, products: created });
    } catch (error) {
        const message = error?.message || 'Erreur lors de l\'import';
        const status = message.includes('invalide') || message.includes('délai') || message.includes('accessible') || message.includes('Aucun produit')
            ? 400
            : 500;
        res.status(status).json({ error: message });
    }
});

// Get product margin stats (stock valorisation & marge théorique)
router.get('/stats/margins', authenticateToken, async (req, res) => {
    try {
        const row = await db.get(`
            SELECT 
                COALESCE(SUM(stock * COALESCE(cost_price, 0)), 0) AS total_stock_cost,
                COALESCE(SUM(stock * COALESCE(price, 0)), 0) AS total_stock_value
            FROM products
            WHERE user_id = ?
        `, req.user.id);

        const total_stock_cost = Number(row?.total_stock_cost ?? 0) || 0;
        const total_stock_value = Number(row?.total_stock_value ?? 0) || 0;
        const total_stock_margin = total_stock_value - total_stock_cost;

        res.json({
            total_stock_cost,
            total_stock_value,
            total_stock_margin
        });
    } catch (error) {
        console.error('Get product margin stats error:', error);
        res.status(500).json({ error: 'Erreur lors du calcul des statistiques de marge' });
    }
});

// Get product modification history (all products for user)
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 200);
        const productId = req.query.product_id || null;
        let rows;
        if (productId) {
            const product = await db.get('SELECT id FROM products WHERE id = ? AND user_id = ?', productId, req.user.id);
            if (!product) {
                return res.status(404).json({ error: 'Produit non trouvé' });
            }
            rows = await db.all(`
                SELECT pl.id, pl.product_id, pl.user_id, pl.action, pl.quantity_change, pl.stock_before, pl.stock_after, pl.order_id, pl.notes, pl.details, pl.created_at, p.name as product_name
                FROM product_logs pl
                LEFT JOIN products p ON p.id = pl.product_id
                WHERE pl.product_id = ? AND pl.user_id = ?
                ORDER BY pl.created_at DESC
                LIMIT ?
            `, productId, req.user.id, limit);
        } else {
            rows = await db.all(`
                SELECT pl.id, pl.product_id, pl.user_id, pl.action, pl.quantity_change, pl.stock_before, pl.stock_after, pl.order_id, pl.notes, pl.details, pl.created_at, p.name as product_name
                FROM product_logs pl
                LEFT JOIN products p ON p.id = pl.product_id
                WHERE pl.user_id = ?
                ORDER BY pl.created_at DESC
                LIMIT ?
            `, req.user.id, limit);
        }
        const logs = (rows || []).map(row => ({
            ...row,
            details: row.details ? (() => { try { return JSON.parse(row.details); } catch { return null; } })() : null
        }));
        res.json({ history: logs });
    } catch (error) {
        console.error('Get product history error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
    }
});

// Serve uploaded product image (public URL for img src)
router.get('/image/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        if (!filename || filename.includes('..')) {
            return res.status(400).json({ error: 'Nom de fichier invalide' });
        }
        const uploadsDir = join(__dirname, '..', '..', 'uploads', 'products');
        const filepath = join(uploadsDir, filename);
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'Image non trouvée' });
        }
        const ext = extname(filename).toLowerCase();
        const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' }[ext] || 'image/jpeg';
        res.setHeader('Content-Type', mime);
        res.sendFile(filepath);
    } catch (error) {
        console.error('Serve product image error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Upload product image (returns URL to use as image_url)
router.post('/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Fichier image requis' });
        }
        const ext = extname(req.file.originalname || '').toLowerCase() || '.jpg';
        const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? ext : '.jpg';
        const filename = `${uuidv4()}${safeExt}`;
        const uploadsDir = join(__dirname, '..', '..', 'uploads', 'products');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filepath = join(uploadsDir, filename);
        fs.writeFileSync(filepath, req.file.buffer);
        // URL relative pour que les images s'affichent depuis n'importe quel appareil (PC, téléphone sur le même réseau)
        const url = `/api/products/image/${filename}`;
        res.json({ url });
    } catch (error) {
        console.error('Upload product image error:', error);
        res.status(500).json({ error: error.message || 'Erreur lors de l\'upload' });
    }
});

// Get single product
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const product = await db.get(`
            SELECT * FROM products 
            WHERE id = ? AND user_id = ?
        `, req.params.id, req.user.id);

        if (!product) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        const salePrice = Number(product.price ?? 0) || 0;
        const costPrice = Number(product.cost_price ?? 0) || 0;
        const margin = salePrice - costPrice;
        const marginRate = costPrice > 0 ? margin / costPrice : null;

        res.json({ 
            product: {
                ...product,
                margin,
                margin_rate: marginRate
            } 
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// Create product
router.post('/', authenticateToken, validate(productCreateSchema), async (req, res) => {
    try {
        const { name, sku, price, cost_price, stock, category, description, image_url } = req.body;

        const parsedPrice = Number(price) ?? 0;
        const parsedCostPrice = Number(cost_price) ?? 0;
        const id = uuidv4();
        await db.run(`
            INSERT INTO products (id, user_id, name, sku, price, cost_price, stock, category, description, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, 
            id, 
            req.user.id, 
            name, 
            sku || null, 
            parsedPrice, 
            parsedCostPrice,
            parseInt(stock) || 0, 
            category || null, 
            description || null, 
            image_url || null
        );

        const product = await db.get('SELECT * FROM products WHERE id = ?', id);
        const salePrice = Number(product.price ?? 0) || 0;
        const dbCostPrice = Number(product.cost_price ?? 0) || 0;
        const margin = salePrice - dbCostPrice;
        const marginRate = dbCostPrice > 0 ? margin / dbCostPrice : null;

        const logId = uuidv4();
        await db.run(`
            INSERT INTO product_logs (id, product_id, user_id, action, quantity_change, stock_before, stock_after, notes)
            VALUES (?, ?, ?, 'created', 0, 0, ?, ?)
        `, logId, id, req.user.id, parseInt(stock) || 0, 'Produit créé');

        messageAnalyzer.invalidateProductCache(req.user.id);
        res.status(201).json({ 
            product: {
                ...product,
                margin,
                margin_rate: marginRate
            } 
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Erreur lors de la création du produit' });
    }
});

// Update product
router.put('/:id', authenticateToken, validate(productUpdateSchema), async (req, res) => {
    try {
        const { name, sku, price, cost_price, stock, category, description, image_url, is_active } = req.body;

        const product = await db.get('SELECT * FROM products WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!product) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        const parsedPrice = price !== undefined ? Number(price) : null;
        const parsedCostPrice = cost_price !== undefined ? Number(cost_price) : null;
        const newStock = stock !== undefined ? parseInt(stock, 10) : product.stock;
        const stockBefore = Number(product.stock) ?? 0;
        const stockAfter = Number.isInteger(newStock) ? newStock : stockBefore;
        const quantityChange = stockAfter - stockBefore;

        await db.run(`
            UPDATE products SET
                name = COALESCE(?, name),
                sku = COALESCE(?, sku),
                price = COALESCE(?, price),
                cost_price = COALESCE(?, cost_price),
                stock = COALESCE(?, stock),
                category = COALESCE(?, category),
                description = COALESCE(?, description),
                image_url = COALESCE(?, image_url),
                is_active = COALESCE(?, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, 
            name, 
            sku, 
            parsedPrice,
            parsedCostPrice,
            stock !== undefined ? parseInt(stock) : null, 
            category, 
            description, 
            image_url, 
            is_active, 
            req.params.id
        );

        const updated = await db.get('SELECT * FROM products WHERE id = ?', req.params.id);
        const changes = {};
        if (name !== undefined && String(name) !== String(product.name)) changes.name = [product.name, name];
        if (sku !== undefined && String(sku) !== String(product.sku ?? '')) changes.sku = [product.sku, sku];
        if (price !== undefined && Number(price) !== Number(product.price)) changes.price = [product.price, parsedPrice];
        if (cost_price !== undefined && Number(cost_price) !== Number(product.cost_price)) changes.cost_price = [product.cost_price, parsedCostPrice];
        if (stock !== undefined && Number(stock) !== Number(product.stock)) changes.stock = [product.stock, stockAfter];
        if (category !== undefined && String(category || '') !== String(product.category ?? '')) changes.category = [product.category, category];
        if (Object.keys(changes).length > 0 || quantityChange !== 0) {
            const logId = uuidv4();
            const detailsJson = Object.keys(changes).length > 0 ? JSON.stringify(changes) : null;
            await db.run(`
                INSERT INTO product_logs (id, product_id, user_id, action, quantity_change, stock_before, stock_after, notes, details)
                VALUES (?, ?, ?, 'updated', ?, ?, ?, ?, ?)
            `, logId, req.params.id, req.user.id, quantityChange, stockBefore, stockAfter, 'Modification produit', detailsJson);
        }
        const salePrice = Number(updated.price ?? 0) || 0;
        const updatedCostPrice = Number(updated.cost_price ?? 0) || 0;
        const margin = salePrice - updatedCostPrice;
        const marginRate = updatedCostPrice > 0 ? margin / updatedCostPrice : null;

        messageAnalyzer.invalidateProductCache(req.user.id);
        res.json({ 
            product: {
                ...updated,
                margin,
                margin_rate: marginRate
            } 
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

// Delete product
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const product = await db.get('SELECT id FROM products WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!product) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        await db.run('DELETE FROM products WHERE id = ?', req.params.id);
        messageAnalyzer.invalidateProductCache(req.user.id);
        res.json({ message: 'Produit supprimé' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// Import products from CSV
router.post('/import', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Fichier CSV requis' });
        }

        const csvContent = req.file.buffer.toString('utf-8');
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        let imported = 0;
        let errors = [];

        for (const record of records) {
            try {
                if (!record.name?.trim()) {
                    continue;
                }

                const parsedPrice = record.price !== undefined && record.price !== null
                    ? parseFloat(record.price)
                    : 0;
                const parsedCostPrice = record.cost_price !== undefined && record.cost_price !== null
                    ? parseFloat(record.cost_price)
                    : 0;

                const safePrice = !Number.isNaN(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0;
                const safeCostPrice = !Number.isNaN(parsedCostPrice) && parsedCostPrice >= 0 ? parsedCostPrice : 0;

                const id = uuidv4();
                await db.run(`
                    INSERT INTO products (id, user_id, name, sku, price, cost_price, stock, category, description, image_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                    id, 
                    req.user.id, 
                    record.name, 
                    record.sku || null, 
                    safePrice, 
                    safeCostPrice,
                    parseInt(record.stock) || 0, 
                    record.category || null, 
                    record.description || null, 
                    record.image_url || null
                );
                imported++;
            } catch (e) {
                errors.push(`Ligne ignorée: ${record.name || 'sans nom'} - ${e.message}`);
            }
        }

        res.json({ 
            imported, 
            total: records.length,
            errors: errors.length > 0 ? errors : undefined
        });
        messageAnalyzer.invalidateProductCache(req.user.id);
    } catch (error) {
        console.error('Import products error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'import: ' + error.message });
    }
});

// ===================== PRODUCT IMAGES =====================

// Get images for a product
router.get('/:id/images', authenticateToken, async (req, res) => {
    try {
        const product = await db.get('SELECT id FROM products WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!product) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        const images = await db.all('SELECT * FROM product_images WHERE product_id = ? ORDER BY position ASC', req.params.id);
        res.json({ images });
    } catch (error) {
        console.error('Get product images error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

const MAX_PRODUCT_IMAGES = 4;

// Add image to product
router.post('/:id/images', authenticateToken, async (req, res) => {
    try {
        const { url, alt_text, is_primary } = req.body;

        const product = await db.get('SELECT id, image_url FROM products WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!product) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        if (!url?.trim()) {
            return res.status(400).json({ error: 'URL requise' });
        }

        const countRow = await db.get('SELECT COUNT(*) as c FROM product_images WHERE product_id = ?', req.params.id);
        const totalImages = (product.image_url ? 1 : 0) + (countRow?.c ?? 0);
        if (totalImages >= MAX_PRODUCT_IMAGES) {
            return res.status(400).json({ error: `Maximum ${MAX_PRODUCT_IMAGES} photos par produit.` });
        }

        const maxPos = await db.get('SELECT MAX(position) as max FROM product_images WHERE product_id = ?', req.params.id);
        const position = (maxPos?.max ?? 0) + 1;

        if (is_primary) {
            await db.run('UPDATE product_images SET is_primary = 0 WHERE product_id = ?', req.params.id);
        }

        const id = uuidv4();
        await db.run(`
            INSERT INTO product_images (id, product_id, url, alt_text, is_primary, position)
            VALUES (?, ?, ?, ?, ?, ?)
        `, id, req.params.id, url.trim(), alt_text || null, is_primary ? 1 : 0, position);

        if (is_primary) {
            await db.run('UPDATE products SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', url.trim(), req.params.id);
        }

        messageAnalyzer.invalidateProductCache(req.user.id);
        const image = await db.get('SELECT * FROM product_images WHERE id = ?', id);
        res.status(201).json({ image });
    } catch (error) {
        console.error('Add product image error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete product image
router.delete('/:productId/images/:imageId', authenticateToken, async (req, res) => {
    try {
        const product = await db.get('SELECT id FROM products WHERE id = ? AND user_id = ?', req.params.productId, req.user.id);
        if (!product) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        await db.run('DELETE FROM product_images WHERE id = ? AND product_id = ?', req.params.imageId, req.params.productId);
        messageAnalyzer.invalidateProductCache(req.user.id);
        res.json({ message: 'Image supprimée' });
    } catch (error) {
        console.error('Delete product image error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ===================== PRODUCT VARIANTS =====================

// Get variants for a product
router.get('/:id/variants', authenticateToken, async (req, res) => {
    try {
        const product = await db.get('SELECT id FROM products WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!product) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        const variants = await db.all('SELECT * FROM product_variants WHERE product_id = ? ORDER BY name ASC', req.params.id);
        
        // Parse attributes JSON
        variants.forEach(v => {
            try {
                v.attributes = JSON.parse(v.attributes || '{}');
            } catch (e) {
                v.attributes = {};
            }
        });

        res.json({ variants });
    } catch (error) {
        console.error('Get product variants error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create variant
router.post('/:id/variants', authenticateToken, async (req, res) => {
    try {
        const { name, sku, price, stock, attributes = {} } = req.body;

        const product = await db.get('SELECT id FROM products WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!product) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        if (!name?.trim()) {
            return res.status(400).json({ error: 'Nom requis' });
        }

        const id = uuidv4();
        await db.run(`
            INSERT INTO product_variants (id, product_id, name, sku, price, stock, attributes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, id, req.params.id, name.trim(), sku || null, price || null, parseInt(stock) || 0, JSON.stringify(attributes));

        await db.run('UPDATE products SET has_variants = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', req.params.id);

        const variant = await db.get('SELECT * FROM product_variants WHERE id = ?', id);
        variant.attributes = attributes;

        res.status(201).json({ variant });
    } catch (error) {
        console.error('Create product variant error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update variant
router.put('/:productId/variants/:variantId', authenticateToken, async (req, res) => {
    try {
        const { name, sku, price, stock, attributes, is_active } = req.body;

        const product = await db.get('SELECT id FROM products WHERE id = ? AND user_id = ?', req.params.productId, req.user.id);
        if (!product) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        const variant = await db.get('SELECT id FROM product_variants WHERE id = ? AND product_id = ?', req.params.variantId, req.params.productId);
        if (!variant) {
            return res.status(404).json({ error: 'Variante non trouvée' });
        }

        await db.run(`
            UPDATE product_variants SET
                name = COALESCE(?, name),
                sku = COALESCE(?, sku),
                price = COALESCE(?, price),
                stock = COALESCE(?, stock),
                attributes = COALESCE(?, attributes),
                is_active = COALESCE(?, is_active)
            WHERE id = ?
        `,
            name?.trim(), 
            sku, 
            price, 
            stock !== undefined ? parseInt(stock) : null, 
            attributes ? JSON.stringify(attributes) : null, 
            is_active,
            req.params.variantId
        );

        const updated = await db.get('SELECT * FROM product_variants WHERE id = ?', req.params.variantId);
        try {
            updated.attributes = JSON.parse(updated.attributes || '{}');
        } catch (e) {
            updated.attributes = {};
        }

        res.json({ variant: updated });
    } catch (error) {
        console.error('Update product variant error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete variant
router.delete('/:productId/variants/:variantId', authenticateToken, async (req, res) => {
    try {
        const product = await db.get('SELECT id FROM products WHERE id = ? AND user_id = ?', req.params.productId, req.user.id);
        if (!product) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        await db.run('DELETE FROM product_variants WHERE id = ? AND product_id = ?', req.params.variantId, req.params.productId);

        const remaining = await db.get('SELECT COUNT(*) as count FROM product_variants WHERE product_id = ?', req.params.productId);
        if (remaining?.count === 0) {
            await db.run('UPDATE products SET has_variants = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', req.params.productId);
        }

        res.json({ message: 'Variante supprimée' });
    } catch (error) {
        console.error('Delete product variant error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ===================== PRODUCT CATEGORIES =====================

// Get categories
router.get('/categories/all', authenticateToken, async (req, res) => {
    try {
        const categories = await db.all(`
            SELECT c.*, 
                   (SELECT COUNT(*) FROM products WHERE category = c.name AND user_id = ?) as product_count
            FROM product_categories c
            WHERE c.user_id = ?
            ORDER BY c.position ASC, c.name ASC
        `, req.user.id, req.user.id);

        res.json({ categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create category
router.post('/categories', authenticateToken, async (req, res) => {
    try {
        const { name, description, parent_id } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ error: 'Nom requis' });
        }

        const id = uuidv4();
        await db.run(`
            INSERT INTO product_categories (id, user_id, name, description, parent_id)
            VALUES (?, ?, ?, ?, ?)
        `, id, req.user.id, name.trim(), description || null, parent_id || null);

        const category = await db.get('SELECT * FROM product_categories WHERE id = ?', id);
        res.status(201).json({ category });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete category
router.delete('/categories/:id', authenticateToken, async (req, res) => {
    try {
        const category = await db.get('SELECT id FROM product_categories WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!category) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }

        await db.run('DELETE FROM product_categories WHERE id = ?', req.params.id);
        res.json({ message: 'Catégorie supprimée' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get product with full details (images, variants)
router.get('/:id/full', authenticateToken, async (req, res) => {
    try {
        const product = await db.get('SELECT * FROM products WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!product) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        const images = await db.all('SELECT * FROM product_images WHERE product_id = ? ORDER BY position ASC', req.params.id);
        
        const variants = await db.all('SELECT * FROM product_variants WHERE product_id = ? ORDER BY name ASC', req.params.id);
        variants.forEach(v => {
            try {
                v.attributes = JSON.parse(v.attributes || '{}');
            } catch (e) {
                v.attributes = {};
            }
        });

        const salePrice = Number(product.price ?? 0) || 0;
        const costPrice = Number(product.cost_price ?? 0) || 0;
        const margin = salePrice - costPrice;
        const marginRate = costPrice > 0 ? margin / costPrice : null;

        res.json({ 
            product: {
                ...product,
                margin,
                margin_rate: marginRate
            },
            images,
            variants
        });
    } catch (error) {
        console.error('Get full product error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
