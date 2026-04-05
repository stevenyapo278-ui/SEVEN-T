const INTENT_PATTERNS = {
    order: {
        keywords: [
            'je veux', "j'en veux", 'je voudrais', "j'en prends", 'je commande', 'commander', 'j\'achète',
            'je prends', 'livrez-moi', 'envoyez-moi', 'envoyez', 'envoie-moi', 'envoie',
            'je confirme', 'je valide', 'ok pour', 'c\'est bon pour', 'c\'est bon', 'd\'accord pour', 'd\'accord',
            'donnez-moi', 'donne-moi', "donne m'en", "donnez m'en",
            'i want', "i'll take", 'order', 'buy'
        ],
        weight: 10
    },
    inquiry: {
        keywords: [
            'combien', 'prix', 'tarif', 'coût', 'disponible', 'stock',
            'information', 'renseignement', 'détails', 'caractéristiques',
            'c\'est quoi', 'qu\'est-ce que', 'comment', 'pourquoi', 'quoi', 'quel', 'quelle', 'quels', 'quelles',
            'vous avez', 'avez-vous', 'as-tu', 'tu as', 'y a-t-il', 'il y a',
            'connaître', 'savoir', 'me dire', 'me montrer', 'voir', 'consulter',
            'catalogue', 'produits', 'articles', 'gamme', 'collection',
            'how much', 'price', 'available', 'what is', 'do you have', 'have you', 'what', 'which'
        ],
        weight: 5
    },
    complaint: {
        keywords: [
            'problème', 'réclamation', 'pas content', 'mécontent',
            'arnaque', 'erreur', 'défaut', 'cassé',
            'ne fonctionne pas', 'mauvais', 'nul'
        ],
        weight: 8
    },
    return_request: {
        keywords: [
            'retour', 'retourner', 'rendre', 'renvoyer',
            'remboursement', 'rembourser', 'remboursé',
            'échanger', 'échange', 'changer',
            'pas satisfait', 'ne convient pas', 'ne me convient pas',
            'return', 'refund', 'exchange', 'send back'
        ],
        weight: 7
    },
    greeting: {
        keywords: [
            'bonjour', 'salut', 'bonsoir', 'hello', 'hi', 'coucou',
            'bonne journée', 'ça va'
        ],
        weight: 2
    },
    delivery_info: {
        keywords: [
            'livraison', 'livrer', 'adresse', 'quartier', 'commune',
            'ville', 'numéro', 'téléphone', 'contact'
        ],
        weight: 6
    },
    human_request: {
        keywords: [
            'parler à un humain', 'conseiller', 'responsable', 'manager',
            'personne réelle', 'pas un robot', 'assistance humaine'
        ],
        weight: 9
    },
    // Edge cases: modifications and cancellations
    modification: {
        keywords: [
            'modifier', 'modification', 'changer', 'changement', 'au lieu de',
            'plutôt', 'remplacer', 'finalement', 'en fait', 'correction'
        ],
        weight: 7
    },
    cancellation: {
        keywords: [
            'annuler', 'annulation', 'annule', 'stop', 'arrêter', 'arrête',
            'ne veux plus', 'plus besoin', 'laisse tomber'
        ],
        weight: 8
    },
    order_status: {
        keywords: [
            'où en est', 'ma commande', 'statut', 'suivi', 'avancement',
            'commande en cours', 'livraison en cours', 'expédié', 'livré',
            'quand livraison', 'c\'est pour quand', 'est-ce que ma commande',
            'ma commande est', 'ma livraison', 'votre livraison',
            // English
            'order status', 'where is my order', 'track my order', 'shipment', 'delivery status'
        ],
        weight: 8
    },
    appreciation: {
        keywords: [
            'merci', 'merci beaucoup', 'thanks', 'thank you', 'c\'est gentil', 'parfait merci',
            'super merci', 'ok merci', 'bien reçu merci', 'genial', 'génial', 'nickel'
        ],
        weight: 3
    }
};

export default INTENT_PATTERNS;
