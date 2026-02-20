/**
 * Configuration constants for Message Analyzer Service
 * Centralizes magic numbers and thresholds for easier maintenance and testing
 */

export const MESSAGE_ANALYZER_CONFIG = {
    // Message validation
    MIN_MESSAGE_LENGTH: 2,
    MAX_MESSAGE_LENGTH: 5000,
    
    // Quantity thresholds
    MIN_QUANTITY: 1,
    MAX_QUANTITY: 100,
    
    // Stock thresholds
    LOW_STOCK_THRESHOLD: 5,
    
    // Language detection
    LANGUAGE_FR_ACCENT_RATIO: 0.02,
    
    // Product matching
    MIN_WORD_LENGTH: 2,
    
    // Customer engagement thresholds
    HIGH_ENGAGEMENT_THRESHOLD: 10,
    MEDIUM_ENGAGEMENT_THRESHOLD: 5
};

export default MESSAGE_ANALYZER_CONFIG;
