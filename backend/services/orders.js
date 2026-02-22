/**
 * Orders Service
 * Manages orders detected by AI, validation, and stock management
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { notificationService } from './notifications.js';
import { leadAnalyzer } from './leadAnalyzer.js';
import { workflowExecutor } from './workflowExecutor.js';
import { normalizeJid } from '../utils/whatsappUtils.js';

// Order statuses
export const ORDER_STATUSES = {
    pending: { label: 'En attente', color: 'amber' },
    validated: { label: 'Validée', color: 'green' },
    rejected: { label: 'Rejetée', color: 'red' },
    completed: { label: 'Terminée', color: 'blue' },
    cancelled: { label: 'Annulée', color: 'gray' },
    delivered: { label: 'Livrée / Payée', color: 'emerald' }
};

class OrderService {
    async createOrder(userId, { conversationId, customerName, customerPhone, items, notes, currency = 'XOF', paymentMethod = 'on_delivery' }) {
        try {
            const orderId = uuidv4();
            let totalAmount = 0;

            for (const item of items) {
                totalAmount += (item.quantity || 1) * (item.unitPrice || 0);
            }

            const pm = paymentMethod === 'online' ? 'online' : 'on_delivery';
            await db.run(`
                INSERT INTO orders (id, user_id, conversation_id, customer_name, customer_phone, total_amount, currency, notes, payment_method)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, orderId, userId, conversationId || null, customerName, customerPhone || null, totalAmount, currency, notes || null, pm);

            for (const item of items) {
                const itemId = uuidv4();
                const itemTotal = (item.quantity || 1) * (item.unitPrice || 0);
                await db.run(`
                    INSERT INTO order_items (id, order_id, product_id, product_name, product_sku, quantity, unit_price, total_price)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `,
                    itemId,
                    orderId,
                    item.productId ?? item.product_id ?? null,
                    item.productName,
                    item.productSku || null,
                    item.quantity || 1,
                    item.unitPrice || 0,
                    itemTotal
                );
            }

            console.log(`[Orders] Created order ${orderId} with ${items.length} items, total: ${totalAmount} ${currency}`);

            notificationService.create(userId, {
                type: 'warning',
                title: 'Nouvelle commande à valider',
                message: `${customerName} - ${totalAmount.toLocaleString()} ${currency}`,
                link: '/dashboard/orders'
            });

            return await this.getOrderById(orderId, userId);
        } catch (error) {
            console.error('[Orders] Create error:', error);
            return null;
        }
    }

    async getOrderById(orderId, userId) {
        const order = await db.get(`
            SELECT * FROM orders WHERE id = ? AND user_id = ?
        `, orderId, userId);

        if (order) {
            order.items = await db.all(`
                SELECT * FROM order_items WHERE order_id = ?
            `, orderId);
        }

        return order;
    }

    async getOrders(userId, { status = null, limit = 50 } = {}) {
        let query = 'SELECT * FROM orders WHERE user_id = ?';
        const params = [userId];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        const orders = await db.all(query, ...params);

        for (const order of orders) {
            order.items = await db.all('SELECT * FROM order_items WHERE order_id = ?', order.id);
        }

        return orders;
    }

    async getPendingCount(userId) {
        const result = await db.get(
            'SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status = ?',
            userId, 'pending'
        );
        return result?.count || 0;
    }

    async resolveProductId(userId, productName, productSku) {
        if (!productName && !productSku) return null;
        const byName = productName
            ? await db.get('SELECT id FROM products WHERE user_id = ? AND TRIM(name) = TRIM(?) LIMIT 1', userId, productName)
            : null;
        if (byName) return byName.id;
        if (productSku) {
            const bySku = await db.get('SELECT id FROM products WHERE user_id = ? AND sku IS NOT NULL AND sku = ? LIMIT 1', userId, productSku);
            if (bySku) return bySku.id;
        }
        return null;
    }

    async validateOrder(orderId, userId, validatedBy = null) {
        try {
            const order = await this.getOrderById(orderId, userId);
            if (!order) {
                return { success: false, error: 'Commande non trouvée' };
            }

            if (order.status !== 'pending') {
                return { success: false, error: 'Cette commande a déjà été traitée' };
            }

            for (const item of order.items) {
                if (!item.product_id && (item.product_name || item.product_sku)) {
                    const resolved = await this.resolveProductId(userId, item.product_name, item.product_sku);
                    if (resolved) item.product_id = resolved;
                    else console.warn(`[Orders] Could not resolve product for item: ${item.product_name || item.product_sku}`);
                }
            }

            const stockIssues = [];
            for (const item of order.items) {
                if (item.product_id) {
                    const product = await db.get('SELECT * FROM products WHERE id = ?', item.product_id);
                    if (product && product.stock < item.quantity) {
                        stockIssues.push({
                            product: item.product_name,
                            requested: item.quantity,
                            available: product.stock
                        });
                    }
                }
            }

            if (stockIssues.length > 0) {
                return { 
                    success: false, 
                    error: 'Stock insuffisant pour certains produits',
                    stockIssues 
                };
            }

            for (const item of order.items) {
                if (item.product_id) {
                    await this.updateProductStock(item.product_id, userId, -item.quantity, orderId, `Vente - Commande #${orderId.substring(0, 8)}`);
                }
            }

            await db.run(`
                UPDATE orders SET 
                    status = 'validated',
                    validated_by = ?,
                    validated_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, validatedBy || userId, orderId);

            console.log(`[Orders] Validated order ${orderId}`);

            const updatedOrder = await this.getOrderById(orderId, userId);
            await leadAnalyzer.createLeadFromOrder(updatedOrder);

            notificationService.create(userId, {
                type: 'success',
                title: 'Commande validée',
                message: `Commande de ${order.customer_name} - ${order.total_amount.toLocaleString()} ${order.currency}`,
                link: '/dashboard/orders'
            });

            if (updatedOrder?.conversation_id) {
                const conv = await db.get(`
                    SELECT c.contact_jid, c.contact_number, c.contact_name, c.agent_id
                    FROM conversations c
                    WHERE c.id = ?
                `, updatedOrder.conversation_id);
                if (conv) {
                    const formatPhoneForDisplay = (value) => {
                        if (!value) return null;
                        const raw = String(value);
                        if (!raw) return null;
                        if (raw.includes('@')) return raw.split('@')[0];
                        const trimmed = raw.trim();
                        const hasPlus = trimmed.startsWith('+');
                        const digits = trimmed.replace(/\D/g, '');
                        if (!digits) return null;
                        return hasPlus ? `+${digits}` : digits;
                    };
                    const contactNumber = formatPhoneForDisplay(conv.contact_number || updatedOrder.customer_phone || null);
                    const contactJid = normalizeJid(conv.contact_jid || contactNumber);
                    const orderItemsFormatted = (updatedOrder.items || []).map(i =>
                        `• ${i.product_name || 'Produit'} x${i.quantity || 1} = ${Number(i.total_price || 0).toLocaleString()} ${updatedOrder.currency}`
                    ).join('\n');
                    const notesRaw = updatedOrder.notes || '';
                    const livraisonMatch = notesRaw.match(/\[LIVRAISON\]([^\n]+)/);
                    let deliveryCity = null, deliveryNeighborhood = null, deliveryPhone = null;
                    if (livraisonMatch) {
                        const parts = livraisonMatch[1].split('|');
                        for (const p of parts) {
                            const [k, v] = p.split(':');
                            if (k === 'ville' && v) deliveryCity = v.trim();
                            if (k === 'quartier' && v) deliveryNeighborhood = v.trim();
                            if (k === 'tel' && v) deliveryPhone = v.trim();
                        }
                    }
                    const phoneForLivraison = deliveryPhone || updatedOrder.customer_phone || contactNumber || '';
                    const triggerData = {
                        orderId: updatedOrder.id,
                        orderIdShort: updatedOrder.id.substring(0, 8),
                        conversationId: updatedOrder.conversation_id,
                        agentId: conv.agent_id,
                        userId,
                        contactJid,
                        contactNumber,
                        contactName: conv.contact_name || updatedOrder.customer_name,
                        customerName: updatedOrder.customer_name || conv.contact_name || '',
                        customerPhone: updatedOrder.customer_phone || contactNumber || '',
                        deliveryCity,
                        deliveryNeighborhood,
                        deliveryPhone: phoneForLivraison,
                        totalAmount: updatedOrder.total_amount,
                        currency: updatedOrder.currency,
                        notes: notesRaw,
                        orderItems: orderItemsFormatted,
                        orderItemsRaw: updatedOrder.items || []
                    };
                    workflowExecutor.executeMatchingWorkflowsSafe('order_validated', triggerData, conv.agent_id, userId).then((result) => {
                        if (!result?.executed) {
                            return workflowExecutor.executeMatchingWorkflowsSafe('order_created', triggerData, conv.agent_id, userId);
                        }
                        return null;
                    });
                }
            }

            return { success: true, order: updatedOrder };
        } catch (error) {
            console.error('[Orders] Validate error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Reject an order
     */
    async rejectOrder(orderId, userId, reason = null) {
        try {
            const order = await this.getOrderById(orderId, userId);
            if (!order) {
                return { success: false, error: 'Commande non trouvée' };
            }

            if (order.status !== 'pending') {
                return { success: false, error: 'Cette commande a déjà été traitée' };
            }

            await db.run(`
                UPDATE orders SET 
                    status = 'rejected',
                    rejected_at = CURRENT_TIMESTAMP,
                    rejection_reason = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, reason, orderId);

            console.log(`[Orders] Rejected order ${orderId}`);

            return { success: true };
        } catch (error) {
            console.error('[Orders] Reject error:', error);
            return { success: false, error: error.message };
        }
    }

    async updatePaymentMethod(orderId, userId, paymentMethod) {
        try {
            const order = await this.getOrderById(orderId, userId);
            if (!order) return { success: false, error: 'Commande non trouvée' };
            const pm = paymentMethod === 'online' ? 'online' : 'on_delivery';
            await db.run(`
                UPDATE orders SET payment_method = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?
            `, pm, orderId, userId);
            return { success: true, order: await this.getOrderById(orderId, userId) };
        } catch (error) {
            console.error('[Orders] Update payment method error:', error);
            return { success: false, error: error.message };
        }
    }

    async markAsDelivered(orderId, userId) {
        try {
            const order = await this.getOrderById(orderId, userId);
            if (!order) return { success: false, error: 'Commande non trouvée' };
            if (order.status !== 'validated') {
                return { success: false, error: 'Seules les commandes validées peuvent être marquées comme livrées' };
            }
            await db.run(`
                UPDATE orders SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            `, orderId, userId);
            console.log(`[Orders] Marked order ${orderId} as delivered`);
            return { success: true, order: await this.getOrderById(orderId, userId) };
        } catch (error) {
            console.error('[Orders] Mark delivered error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateProductStock(productId, userId, quantityChange, orderId = null, notes = null) {
        try {
            const product = await db.get('SELECT * FROM products WHERE id = ?', productId);
            if (!product) {
                console.error(`[Orders] Product ${productId} not found`);
                return false;
            }

            const stockBefore = product.stock;
            const stockAfter = Math.max(0, stockBefore + quantityChange);

            await db.run('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', stockAfter, productId);

            const logId = uuidv4();
            const action = quantityChange > 0 ? 'stock_add' : 'stock_remove';
            await db.run(`
                INSERT INTO product_logs (id, product_id, user_id, action, quantity_change, stock_before, stock_after, order_id, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, logId, productId, userId, action, quantityChange, stockBefore, stockAfter, orderId, notes);

            console.log(`[Orders] Stock updated for ${product.name}: ${stockBefore} -> ${stockAfter} (${quantityChange > 0 ? '+' : ''}${quantityChange})`);

            // Notify if stock is low
            if (stockAfter <= 5 && stockBefore > 5) {
                notificationService.create(userId, {
                    type: 'warning',
                    title: 'Stock faible',
                    message: `${product.name} - Il ne reste que ${stockAfter} unité(s)`,
                    link: '/dashboard/products'
                });
            }

            return true;
        } catch (error) {
            console.error('[Orders] Stock update error:', error);
            return false;
        }
    }

    async getProductLogs(productId, userId, limit = 50) {
        return await db.all(`
            SELECT pl.*, p.name as product_name
            FROM product_logs pl
            LEFT JOIN products p ON pl.product_id = p.id
            WHERE pl.product_id = ? AND pl.user_id = ?
            ORDER BY pl.created_at DESC
            LIMIT ?
        `, productId, userId, limit);
    }

    async getAllProductLogs(userId, limit = 100) {
        return await db.all(`
            SELECT pl.*, p.name as product_name
            FROM product_logs pl
            LEFT JOIN products p ON pl.product_id = p.id
            WHERE pl.user_id = ?
            ORDER BY pl.created_at DESC
            LIMIT ?
        `, userId, limit);
    }

    async getStats(userId) {
        const stats = {
            pending: 0,
            validated: 0,
            delivered: 0,
            rejected: 0,
            totalRevenue: 0,
            todayOrders: 0
        };

        const counts = await db.all(`
            SELECT status, COUNT(*) as count, SUM(total_amount) as total
            FROM orders WHERE user_id = ?
            GROUP BY status
        `, userId);

        for (const row of counts) {
            if (row.status === 'pending') stats.pending = row.count;
            if (row.status === 'validated') {
                stats.validated = row.count;
                stats.totalRevenue = (stats.totalRevenue || 0) + (row.total || 0);
            }
            if (row.status === 'delivered') {
                stats.delivered = row.count;
                stats.totalRevenue = (stats.totalRevenue || 0) + (row.total || 0);
            }
            if (row.status === 'rejected') stats.rejected = row.count;
        }

        const todayRow = await db.get(`
            SELECT COUNT(*) as count FROM orders 
            WHERE user_id = ? AND (created_at AT TIME ZONE 'UTC')::date = CURRENT_DATE
        `, userId);
        stats.todayOrders = todayRow?.count || 0;

        return stats;
    }

    async getAnalytics(userId, period = '30d') {
        const periodMap = { '7d': 7, '30d': 30, '90d': 90, 'all': 9999 };
        const days = periodMap[period] || 30;
        const since = new Date();
        since.setDate(since.getDate() - days);
        const sinceStr = since.toISOString();

        const totalOrdersRow = await db.get(`
            SELECT COUNT(*) as total FROM orders 
            WHERE user_id = ? AND created_at >= ?
        `, userId, sinceStr);
        const totalOrders = totalOrdersRow?.total ?? 0;

        const validatedOrdersRow = await db.get(`
            SELECT COUNT(*) as validated FROM orders 
            WHERE user_id = ? AND status = 'validated' AND created_at >= ?
        `, userId, sinceStr);
        const validatedOrders = validatedOrdersRow?.validated ?? 0;

        const conversionRate = totalOrders > 0 ? (validatedOrders / totalOrders * 100).toFixed(1) : 0;

        const topProducts = await db.all(`
            SELECT 
                oi.product_name,
                SUM(oi.quantity)::numeric as total_quantity,
                SUM(oi.total_price)::numeric as total_revenue,
                COUNT(DISTINCT o.id) as order_count
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.user_id = ? AND o.status = 'validated' AND o.created_at >= ?
            GROUP BY oi.product_name
            ORDER BY total_quantity DESC
            LIMIT 5
        `, userId, sinceStr);

        const topCustomers = await db.all(`
            SELECT 
                customer_name,
                customer_phone,
                COUNT(*) as order_count,
                SUM(total_amount)::numeric as total_spent
            FROM orders
            WHERE user_id = ? AND status = 'validated' AND created_at >= ?
            GROUP BY customer_phone, customer_name
            ORDER BY total_spent DESC
            LIMIT 5
        `, userId, sinceStr);

        const dailyRevenueRow = await db.get(`
            SELECT COALESCE(SUM(total_amount), 0) as revenue
            FROM orders
            WHERE user_id = ? AND status = 'validated'
            AND (created_at AT TIME ZONE 'UTC')::date = CURRENT_DATE
        `, userId);
        const dailyRevenue = dailyRevenueRow?.revenue ?? 0;

        const monthlyRevenueRow = await db.get(`
            SELECT COALESCE(SUM(total_amount), 0) as revenue
            FROM orders
            WHERE user_id = ? AND status = 'validated'
            AND to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') = to_char(CURRENT_TIMESTAMP, 'YYYY-MM')
        `, userId);
        const monthlyRevenue = monthlyRevenueRow?.revenue ?? 0;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const chartData = await db.all(`
            SELECT 
                (created_at AT TIME ZONE 'UTC')::date as date,
                COUNT(*) as orders,
                COALESCE(SUM(CASE WHEN status = 'validated' THEN total_amount ELSE 0 END), 0)::numeric as revenue
            FROM orders
            WHERE user_id = ? AND created_at >= ?
            GROUP BY (created_at AT TIME ZONE 'UTC')::date
            ORDER BY date ASC
        `, userId, thirtyDaysAgo.toISOString());

        const thisMonth = await db.get(`
            SELECT 
                COUNT(*) as orders,
                COALESCE(SUM(CASE WHEN status = 'validated' THEN total_amount ELSE 0 END), 0)::numeric as revenue
            FROM orders
            WHERE user_id = ?
            AND to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') = to_char(CURRENT_TIMESTAMP, 'YYYY-MM')
        `, userId);

        const lastMonth = await db.get(`
            SELECT 
                COUNT(*) as orders,
                COALESCE(SUM(CASE WHEN status = 'validated' THEN total_amount ELSE 0 END), 0)::numeric as revenue
            FROM orders
            WHERE user_id = ?
            AND to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') = to_char(CURRENT_TIMESTAMP - INTERVAL '1 month', 'YYYY-MM')
        `, userId);

        const tm = thisMonth || { orders: 0, revenue: 0 };
        const lm = lastMonth || { orders: 0, revenue: 0 };
        return {
            conversionRate: parseFloat(conversionRate),
            topProducts,
            topCustomers,
            dailyRevenue,
            monthlyRevenue,
            chartData,
            periodComparison: {
                thisMonth: tm,
                lastMonth: lm,
                revenueGrowth: Number(lm.revenue) > 0
                    ? (((Number(tm.revenue) - Number(lm.revenue)) / Number(lm.revenue)) * 100).toFixed(1)
                    : 0,
                ordersGrowth: Number(lm.orders) > 0
                    ? (((Number(tm.orders) - Number(lm.orders)) / Number(lm.orders)) * 100).toFixed(1)
                    : 0
            }
        };
    }

    async deleteOrder(orderId, userId) {
        try {
            const order = await this.getOrderById(orderId, userId);
            if (!order) {
                return { success: false, error: 'Commande non trouvée' };
            }

            await db.run('DELETE FROM order_items WHERE order_id = ?', orderId);
            await db.run('DELETE FROM orders WHERE id = ? AND user_id = ?', orderId, userId);

            console.log(`[Orders] Deleted order ${orderId}`);
            return { success: true };
        } catch (error) {
            console.error('[Orders] Delete error:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteOrdersByStatus(userId, status) {
        try {
            const orders = await db.all('SELECT id FROM orders WHERE user_id = ? AND status = ?', userId, status);
            if (orders.length === 0) {
                return { success: true, deleted: 0 };
            }

            const orderIds = orders.map(o => o.id);
            const placeholders = orderIds.map(() => '?').join(',');
            await db.run(`DELETE FROM order_items WHERE order_id IN (${placeholders})`, ...orderIds);
            const result = await db.run('DELETE FROM orders WHERE user_id = ? AND status = ?', userId, status);

            console.log(`[Orders] Deleted ${result.rowCount} orders with status '${status}'`);
            return { success: true, deleted: result.rowCount };
        } catch (error) {
            console.error('[Orders] Bulk delete error:', error);
            return { success: false, error: error.message };
        }
    }

    async cleanupOldOrders(userId, daysOld = 30, statuses = ['rejected', 'cancelled']) {
        try {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - daysOld);
            const cutoffStr = cutoff.toISOString();

            const orders = await db.all(`
                SELECT id FROM orders 
                WHERE user_id = ? 
                AND status IN (${statuses.map(() => '?').join(',')})
                AND created_at < ?
            `, userId, ...statuses, cutoffStr);

            if (orders.length === 0) {
                return { success: true, deleted: 0 };
            }

            const orderIds = orders.map(o => o.id);
            const placeholders = orderIds.map(() => '?').join(',');
            await db.run(`DELETE FROM order_items WHERE order_id IN (${placeholders})`, ...orderIds);
            const result = await db.run(`
                DELETE FROM orders 
                WHERE user_id = ? 
                AND status IN (${statuses.map(() => '?').join(',')})
                AND created_at < ?
            `, userId, ...statuses, cutoffStr);

            console.log(`[Orders] Cleaned up ${result.rowCount} old orders (> ${daysOld} days)`);
            return { success: true, deleted: result.rowCount };
        } catch (error) {
            console.error('[Orders] Cleanup error:', error);
            return { success: false, error: error.message };
        }
    }

    async clearProductLogs(userId, daysOld = null) {
        try {
            let result;
            if (daysOld) {
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - daysOld);
                result = await db.run(`
                    DELETE FROM product_logs 
                    WHERE user_id = ? AND created_at < ?
                `, userId, cutoff.toISOString());
            } else {
                result = await db.run('DELETE FROM product_logs WHERE user_id = ?', userId);
            }

            console.log(`[Orders] Cleared ${result.rowCount} product logs`);
            return { success: true, deleted: result.rowCount };
        } catch (error) {
            console.error('[Orders] Clear logs error:', error);
            return { success: false, error: error.message };
        }
    }
}

export const orderService = new OrderService();
export default orderService;
