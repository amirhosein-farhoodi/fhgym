import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Input } from '@/components/ui'
import { useExercises, exerciseImageUrl } from '@/features/exercises/useExercises'
import { useBookmarkedExercises } from '@/features/exercises/useBookmarks'
import { exerciseName } from '@/features/exercises/name'
import { CATEGORIES } from '@/lib/exercise-taxonomy'
import { cn } from '@/lib/cn'
import { useDebounced } from '@/lib/useDebounced'
import { useI18n, useT } from '@/lib/i18n'
import type { Exercise } from '@/lib/db.types'

type Tab = 'bookmarks' | 'all'

/**
 * Multi-select drawer for adding exercises to a day.
 *
 * Opens on the Bookmarks tab, because the coach's own shortlist is what they want 90% of
 * the time and the full 1500 is what they fall back to. Multi-select so a whole training day
 * goes in with one confirm rather than one round trip per movement.
 */
export function ExercisePicker({
  onConfirm,
  onClose,
}: {
  onConfirm: (exerciseIds: string[]) => void
  onClose: () => void
}) {
  const t = useT()
  const { locale } = useI18n()
  // Derived, not stored: the default tab depends on whether a shortlist exists, and an
  // effect that flipped it after load would fight the coach's own choice on re-render.
  // null means "no explicit choice yet, use the sensible default".
  const [tabChoice, setTabChoice] = useState<Tab | null>(null)
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>([])

  const debouncedSearch = useDebounced(search)
  const bookmarks = useBookmarkedExercises()
  const catalog = useExercises({ search: debouncedSearch, categories, equipments: [] })

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Opens on the shortlist when there is one, otherwise straight to the full catalog —
  // an empty default tab would look broken.
  const hasBookmarks = (bookmarks.data?.length ?? 0) > 0
  const tab: Tab = tabChoice ?? (hasBookmarks ? 'bookmarks' : 'all')

  const shown: Exercise[] = useMemo(() => {
    if (tab === 'bookmarks') {
      const term = debouncedSearch.trim().toLowerCase()
      const list = bookmarks.data ?? []
      return term ? list.filter((e) => e.name.toLowerCase().includes(term)) : list
    }
    return catalog.data?.pages.flat() ?? []
  }, [tab, bookmarks.data, catalog.data, debouncedSearch])

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={t('builder.picker.title')}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="flex h-[88dvh] w-full max-w-3xl flex-col rounded-t-special bg-surface-card sm:h-[80dvh] sm:rounded-special">
        <div className="flex flex-col gap-4 border-b border-line-dark p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-heading-sm text-accent">{t('builder.picker.title')}</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t('action.cancel')}
            </Button>
          </div>

          <div className="flex gap-1 rounded-pill bg-white/8 p-1 self-start">
            {(['bookmarks', 'all'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTabChoice(value)}
                aria-pressed={tab === value}
                className={cn(
                  'rounded-pill px-4 py-1.5 text-caption font-medium transition-colors',
                  tab === value ? 'bg-accent text-plum' : 'text-on-dark/70 hover:text-on-dark',
                )}
              >
                {value === 'bookmarks' ?
                  `${t('builder.picker.bookmarks')} (${bookmarks.data?.length ?? 0})`
                : t('builder.picker.all')}
              </button>
            ))}
          </div>

          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('exercises.searchPlaceholder')}
          />

          {tab === 'all' && (
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={categories.includes(category)}
                  onClick={() =>
                    setCategories((prev) =>
                      prev.includes(category)
                        ? prev.filter((c) => c !== category)
                        : [...prev, category],
                    )
                  }
                  className={cn(
                    'rounded-pill px-3 py-1 text-caption capitalize transition-colors',
                    categories.includes(category)
                      ? 'bg-accent text-plum'
                      : 'bg-white/8 text-on-dark/70',
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <ul className="flex flex-col gap-2">
            {shown.map((exercise) => {
              const isSelected = selected.includes(exercise.id)
              const src = exerciseImageUrl(exercise)
              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    onClick={() => toggle(exercise.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-card p-2 text-start transition-colors',
                      isSelected ? 'bg-accent/20 ring-1 ring-accent' : 'hover:bg-white/6',
                    )}
                  >
                    <span className="size-12 shrink-0 overflow-hidden rounded-[8px] bg-white">
                      {src && (
                        <img src={src} alt="" loading="lazy" className="h-full w-full object-contain" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm">
                        {exerciseName(exercise, locale)}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {exercise.categories.slice(0, 2).map((category) => (
                          <Badge key={category} tone="neutral" className="capitalize">
                            {category}
                          </Badge>
                        ))}
                      </span>
                    </span>
                    {isSelected && <Badge tone="accent">✓</Badge>}
                  </button>
                </li>
              )
            })}
          </ul>

          {tab === 'all' && catalog.hasNextPage && (
            <div className="mt-5 flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void catalog.fetchNextPage()}
                disabled={catalog.isFetchingNextPage}
              >
                {t('exercises.loadMore')}
              </Button>
            </div>
          )}

          {shown.length === 0 && !catalog.isPending && (
            <p className="text-body-sm text-muted-dark">{t('exercises.noResults')}</p>
          )}
        </div>

        <div className="border-t border-line-dark p-5">
          <Button
            fullWidth
            disabled={selected.length === 0}
            onClick={() => {
              onConfirm(selected)
              onClose()
            }}
          >
            {t('builder.picker.add', { count: selected.length })}
          </Button>
        </div>
      </div>
    </div>
  )
}
