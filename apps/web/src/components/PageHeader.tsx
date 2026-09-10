import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  count?: number
  right?: ReactNode
}

export function PageHeader({ title, subtitle, count, right }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-row">
        <div className="page-header-title-row">
          <h1>{title}</h1>
          {typeof count === 'number' && count > 0 ? (
            <span className="count-pill">{count}</span>
          ) : null}
        </div>
        {right}
      </div>
      {subtitle ? <p className="subtitle">{subtitle}</p> : null}
    </header>
  )
}
