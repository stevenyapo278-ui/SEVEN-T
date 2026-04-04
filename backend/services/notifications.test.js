import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import notificationService from './notifications.js';
import db from '../database/init.js';

// Mock database
jest.mock('../database/init.js', () => ({
    run: jest.fn().mockResolvedValue({ lastID: 'test-id' }),
    get: jest.fn(),
    all: jest.fn()
}));

describe('NotificationService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a notification in the database', async () => {
            const userId = 'user-123';
            const data = {
                type: 'info',
                title: 'Test Notification',
                message: 'This is a test'
            };

            // Mock getById to return the notification after creation
            db.get.mockResolvedValueOnce({
                id: 'mock-id',
                user_id: userId,
                type: 'info',
                title: 'Test Notification',
                message: 'This is a test',
                metadata: null
            });

            const result = await notificationService.create(userId, data);

            expect(db.run).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO notifications'),
                expect.any(String),
                userId,
                'info',
                'Test Notification',
                'This is a test',
                null,
                null
            );
            expect(result.title).toBe('Test Notification');
        });
    });

    describe('notifyCriticalAction', () => {
        it('should create a critical action notification', async () => {
            const userId = 'admin-123';
            const title = 'Critical Action';
            const message = 'Something sensitive happened';
            const metadata = { action: 'delete_user', target: 'user-456' };

            // Mock getById
            db.get.mockResolvedValueOnce({
                id: 'mock-id',
                user_id: userId,
                type: 'error',
                title,
                message,
                metadata: JSON.stringify(metadata)
            });

            const result = await notificationService.notifyCriticalAction(userId, title, message, metadata);

            expect(db.run).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO notifications'),
                expect.any(String),
                userId,
                'error',
                title,
                message,
                null,
                JSON.stringify(metadata)
            );
        });
    });
});
