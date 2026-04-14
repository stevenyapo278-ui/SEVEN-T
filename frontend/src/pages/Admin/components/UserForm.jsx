import { useState, useEffect, useMemo } from 'react'
import DatePicker from 'react-datepicker'
import { Clock, Zap, Activity } from 'lucide-react'
import { PLAN_MODULES, ACTION_LABELS } from '../constants'
import { getCreditsForPlan } from '../utils'
import api from '../../../services/api'
import toast from 'react-hot-toast'

// --- RbacRoleSelector ---
export function RbacRoleSelector({ selectedRoles = [], availableRoles = [], onChange }) {
  const toggleRole = (roleKey) => {
    if (selectedRoles.includes(roleKey)) {
      onChange(selectedRoles.filter(r => r !== roleKey))
    } else {
      onChange([...selectedRoles, roleKey])
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {availableRoles.map((role) => {
        const isSelected = selectedRoles.includes(role.key)
        return (
          <button
            key={role.key}
            type="button"
            onClick={() => toggleRole(role.key)}
            className={`flex flex-col items-start p-3 rounded-xl border transition-all text-left group ${
              isSelected 
                ? 'bg-gold-400/10 border-gold-400/50 ring-1 ring-gold-400/20' 
                : 'bg-space-800/50 border-space-700 hover:border-space-500'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-gold-400' : 'text-gray-400'}`}>
                {role.name}
              </span>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                isSelected ? 'bg-gold-400 border-gold-400' : 'border-space-500'
              }`}>
                {isSelected && <Zap className="w-2.5 h-2.5 text-space-950 fill-current" />}
              </div>
            </div>
            <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed group-hover:text-gray-400 transition-colors">
              {role.description}
            </p>
          </button>
        )
      })}
    </div>
  )
}

// --- Module Selector ---
export function ModuleSelector({ formData, setFormData, currentPlanFeatures, plans, parentUser }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {PLAN_MODULES.map(({ key, label, description }) => { 
        const isManager = !!parentUser?.id; 
        let ownerAllowed = true; 
        if (isManager) { 
          const parentPlanName = parentUser.parent_plan || "free"; 
          const parentPlan = (plans || []).find(p => (p.name || p.id) === parentPlanName); 
          const moduleBaseKey = key.replace("_enabled", ""); 
          const planHas = parentPlan?.features?.[moduleBaseKey] === true || parentPlan?.features?.[moduleBaseKey] === 1; 
          const overrideHas = parentUser[`p_${key}`] === 1 || parentUser[`p_${key}`] === true; 
          ownerAllowed = planHas || overrideHas; 
        } 
        
        const featBaseKey = key.replace("_enabled", "");
        const isIncludedInPlan = !!currentPlanFeatures[featBaseKey] || !!currentPlanFeatures[key];

        return (
          <label 
            key={key} 
            className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
              !ownerAllowed 
                ? 'opacity-50 border-red-500/20 bg-red-500/5 cursor-not-allowed' 
                : isIncludedInPlan
                  ? 'bg-emerald-500/5 border-emerald-500/20 cursor-default cursor-not-allowed'
                  : 'cursor-pointer border-space-700 hover:border-space-600'
            }`}
            title={!ownerAllowed ? "Le client (owner) n'a pas accès à ce module." : description}
          >
            <input
              type="checkbox"
              checked={isIncludedInPlan || !!formData[key]}
              disabled={!ownerAllowed || isIncludedInPlan}
              onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
              className={`w-4 h-4 rounded border-space-700 bg-space-800 ${
                !ownerAllowed ? 'text-gray-600' : isIncludedInPlan ? 'text-emerald-500/50 cursor-not-allowed' : 'text-gold-400 focus:ring-gold-400'
              }`}
            />
            <div className="flex flex-col text-left">
              <span className={`text-[13px] ${!ownerAllowed ? 'text-red-400/80 font-medium' : isIncludedInPlan ? 'text-emerald-400/90 font-medium' : 'text-gray-300'}`}>{label}</span>
              {!ownerAllowed && <span className="text-[8px] text-red-500/60 uppercase font-bold tracking-tighter italic">Limité par le client</span>}
              {isIncludedInPlan && <span className="text-[9px] text-emerald-500/80 uppercase font-bold tracking-tighter">✨ Inclus dans le plan</span>}
            </div>
          </label>
        ); 
      })}
    </div>
  )
}
