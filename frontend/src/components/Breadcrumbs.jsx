import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

/**
 * @param {{ items: Array<{ label: string, href?: string }> }} props
 */
export default function Breadcrumbs({ items }) {
  if (!items?.length) return null
  return (
    <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-4" aria-label="Fil d'Ariane">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />}
            {item.href != null && !isLast ? (
              <Link to={item.href} className="hover:text-gray-200 transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-gray-200 font-medium' : ''}>{item.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
