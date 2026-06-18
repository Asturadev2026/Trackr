"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface User {
  id: string
  name: string | null
  image: string | null
}

interface Props {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  rows?: number
  users: User[]
  className?: string
  disabled?: boolean
}

export function MentionTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder,
  rows = 3,
  users,
  className,
  disabled,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [showDropdown, setShowDropdown] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionStart, setMentionStart] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)

  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(mentionQuery.toLowerCase())
  )

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    const pos = e.target.selectionStart ?? 0
    onChange(val)

    const textBefore = val.slice(0, pos)
    const atMatch = textBefore.match(/@([\w\s]*)$/)
    if (atMatch && atMatch[0].length < 30) {
      setMentionQuery(atMatch[1])
      setMentionStart(pos - atMatch[0].length)
      setShowDropdown(true)
      setActiveIndex(0)
    } else {
      setShowDropdown(false)
    }
  }

  const insertMention = useCallback(
    (user: User) => {
      const before = value.slice(0, mentionStart)
      const cursorPos = textareaRef.current?.selectionStart ?? mentionStart + mentionQuery.length + 1
      const after = value.slice(cursorPos)
      const mention = `@[${user.name}](${user.id}) `
      const next = before + mention + after
      onChange(next)
      setShowDropdown(false)
      setMentionQuery("")
      setTimeout(() => {
        const ta = textareaRef.current
        if (ta) {
          const newPos = before.length + mention.length
          ta.focus()
          ta.setSelectionRange(newPos, newPos)
        }
      }, 0)
    },
    [value, mentionStart, mentionQuery, onChange]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showDropdown && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, filteredUsers.length - 1))
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        insertMention(filteredUsers[activeIndex])
        return
      }
      if (e.key === "Escape") {
        setShowDropdown(false)
        return
      }
    }
    onKeyDown?.(e)
  }

  useEffect(() => {
    if (!showDropdown) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showDropdown])

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
      />

      {showDropdown && filteredUsers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 bottom-full mb-1 left-0 w-64 bg-popover border rounded-lg shadow-lg overflow-hidden"
        >
          <div className="py-1">
            {filteredUsers.slice(0, 6).map((user, i) => (
              <button
                key={user.id}
                type="button"
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted transition-colors",
                  i === activeIndex && "bg-muted"
                )}
                onMouseDown={(e) => {
                  e.preventDefault()
                  insertMention(user)
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={user.image ?? undefined} />
                  <AvatarFallback className="text-[10px]">{getInitials(user.name ?? "?")}</AvatarFallback>
                </Avatar>
                <span className="font-medium truncate">{user.name}</span>
              </button>
            ))}
          </div>
          <div className="px-3 py-1.5 border-t bg-muted/30">
            <p className="text-[10px] text-muted-foreground">↑↓ navigate · Enter/Tab select · Esc close</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Render comment text with @[Name](id) → highlighted @Name
export function renderMentions(content: string): React.ReactNode[] {
  const parts = content.split(/@\[([^\]]+)\]\(([^)]+)\)/)
  return parts.map((part, i) => {
    if (i % 3 === 0) return part || null
    if (i % 3 === 1) return (
      <span key={i} className="text-primary font-medium bg-primary/10 px-0.5 rounded text-sm">
        @{part}
      </span>
    )
    return null // id segment
  }).filter(Boolean) as React.ReactNode[]
}
