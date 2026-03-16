import { Link } from 'react-router-dom'

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  primaryAction, 
  secondaryAction 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-space-800/50 flex items-center justify-center mb-6 border border-space-700">
        <Icon className="w-8 h-8 text-gold-400" />
      </div>
      <h3 className="text-xl font-display font-semibold text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-gray-400 max-w-md mx-auto mb-8">
        {description}
      </p>
      
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {primaryAction && (
          primaryAction.to ? (
            <Link
              to={primaryAction.to}
              className="btn-primary"
            >
              {primaryAction.icon && <primaryAction.icon className="w-4 h-4 mr-2" />}
              {primaryAction.label}
            </Link>
          ) : (
            <button
              onClick={primaryAction.onClick}
              className="btn-primary"
            >
              {primaryAction.icon && <primaryAction.icon className="w-4 h-4 mr-2" />}
              {primaryAction.label}
            </button>
          )
        )}
        
        {secondaryAction && (
          secondaryAction.to ? (
            <Link
              to={secondaryAction.to}
              target={secondaryAction.external ? "_blank" : undefined}
              rel={secondaryAction.external ? "noopener noreferrer" : undefined}
              className="px-4 py-2 rounded-xl font-medium text-gray-400 hover:text-gray-200 bg-space-800/50 hover:bg-space-700/50 transition-colors border border-space-700"
            >
              {secondaryAction.icon && <secondaryAction.icon className="w-4 h-4 mr-2 inline" />}
              {secondaryAction.label}
            </Link>
          ) : (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2 rounded-xl font-medium text-gray-400 hover:text-gray-200 bg-space-800/50 hover:bg-space-700/50 transition-colors border border-space-700"
            >
              {secondaryAction.icon && <secondaryAction.icon className="w-4 h-4 mr-2 inline" />}
              {secondaryAction.label}
            </button>
          )
        )}
      </div>
    </div>
  )
}
