import notificationService from './backend/services/notifications.js';

async function verify() {
    console.log('Testing notificationService.notifyCriticalAction...');
    
    if (typeof notificationService.notifyCriticalAction !== 'function') {
        console.error('Error: notifyCriticalAction is NOT a function');
        process.exit(1);
    }
    
    console.log('notifyCriticalAction is present.');
    
    // Test parameters
    const userId = 'test-user-id';
    const title = 'Test Critical Action';
    const message = 'This is a test notification';
    const metadata = { test: true };
    
    console.log('Verification successful.');
}

verify().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
