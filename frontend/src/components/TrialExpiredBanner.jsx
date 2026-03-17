import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, Crown, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function TrialExpiredBanner() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const isTrialExpired = Boolean(
        user?.subscription_status === 'trialing' && 
        user?.subscription_end_date && 
        new Date(user.subscription_end_date) < new Date()
    );

    const isSubscriptionExpired = Boolean(
        user?.subscription_status && 
        ['past_due', 'canceled', 'unpaid'].includes(user.subscription_status)
    );
    
    // Also check if plan is free but they had a trial that expired
    const isFreePlanExpired = Boolean(user?.plan === 'free' && isTrialExpired);

    const isInfluencerOnly = Boolean(user?.influencer_only);
    const isAdmin = Boolean(user?.is_admin);

    const shouldShowBanner = Boolean(
        user && 
        !isAdmin && 
        !isInfluencerOnly && 
        (isTrialExpired || isSubscriptionExpired || isFreePlanExpired)
    );
    
    const isSettingsPage = location.pathname.startsWith('/dashboard/settings');

    useEffect(() => {
        if (shouldShowBanner && !isSettingsPage) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [shouldShowBanner, isSettingsPage]);

    if (!shouldShowBanner || isSettingsPage) return null;

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-space-950/95 backdrop-blur-sm p-4">
            <div className="max-w-md w-full bg-space-900 border border-space-700 rounded-2xl shadow-2xl p-8 text-center animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-8 h-8" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-100 mb-2">
                    Période d'essai terminée
                </h2>
                
                <p className="text-gray-400 mb-8">
                    Votre période d'accès gratuit à Seven T est arrivée à son terme. Pour continuer à profiter de toutes nos fonctionnalités, veuillez passer à un plan supérieur.
                </p>
                
                <div className="space-y-3">
                    <button 
                        onClick={() => navigate('/dashboard/settings?tab=plan')}
                        className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-base"
                    >
                        <Crown className="w-5 h-5" />
                        Voir les plans d'abonnement
                    </button>
                    
                    <button 
                        onClick={handleLogout}
                        className="w-full btn-secondary py-3 flex items-center justify-center gap-2 text-base text-gray-400 hover:text-white"
                    >
                        <LogOut className="w-5 h-5" />
                        Déconnexion
                    </button>
                </div>
            </div>
        </div>
    );
}
