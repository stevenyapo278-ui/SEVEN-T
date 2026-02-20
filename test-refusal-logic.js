/**
 * Simple test for refusal and question detection logic
 */

// Keywords from orderDetector.js
const REFUSAL_KEYWORDS = [
    'non', 'pas', 'attends', 'attend', 'attendez',
    'plus tard', 'pas maintenant', 'pas encore', 'pas tout de suite',
    'je refuse', 'je ne veux pas', 'je ne souhaite pas',
    'annule', 'annuler', 'pas intéressé', 'pas interessé',
    'no', 'not', 'wait', 'later', 'not now', 'cancel'
];

const QUESTION_KEYWORDS = [
    'quel', 'quelle', 'quels', 'quelles', 'combien', 'comment',
    'pourquoi', 'quoi', 'où', 'c\'est quoi', 'qu\'est-ce',
    'connaître', 'savoir', 'demander', 'informer', 'renseigner',
    'détails', 'détail', 'information', 'info', 'specs', 'spécifications',
    'caractéristiques', 'description', 'disponible', 'dispo',
    '?',
    'what', 'which', 'how', 'why', 'where', 'when',
    'know', 'ask', 'tell me', 'details', 'specs', 'info'
];

function detectRefusal(message) {
    const lowerMessage = message.toLowerCase();
    const trimmedMessage = lowerMessage.trim();
    
    return REFUSAL_KEYWORDS.some(keyword => {
        const keywordLower = keyword.toLowerCase();
        if (trimmedMessage.startsWith(keywordLower)) return true;
        const regex = new RegExp(`\\b${keywordLower}\\b`, 'i');
        return regex.test(lowerMessage);
    });
}

function detectQuestion(message) {
    const lowerMessage = message.toLowerCase();
    
    return QUESTION_KEYWORDS.some(keyword => {
        const keywordLower = keyword.toLowerCase();
        return lowerMessage.includes(keywordLower);
    });
}

// Test cases
const tests = [
    {
        message: 'Non je veux connaître le stockage de données d\'abord',
        expectedRefusal: true,
        expectedQuestion: true,
        shouldBlock: true
    },
    {
        message: 'je veux savoir combien coûte le Samsung S21',
        expectedRefusal: false,
        expectedQuestion: true,
        shouldBlock: true
    },
    {
        message: 'je veux 2 Samsung S21 Ultra',
        expectedRefusal: false,
        expectedQuestion: false,
        shouldBlock: false
    },
    {
        message: 'pas maintenant, je veux réfléchir',
        expectedRefusal: true,
        expectedQuestion: false,
        shouldBlock: true
    },
    {
        message: 'le Samsung S21 est disponible?',
        expectedRefusal: false,
        expectedQuestion: true,
        shouldBlock: true
    },
    {
        message: 'je voudrais avoir plus de détails sur le Samsung',
        expectedRefusal: false,
        expectedQuestion: true,
        shouldBlock: true
    },
    {
        message: 'je prends le Samsung S21',
        expectedRefusal: false,
        expectedQuestion: false,
        shouldBlock: false
    },
    {
        message: 'attends je veux vérifier quelque chose',
        expectedRefusal: true,
        expectedQuestion: false,
        shouldBlock: true
    },
    {
        message: 'quelles sont les caractéristiques du Samsung S21?',
        expectedRefusal: false,
        expectedQuestion: true,
        shouldBlock: true
    },
    {
        message: 'oui je veux commander le Samsung S21',
        expectedRefusal: false,
        expectedQuestion: false,
        shouldBlock: false
    }
];

console.log('\n========================================');
console.log('TEST: Refusal & Question Detection Logic');
console.log('========================================\n');

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
    const isRefusal = detectRefusal(test.message);
    const isQuestion = detectQuestion(test.message);
    const shouldBlock = isRefusal || isQuestion;
    
    const refusalMatch = isRefusal === test.expectedRefusal;
    const questionMatch = isQuestion === test.expectedQuestion;
    const blockMatch = shouldBlock === test.shouldBlock;
    
    const testPassed = refusalMatch && questionMatch && blockMatch;
    
    console.log(`Test ${index + 1}: ${testPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Message: "${test.message}"`);
    console.log(`  Refusal: ${isRefusal ? '✅' : '❌'} (expected: ${test.expectedRefusal ? '✅' : '❌'}) ${refusalMatch ? '✓' : '✗'}`);
    console.log(`  Question: ${isQuestion ? '✅' : '❌'} (expected: ${test.expectedQuestion ? '✅' : '❌'}) ${questionMatch ? '✓' : '✗'}`);
    console.log(`  Should Block Order: ${shouldBlock ? '✅' : '❌'} (expected: ${test.shouldBlock ? '✅' : '❌'}) ${blockMatch ? '✓' : '✗'}`);
    console.log('');
    
    if (testPassed) {
        passed++;
    } else {
        failed++;
    }
});

console.log('========================================');
console.log('SUMMARY');
console.log('========================================');
console.log(`Total: ${tests.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Success rate: ${Math.round(passed / tests.length * 100)}%`);
console.log('========================================\n');
