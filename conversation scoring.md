Le scoring des conversations dans SEVEN T (défini dans le module

conversionScore.js
) est basé sur un score allant de 0 à 100, calculé à partir d'un score de base de 50 points.

Voici les critères précis utilisés pour ajuster ce score :

1. Niveau d'Engagement (Nombre de messages)
   +15 points si la conversation compte 5 messages ou plus.
   +5 points si elle compte au moins 2 messages.
2. Intention d'Achat (Commandes)
   +20 points si une commande a été détecté ou créée durant la conversation.
3. Analyse du Sentiment et du Besoin
   +10 points si le sentiment détecté est "positif".
   -15 points si le client semble "frustré" ou si le système détecte un besoin d'intervention humaine (needs_human).
   +5 points si un agent humain a déjà repris la main sur la conversation (human_takeover).
4. Récence de l'Activité
   +5 points si le dernier message date de moins de 24 heures.
   -10 points si la conversation est inactive depuis plus de 72 heures.
   📉 Actions suggérées selon le score
   En plus du score, le système génère automatiquement une "action suggérée" pour le marchand :

Transférer à un humain : Si le sentiment est négatif ou si une aide humaine est requise.
Envoyer une offre : Si le score est élevé (≥ 70) mais qu'aucune commande n'a encore été passée.
Relancer : Si le score est moyen (40-70) et que la conversation est inactive depuis plus de 24h.
Ce score permet aux e-commerçants de prioriser les clients les plus "chauds" (ceux ayant le score le plus élevé) directement depuis leur dashboard.
