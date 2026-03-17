import React, { useState, useEffect } from 'react';
import { 
    Users, 
    TrendingUp, 
    DollarSign, 
    Gift, 
    Copy, 
    Check, 
    Calendar,
    ArrowUpRight,
    Search,
    Filter,
    BarChart3
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

import { usePartnerAuth } from '../../contexts/PartnerAuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const PartnerDashboard = () => {
    const { partner } = usePartnerAuth();
    const { isDark } = useTheme();
    const [stats, setStats] = useState(null);
    const [usages, setUsages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copying, setCopying] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsRes, usagesRes] = await Promise.all([
                api.get('/influencer/stats'),
                api.get('/influencer/usages')
            ]);
            setStats(statsRes.data);
            setUsages(usagesRes.data.usages);
        } catch (error) {
            console.error('Error fetching influencer data:', error);
            toast.error('Impossible de charger les données');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (code) => {
        navigator.clipboard.writeText(code);
        setCopying(code);
        toast.success(`Code ${code} copié !`);
        setTimeout(() => setCopying(null), 2000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
            </div>
        );
    }

    const cards = [
        { 
            title: 'Utilisations totales', 
            value: stats?.total_usages || 0, 
            icon: Users, 
            color: 'blue',
            description: 'Nombre de personnes ayant utilisé vos codes'
        },
        { 
            title: 'Récompenses accumulées', 
            value: `${(stats?.total_reward || 0).toLocaleString()} FCFA`, 
            icon: DollarSign, 
            color: 'gold',
            description: 'Montant total de vos commissions'
        },
        { 
            title: 'Coupons actifs', 
            value: stats?.active_coupons || 0, 
            icon: Gift, 
            color: 'green',
            description: 'Coupons actuellement valides'
        },
        { 
            title: 'Taux de conversion', 
            value: '---', 
            icon: TrendingUp, 
            color: 'purple',
            description: 'Performance de vos campagnes'
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className={`text-3xl font-bold flex items-center gap-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    Tableau de bord {partner?.name || 'Partenaire'}
                    <span className="px-2 py-1 text-xs font-semibold bg-gold-400/20 text-gold-400 rounded-full">Partenaire</span>
                </h1>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} mt-2`}>Suivez vos performances et vos commissions en temps réel.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <div key={i} className={`p-6 rounded-2xl border transition-all group ${isDark ? 'bg-space-800 border-space-700/50 shadow-space-950/20' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}`}>
                        <div className="flex items-start justify-between">
                            <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform ${isDark ? 'bg-space-900 text-gold-400' : `bg-${card.color}-50 text-${card.color}-600`}`}>
                                <card.icon size={24} />
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'}`}>
                                <ArrowUpRight size={12} /> +12%
                            </span>
                        </div>
                        <div className="mt-4">
                            <h3 className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.title}</h3>
                            <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{card.value}</p>
                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{card.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Coupons List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-space-800 border-space-700/50' : 'bg-white border-gray-100'}`}>
                        <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-space-700/50' : 'border-gray-50'}`}>
                            <h2 className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Vos Coupons</h2>
                            <button className="text-sm text-gold-500 font-semibold hover:underline">Voir tout</button>
                        </div>
                        <div className={`divide-y ${isDark ? 'divide-space-700/50' : 'divide-gray-50'}`}>
                            {stats?.stats?.length > 0 ? stats.stats.map((coupon) => (
                                <div key={coupon.id} className={`p-6 transition-colors ${isDark ? 'hover:bg-space-700/30' : 'hover:bg-gray-50'}`}>
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-xl font-bold ${isDark ? 'bg-space-900 text-gray-400' : 'bg-gray-100 text-gray-400'}`}>
                                                {coupon.code[0]}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className={`font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{coupon.code}</h3>
                                                    {coupon.is_active ? (
                                                        <span className="px-2 py-0.5 text-[10px] bg-green-500/10 text-green-500 rounded-full font-bold">ACTIF</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 text-[10px] bg-red-500/10 text-red-500 rounded-full font-bold">INACTIF</span>
                                                    )}
                                                </div>
                                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{coupon.name || 'Aucune description'}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-8">
                                            <div className="text-right">
                                                <p className={`text-xs uppercase font-bold tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Réduction</p>
                                                <p className={`font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{coupon.discount}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-xs uppercase font-bold tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Usages</p>
                                                <p className={`font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{coupon.usages}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-xs uppercase font-bold tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Ma Part</p>
                                                <p className="font-bold text-gold-500">{coupon.accumulated_reward.toLocaleString()} </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleCopy(coupon.code)}
                                            className={`ml-4 p-2 rounded-lg border transition-all ${copying === coupon.code 
                                                ? (isDark ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-600') 
                                                : (isDark ? 'hover:bg-space-700 border-space-700 text-gray-500 hover:text-gray-300' : 'hover:bg-gray-50 border-gray-100 text-gray-400 hover:text-gray-600')}`}
                                        >
                                            {copying === coupon.code ? <Check size={18} /> : <Copy size={18} />}
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className={`p-12 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <Gift size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>Aucun coupon assigné pour le moment.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Usage History */}
                    <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-space-800 border-space-700/50' : 'bg-white border-gray-100'}`}>
                        <div className={`p-6 border-b ${isDark ? 'border-space-700/50' : 'border-gray-50'}`}>
                            <h2 className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Activités récentes</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className={isDark ? 'bg-space-900' : 'bg-gray-50'}>
                                    <tr>
                                        <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Date</th>
                                        <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Coupon</th>
                                        <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Montant</th>
                                        <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Réduction</th>
                                        <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Statut</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-space-700/50' : 'divide-gray-50'}`}>
                                    {usages.length > 0 ? usages.map((usage, idx) => (
                                        <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-space-700/30' : 'hover:bg-gray-50'}`}>
                                            <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {new Date(usage.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{usage.coupon_code}</span>
                                            </td>
                                            <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                                                {usage.amount_total?.toLocaleString()} FCFA
                                            </td>
                                            <td className="px-6 py-4 text-sm text-red-500 font-medium">
                                                -{usage.discount_amount?.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-[10px] rounded-lg font-bold border ${isDark ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-green-50 text-green-700 border-green-100'}`}>CONFIRMÉ</span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className={`px-6 py-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                Aucun usage récent détecté.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">

                    <div className={`p-6 rounded-2xl border shadow-sm ${isDark ? 'bg-space-800 border-space-700/50' : 'bg-white border-gray-100'}`}>
                        <h3 className={`font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                            <BarChart3 size={18} className="text-gold-500" />
                            Performances par mois
                        </h3>
                        <div className="h-40 flex items-end justify-between gap-2 px-2">
                            {[40, 70, 45, 90, 65, 80].map((h, i) => (
                                <div key={i} className={`w-full rounded-t-lg relative group ${isDark ? 'bg-space-900' : 'bg-gray-100'}`}>
                                    <div 
                                        style={{ height: `${h}%` }} 
                                        className="w-full bg-gold-400 rounded-t-lg group-hover:bg-gold-500 transition-all cursor-pointer shadow-sm"
                                    />
                                    <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>M{i+1}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PartnerDashboard;
