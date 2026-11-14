import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Display, Input } from '@/components/ui'
import { CoachLayout } from '@/components/CoachLayout'
import { ExerciseCard } from '@/features/exercises/ExerciseCard'
import { useExercises } from '@/features/exercises/useExercises'
import { useBookmarkIds, useToggleBookmark } from '@/features/exercises/useBookmarks'
import { useCoachContext } from '@/features/auth/useCoach'
import { CATEGORIES } from '@/lib/exercise-taxonomy'
import { cn } from '@/lib/cn'
import { useDebounced } from '@/lib/useDebounced'
import { useT } from '@/lib/i18n'

/** The 8 that cover most gym floors. The full list of 28 is available upstream if needed. */
const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'cable',
  'machine',
  'body weight',
  'kettlebell',
  'band',
  'smith machine',
] as const

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-pill px-3.5 py-1.5 text-caption font-medium capitalize transition-colors',
        active ? 'bg-accent text-plum' : 'bg-white/8 text-on-dark/75 hover:text-on-dark',
      )}
    >
      {children}
    </button>
  )
}

export function Exercises() {
  const t = useT()
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [equipments, setEquipments] = useState<string[]>([])

  const debouncedSearch = useDebounced(search)
  const query = useExercises({ search: debouncedSearch, categories, equipments })

  const { data: coach } = useCoachContext()
  const bookmarkIds = useBookmarkIds()
  const toggleBookmark = useToggleBookmark(coach?.gym?.id)

  const toggle = (list: string[], set: (next: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

  const exercises = query.data?.pages.flat() ?? []
  const hasFilters = categories.length > 0 || equipments.length > 0 || search.length > 0

  return (
    <CoachLayout>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Display size="md" as="h1" className="text-accent">
          {t('nav.exercises')}
        </Display>
        <Link to="/coach/exercises/new">
          <Button>{t('exercises.custom.new')}</Button>
        </Link>
      </div>

      <div className="mt-8 flex flex-col gap-5">
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('exercises.searchPlaceholder')}
          className="max-w-md"
        />

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <FilterChip
              key={category}
              active={categories.includes(category)}
              onClick={() => toggle(categories, setCategories, category)}
            >
              {category}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map((equipment) => (
            <FilterChip
              key={equipment}
              active={equipments.includes(equipment)}
              onClick={() => toggle(equipments, setEquipments, equipment)}
            >
              {equipment}
            </FilterChip>
          ))}
        </div>

        {hasFilters && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('')
                setCategories([])
                setEquipments([])
              }}
            >
              {t('exercises.clearFilters')}
            </Button>
          </div>
        )}
      </div>

      {query.isPending && <p className="mt-10 text-body-sm text-muted-dark">{t('state.loading')}</p>}

      {query.isError && (
        <p role="alert" className="mt-10 text-body-sm text-danger">
          {t('error.generic.body')}
        </p>
      )}

      {query.isSuccess && exercises.length === 0 && (
        <p className="mt-10 text-body-sm text-muted-dark">{t('exercises.noResults')}</p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            bookmarked={bookmarkIds.data?.has(exercise.id) ?? false}
            onToggleBookmark={(target, next) =>
              toggleBookmark.mutate({ exerciseId: target.id, on: next })
            }
          />
        ))}
      </div>

      {query.hasNextPage && (
        <div className="mt-10 flex justify-center">
          <Button onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchingNextPage ? t('state.loading') : t('exercises.loadMore')}
          </Button>
        </div>
      )}
    </CoachLayout>
  )
}
