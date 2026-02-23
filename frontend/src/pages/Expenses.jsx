import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import {
  Wallet,
  Plus,
  PieChart as PieChartIcon,
  BarChart3,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Loader2,
  Filter
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import toast from 'react-hot-toast'

const COLORS = ['#F5D47A', '#8B5CF6', '#22C55E', '#3B82F6', '#EF4444', '#F97316', '#EC4899']

const CATEGORY_VALUES = [
  'Loyer',
  'Stock / Achats',
  'Transport',
  'Marketing',
  'Salaire',
  'Fournitures',
  'Autre'
]

function getCategoryLabel(value) {
  return CATEGORY_VALUES.includes(value) ? value : value || 'Autre'
}

function formatAmount(n, curr = 'XOF') {
  return `${Number(n).toLocaleString('fr-FR')} ${curr}`
}

export default function Expenses() {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState([])
  const [stats, setStats] = useState({ totalMonth: 0, byCategory: [], byMonth: [] })
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    loadData()
  }, [year, month])

  const categoriesInData = [...new Set(expenses.map((e) => e.category).filter(Boolean))]
  const filterOptions = [...CATEGORY_VALUES, ...categoriesInData.filter((c) => !CATEGORY_VALUES.includes(c))]
  const filteredExpenses = !categoryFilter
    ? expenses
    : expenses.filter((e) => e.category === categoryFilter)
  const filteredTotal = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0)

  const loadData = async () => {
    setLoading(true)
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/expenses', { params: { year, month } }),
        api.get('/expenses/stats', { params: { year, month, monthsBack: 6 } })
      ])
      setExpenses(listRes.data.expenses || [])
      setStats({
        totalMonth: statsRes.data.totalMonth ?? 0,
        byCategory: statsRes.data.byCategory || [],
        byMonth: statsRes.data.byMonth || []
      })
    } catch (err) {
      console.error('Load expenses error:', err)
      toast.error(t('expenses.errorLoad'))
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditingExpense(null)
    setModalOpen(true)
  }

  const openEdit = (expense) => {
    setEditingExpense(expense)
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t('expenses.confirmDelete'))) return
    setDeleteLoading(id)
    try {
      await api.delete(`/expenses/${id}`)
      toast.success(t('expenses.successDeleted'))
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || t('expenses.errorDelete'))
    } finally {
      setDeleteLoading(null)
    }
  }

  const monthNames = [
    '', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
  ]

  if (loading && expenses.length === 0 && stats.byCategory.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-100">{t('expenses.title')}</h1>
          <p className="text-gray-400">{t('expenses.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-space-800 border border-space-600 text-gray-100 rounded-lg px-3 py-2 text-sm"
          >
            {monthNames.slice(1).map((name, i) => (
              <option key={i} value={i + 1}>{name}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-space-800 border border-space-600 text-gray-100 rounded-lg px-3 py-2 text-sm"
          >
            {[year - 2, year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-100 hover:bg-space-800 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            {t('expenses.addExpense')}
          </button>
        </div>
      </div>

      <div className="card p-6 bg-gradient-to-br from-violet-400/20 to-violet-400/5 border border-violet-400/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-violet-400/20">
              <Wallet className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">
                {categoryFilter ? t('expenses.totalFiltered') : t('expenses.totalMonth')}
                {categoryFilter && (
                  <span className="ml-1 text-violet-300">({getCategoryLabel(categoryFilter)})</span>
                )}
              </p>
              <p className="text-3xl font-display font-bold text-gray-100">
                {formatAmount(categoryFilter ? filteredTotal : stats.totalMonth)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-display font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-gold-400" />
            {t('expenses.chartByCategory')}
          </h3>
          <div className="w-full" style={{ minHeight: 280 }}>
            {(() => {
              const pieData = categoryFilter
                ? stats.byCategory.filter((c) => c.name === categoryFilter)
                : stats.byCategory
              return pieData.length === 0 ? (
                <p className="text-gray-400 text-center py-8">{t('expenses.noData')}</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) =>
                      `${getCategoryLabel(name)}: ${formatAmount(value)}`
                    }
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1F2937' : '#374151',
                      border: 'none',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [formatAmount(value), '']}
                    labelFormatter={(name) => getCategoryLabel(name)}
                  />
                </PieChart>
              </ResponsiveContainer>
              )
            })()}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-display font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gold-400" />
            {t('expenses.chartByMonth')}
          </h3>
          <div className="w-full" style={{ minHeight: 280 }}>
            {stats.byMonth.length === 0 ? (
              <p className="text-gray-400 text-center py-8">{t('expenses.noData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.byMonth} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => v?.toLocaleString?.() ?? v} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1F2937' : '#374151',
                      border: 'none',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [formatAmount(value), '']}
                  />
                  <Bar dataKey="total" fill="#8B5CF6" radius={[4, 4, 0, 0]} name={t('expenses.total')} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-display font-semibold text-gray-100">
            {t('expenses.listTitle')}
          </h3>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-space-800 border border-space-600 text-gray-100 rounded-lg px-3 py-2 text-sm min-w-[180px]"
            >
              <option value="">{t('expenses.filterAllCategories')}</option>
              {filterOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryLabel(cat)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {filteredExpenses.length === 0 ? (
          <p className="text-gray-400 py-8 text-center">
            {expenses.length === 0 ? t('expenses.noExpenses') : t('expenses.noExpensesForCategory')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-space-700">
                  <th className="pb-3 font-medium">{t('expenses.date')}</th>
                  <th className="pb-3 font-medium">{t('expenses.category')}</th>
                  <th className="pb-3 font-medium text-right">{t('expenses.amount')}</th>
                  <th className="pb-3 font-medium">{t('expenses.note')}</th>
                  <th className="pb-3 font-medium w-24 text-right">{t('expenses.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((e) => (
                  <tr key={e.id} className="border-b border-space-800">
                    <td className="py-3 text-gray-100">
                      {e.expense_date ? new Date(e.expense_date).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="py-3 text-gray-200">{getCategoryLabel(e.category)}</td>
                    <td className="py-3 text-right font-medium text-gold-400">
                      {formatAmount(e.amount, e.currency)}
                    </td>
                    <td className="py-3 text-gray-400 max-w-[200px] truncate">{e.note || '-'}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(e)}
                          className="p-2 text-gray-400 hover:text-violet-400 rounded-lg transition-colors"
                          title={t('expenses.edit')}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          disabled={deleteLoading === e.id}
                          className="p-2 text-gray-400 hover:text-red-400 rounded-lg transition-colors disabled:opacity-50"
                          title={t('common.delete')}
                        >
                          {deleteLoading === e.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <ExpenseModal
          expense={editingExpense}
          onClose={() => {
            setModalOpen(false)
            setEditingExpense(null)
          }}
          onSaved={() => {
            setModalOpen(false)
            setEditingExpense(null)
            loadData()
          }}
        />
      )}
    </div>
  )
}

function ExpenseModal({ expense, onClose, onSaved }) {
  const { t } = useTranslation()
  const isEdit = !!expense
  const isOtherCategory = (cat) => cat === 'Autre'
  const initialCategory = expense && CATEGORY_VALUES.includes(expense.category)
    ? expense.category
    : expense
      ? 'Autre'
      : 'Loyer'
  const initialCustom = expense && !CATEGORY_VALUES.includes(expense.category) ? expense.category : ''
  const [submitLoading, setSubmitLoading] = useState(false)
  const [form, setForm] = useState({
    expense_date: expense
      ? expense.expense_date?.slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    category: initialCategory,
    customCategory: initialCustom,
    amount: expense ? String(expense.amount) : '',
    currency: expense?.currency || 'XOF',
    note: expense?.note || ''
  })

  const categoryToSave = isOtherCategory(form.category)
    ? (form.customCategory?.trim() || 'Autre')
    : form.category

  const handleSubmit = async (e) => {
    e.preventDefault()
    const num = parseFloat(form.amount)
    if (!form.expense_date || !categoryToSave || isNaN(num) || num <= 0) {
      toast.error(t('expenses.validationRequired'))
      return
    }
    setSubmitLoading(true)
    try {
      if (isEdit) {
        await api.patch(`/expenses/${expense.id}`, {
          expense_date: form.expense_date,
          category: categoryToSave,
          amount: num,
          currency: form.currency || 'XOF',
          note: form.note || null
        })
        toast.success(t('expenses.successUpdated'))
      } else {
        await api.post('/expenses', {
          expense_date: form.expense_date,
          category: categoryToSave,
          amount: num,
          currency: form.currency || 'XOF',
          note: form.note || null
        })
        toast.success(t('expenses.successCreated'))
      }
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.error || t('expenses.errorSave'))
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-space-900 border border-space-700 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-semibold text-gray-100">
            {isEdit ? t('expenses.editExpense') : t('expenses.addExpense')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-300 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">{t('expenses.date')}</label>
            <input
              type="date"
              required
              value={form.expense_date}
              onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">{t('expenses.category')}</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="input w-full"
            >
              <option value="Loyer">{t('expenses.categoryRent')}</option>
              <option value="Stock / Achats">{t('expenses.categoryStock')}</option>
              <option value="Transport">{t('expenses.categoryTransport')}</option>
              <option value="Marketing">{t('expenses.categoryMarketing')}</option>
              <option value="Salaire">{t('expenses.categorySalary')}</option>
              <option value="Fournitures">{t('expenses.categorySupplies')}</option>
              <option value="Autre">{t('expenses.categoryOther')}</option>
            </select>
          </div>
          {form.category === 'Autre' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">{t('expenses.customCategory')}</label>
              <input
                type="text"
                value={form.customCategory}
                onChange={(e) => setForm((f) => ({ ...f, customCategory: e.target.value }))}
                className="input w-full"
                placeholder={t('expenses.customCategoryPlaceholder')}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">{t('expenses.amount')}</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="input w-full"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">{t('expenses.currency')}</label>
            <input
              type="text"
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              className="input w-full"
              placeholder="XOF"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">{t('expenses.note')}</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="input w-full"
              placeholder={t('expenses.noteOptional')}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-space-700 hover:bg-space-600 text-gray-200 rounded-xl transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitLoading}
              className="flex-1 px-4 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitLoading && <Loader2 className="w-5 h-5 animate-spin" />}
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
