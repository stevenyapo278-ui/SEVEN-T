// Prompt injection patterns (normalized, regex-based)
export const INJECTION_REGEXES = [
    /ignor\w*\s+(?:all|previous|above|your|instructions?)/,
    /disregard\s+(?:previous|above|instructions?)/,
    /forget\s+(?:everything|all|instructions?)/,
    /new\s+instructions?/,
    /system\s+prompt/,
    /you\s+are\s+now/,
    /act(?:ing)?\s+as/,
    /pretend(?:ing)?\s+you\s+are/,
    /jailbreak|bypass|override/,
    /ignore\s+(?:tout|toutes?|les?\s+instructions?)/,
    /oublie\s+(?:tout|toutes?|les?\s+instructions?)/,
    /tu\s+es\s+maintenant/,
    /agis\s+comme|fais\s+comme\s+si/
];

// Insult / offensive words (French + English, non-exhaustive)
export const INSULT_WORDS = [
    'idiot', 'stupide', 'con', 'connard', 'debil', 'debile', 'imbécile',
    'nul', 'nulle', 'merde', 'putain', 'enculé', 'salaud', 'batard',
    'crétin', 'abruti', 'taré', 'fou', 'malade', 'arriéré',
    'stupid', 'idiot', 'dumb', 'ass', 'damn', 'shit', 'fuck', 'bastard'
];
