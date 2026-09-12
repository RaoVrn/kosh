import { useState } from 'react'
import { Icon } from './Icon'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  ariaLabel?: string
  placeholder?: string
}

export function TagInput({
  tags,
  onChange,
  ariaLabel = 'Tags',
  placeholder = 'Add a tag',
}: TagInputProps) {
  const [value, setValue] = useState('')

  const addTag = () => {
    const tag = value.trim().replace(/,/g, '')
    if (!tag) return
    if (!tags.includes(tag)) onChange([...tags, tag])
    setValue('')
  }

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag))

  return (
    <div className="tag-input">
      <div className="tag-list">
        {tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
              className="tag-remove"
            >
              <Icon name="x" size={10} />
            </button>
          </span>
        ))}
      </div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addTag()
          }
          if (e.key === 'Backspace' && value === '' && tags.length > 0) {
            const last = tags[tags.length - 1]
            if (last) removeTag(last)
          }
        }}
        onBlur={addTag}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    </div>
  )
}
