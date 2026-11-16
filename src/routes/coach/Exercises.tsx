import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Dumbbell, FilterX, Plus, Search, SearchX, Shapes, Wrench } from 'lucide-react'
import { Button, Chip, EmptyState, Input, PageHeader } from '@/components/ui'
import { InlineSpinner } from '@/components/Feedback'
import { CoachLayout } from '@/components/CoachLayout'
import { ExerciseCard } from '@/features/exercises/ExerciseCard'
import { useExercises } from '@/features/exercises/useExercises'
import { useBookmarkIds, useToggleBookmark } from '@/features/exercises/useBookmarks'
import { useCoachContext } from '@/features/auth/useCoach'
import { CATEGORIES } from '@/lib/exercise-taxonomy'
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
      <PageHeader
        icon={Dumbbell}
        eyebrow={t('nav.dashboard')}
        title={t('nav.exercises')}
        actions={
          <Link to="/coach/exercises/new">
            <Button>
              <Plus aria-hidden />
              {t('exercises.custom.new')}
            </Button>
          </Link>
        }
      />

      <div className="mt-8 flex flex-col gap-4 rounded-card border border-line/70 bg-surface-card p-4 shadow-card sm:p-5">
        <div className="relative max-w-md">
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

        <div className="flex items-start gap-3">
          <Shapes aria-hidden className="mt-2 size-4 shrink-0 text-copper" />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <Chip
                key={category}
                active={categories.includes(category)}
                onClick={() => toggle(categories, setCategories, category)}
              >
                {category}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Wrench aria-hidden className="mt-2 size-4 shrink-0 text-copper" />
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((equipment) => (
              <Chip
                key={equipment}
                active={equipments.includes(equipment)}
                onClick={() => toggle(equipments, setEquipments, equipment)}
              >
                {equipment}
              </Chip>
            ))}
          </div>
        </div>

        {hasFilters && (
          <div className="border-t border-line/70 pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('')
                setCategories([])
                setEquipments([])
              }}
            >
              <FilterX aria-hidden />
              {t('exercises.clearFilters')}
            </Button>
          </div>
        )}
      </div>

      {query.isPending && <InlineSpinner className="mt-10" />}

      {query.isError && (
        <p role="alert" className="mt-10 text-body-sm text-danger">
          {t('error.generic.body')}
        </p>
      )}

      {query.isSuccess && exercises.length === 0 && (
        <EmptyState icon={SearchX} title={t('exercises.noResults')} className="mt-8" />
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
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
          <Button
            variant="secondary"
            onClick={() => void query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? t('state.loading') : t('exercises.loadMore')}
          </Button>
        </div>
      )}
    </CoachLayout>
  )
}
