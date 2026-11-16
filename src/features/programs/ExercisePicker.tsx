import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Bookmark, Check, Library, Plus, Search, SearchX, Sparkles, X } from 'lucide-react'
import { Badge, Button, Chip, Input } from '@/components/ui'
import { useExercises, exerciseImageUrl, mediaCrossOrigin } from '@/features/exercises/useExercises'
import { useBookmarkedExercises } from '@/features/exercises/useBookmarks'
import { CustomExerciseForm } from '@/features/exercises/CustomExerciseForm'
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
  // Inline "new exercise": the coach invents a movement without leaving the program.
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<Exercise[]>([])

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

  // Exercises made in this session are pinned to the top, already selected.
  const createdIds = new Set(created.map((e) => e.id))
  const list = [...created, ...shown.filter((e) => !createdIds.has(e.id))]

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-steel/55 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('builder.picker.title')}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="flex h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-special bg-surface shadow-raised sm:h-[82dvh] sm:rounded-special">
        <div className="flex flex-col gap-4 border-b border-line bg-surface-card p-5">
          <div className="flex items-center justify-between gap-4">
            {creating ?
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-fg-muted hover:text-fg"
              >
                <ArrowLeft aria-hidden className="icon-directional size-4" />
                {t('builder.picker.back')}
              </button>
            : <h2 className="font-display text-heading-sm text-fg">{t('builder.picker.title')}</h2>}
            <div className="ms-auto flex items-center gap-1">
              {!creating && (
                <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
                  <Plus aria-hidden />
                  {t('builder.picker.create')}
                </Button>
              )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('action.cancel')}
              className="flex size-10 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg"
            >
              <X aria-hidden className="size-5" />
            </button>
            </div>
          </div>

          {!creating && (
          <>

          <div className="flex gap-0.5 self-start rounded-pill border border-line bg-surface-sunken/70 p-0.5">
            {(['bookmarks', 'all'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTabChoice(value)}
                aria-pressed={tab === value}
                className={cn(
                  'flex h-9 items-center gap-1.5 rounded-pill px-4 text-caption font-semibold transition-colors',
                  tab === value ? 'bg-steel text-cream shadow-sm' : 'text-fg-muted hover:text-fg',
                )}
              >
                {value === 'bookmarks' ?
                  <Bookmark aria-hidden className="size-3.5" />
                : <Library aria-hidden className="size-3.5" />}
                {value === 'bookmarks' ?
                  `${t('builder.picker.bookmarks')} (${bookmarks.data?.length ?? 0})`
                : t('builder.picker.all')}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute start-3.5 top-1/2 size-[18px] -translate-y-1/2 text-fg-subtle"
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('exercises.searchPlaceholder')}
              className="ps-10"
            />
          </div>

          {tab === 'all' && (
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((category) => (
                <Chip
                  key={category}
                  active={categories.includes(category)}
                  onClick={() =>
                    setCategories((prev) =>
                      prev.includes(category)
                        ? prev.filter((c) => c !== category)
                        : [...prev, category],
                    )
                  }
                >
                  {category}
                </Chip>
              ))}
            </div>
          )}
          </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {creating ?
            <CustomExerciseForm
              onCreated={(exercise) => {
                setCreated((prev) => [exercise, ...prev])
                setSelected((prev) => [...prev, exercise.id])
                setCreating(false)
              }}
              onCancel={() => setCreating(false)}
            />
          : <>
          <ul className="flex flex-col gap-2">
            {list.map((exercise) => {
              const isSelected = selected.includes(exercise.id)
              const isNew = createdIds.has(exercise.id)
              const src = exerciseImageUrl(exercise)
              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    onClick={() => toggle(exercise.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-card border p-2 text-start transition-colors',
                      isSelected
                        ? 'border-pine bg-pine-soft'
                        : 'border-transparent hover:border-line hover:bg-surface-card',
                    )}
                  >
                    <span className="size-12 shrink-0 overflow-hidden rounded-[10px] bg-paper ring-1 ring-line/60">
                      {src && (
                        <img src={src} crossOrigin={mediaCrossOrigin(src)} alt="" loading="lazy" className="h-full w-full object-contain" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm font-semibold">
                        {exerciseName(exercise, locale)}
                      </span>
                      {isNew && (
                        <span className="mt-0.5 flex items-center gap-1 text-caption font-semibold text-copper-deep">
                          <Sparkles aria-hidden className="size-3" />
                          {t('builder.picker.created')}
                        </span>
                      )}
                      <span className="mt-1 flex flex-wrap gap-1">
                        {exercise.categories.slice(0, 2).map((category) => (
                          <Badge key={category} tone="neutral" className="capitalize">
                            {category}
                          </Badge>
                        ))}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        isSelected ? 'border-pine bg-pine text-cream' : 'border-line-strong',
                      )}
                    >
                      {isSelected && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
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

          {list.length === 0 && !catalog.isPending && (
            <div className="flex flex-col items-center gap-3 py-10 text-body-sm text-fg-muted">
              <SearchX aria-hidden className="size-8 text-line-strong" />
              {t('exercises.noResults')}
              <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
                <Plus aria-hidden />
                {t('builder.picker.create')}
              </Button>
            </div>
          )}
          </>
          }
        </div>

        <div
          className={cn(
            'border-t border-line bg-surface-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]',
            creating && 'hidden',
          )}
        >
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
