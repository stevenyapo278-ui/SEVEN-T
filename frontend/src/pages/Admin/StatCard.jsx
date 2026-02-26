export default function StatCard({ icon: Icon, label, value, subValue, color }) {
  const colors = {
    gold: 'from-gold-400/20 to-gold-400/5 border-gold-400/30 text-gold-400',
    blue: 'from-blue-400/20 to-blue-400/5 border-blue-400/30 text-blue-400',
    emerald: 'from-emerald-400/20 to-emerald-400/5 border-emerald-400/30 text-emerald-400'
  }

  return (
    <div className={`p-6 rounded-xl border bg-gradient-to-br ${colors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-6 h-6" />
        {subValue && <span className="text-xs opacity-70">{subValue}</span>}
      </div>
      <div className="text-3xl font-bold text-gray-100">{value.toLocaleString()}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  )
}
