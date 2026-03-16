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
import axios from 'axios';

const InfluencerDashboard = () => {
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
                axios.get('/api/influencer/stats'),
                axios.get('/api/influencer/usages')
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
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    Tableau de bord Influenceur
                    <span className="px-2 py-1 text-xs font-semibold bg-gold-100 text-gold-700 rounded-full">Partenaire</span>
                </h1>
                <p className="text-gray-500 mt-2">Suivez les performances de vos coupons et vos commissions en temps réel.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-start justify-between">
                            <div className={`p-3 rounded-xl bg-${card.color}-50 text-${card.color}-600 group-hover:scale-110 transition-transform`}>
                                <card.icon size={24} />
                            </div>
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                                <ArrowUpRight size={12} /> +12%
                            </span>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-sm font-medium text-gray-500">{card.title}</h3>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                            <p className="text-xs text-gray-400 mt-1">{card.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Coupons List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">Vos Coupons</h2>
                            <button className="text-sm text-gold-600 font-semibold hover:underline">Voir tout</button>
                        </div>
                        <div className="divide-y divide-gray-50 text-gray-600">
                            {stats?.stats?.length > 0 ? stats.stats.map((coupon) => (
                                <div key={coupon.id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400">
                                                {coupon.code[0]}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-gray-900">{coupon.code}</h3>
                                                    {coupon.is_active ? (
                                                        <span className="px-2 py-0.5 text-[10px] bg-green-100 text-green-700 rounded-full font-bold">ACTIF</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 text-[10px] bg-red-100 text-red-700 rounded-full font-bold">INACTIF</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500">{coupon.name || 'Aucune description'}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-8">
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Réduction</p>
                                                <p className="font-bold text-gray-900">{coupon.discount}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Usages</p>
                                                <p className="font-bold text-gray-900">{coupon.usages}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Ma Part</p>
                                                <p className="font-bold text-gold-600">{coupon.accumulated_reward.toLocaleString()} </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleCopy(coupon.code)}
                                            className={`ml-4 p-2 rounded-lg border transition-all ${copying === coupon.code ? 'bg-green-50 border-green-200 text-green-600' : 'hover:bg-gray-50 border-gray-100 text-gray-400 hover:text-gray-600'}`}
                                        >
                                            {copying === coupon.code ? <Check size={18} /> : <Copy size={18} />}
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-12 text-center text-gray-400">
                                    <Gift size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>Aucun coupon assigné pour le moment.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Usage History */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50">
                            <h2 className="text-lg font-bold text-gray-900">Activités récentes</h2>
                        </div>
                        <div className="overflow-x-auto text-gray-600">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Coupon</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Montant</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Réduction</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Statut</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {usages.length > 0 ? usages.map((usage, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(usage.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-gray-900">{usage.coupon_code}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                {usage.amount_total?.toLocaleString()} FCFA
                                            </td>
                                            <td className="px-6 py-4 text-sm text-red-500 font-medium">
                                                -{usage.discount_amount?.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 text-[10px] bg-green-50 text-green-700 rounded-lg font-bold border border-green-100">CONFIRMÉ</span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
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
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-2xl text-white shadow-lg">
                        <h3 className="text-xl font-bold mb-4">Programme de Parrainage</h3>
                        <p className="text-gray-300 text-sm leading-relaxed mb-6">
                            Partagez vos codes promotionnels avec votre communauté. Gagnez des bonus pour chaque abonnement souscrit !
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 bg-gold-400 rounded-full" />
                                <span className="text-sm">10% de réduction pour vos fans</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 bg-gold-400 rounded-full" />
                                <span className="text-sm">Bonus par abonnement confirmé</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 bg-gold-400 rounded-full" />
                                <span className="text-sm">Suivi transparent en temps réel</span>
                            </div>
                        </div>
                        <button className="w-full mt-8 bg-gold-500 hover:bg-gold-600 text-gray-900 font-bold py-3 rounded-xl transition-all">
                            Contacter le Support
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <BarChart3 size={18} className="text-gold-500" />
                            Performances par mois
                        </h3>
                        <div className="h-40 flex items-end justify-between gap-2 px-2">
                            {[40, 70, 45, 90, 65, 80].map((h, i) => (
                                <div key={i} className="w-full bg-gray-100 rounded-t-lg relative group">
                                    <div 
                                        style={{ height: `${h}%` }} 
                                        className="w-full bg-gold-400 rounded-t-lg group-hover:bg-gold-500 transition-all cursor-pointer"
                                    />
                                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 font-bold uppercase">M{i+1}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InfluencerDashboard;
