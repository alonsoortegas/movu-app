export type PerformedWorkoutHistoryInput = {
  id: string
  activityId: string | null
  title: string
  date: string
  status: string
}

export type ActivityWorkoutHistoryInput = {
  id: string
  title: string
  date: string
}

export type RecentWorkoutDisplay = {
  id: string
  title: string
  date: string
  status: string
  source: 'performed' | 'activity'
}

function timestamp(value: string): number {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function mergeRecentWorkouts(
  performed: PerformedWorkoutHistoryInput[],
  activities: ActivityWorkoutHistoryInput[],
  limit = 5,
): RecentWorkoutDisplay[] {
  const linkedActivityIds = new Set(
    performed.flatMap((workout) => workout.activityId ? [workout.activityId] : []),
  )

  const rows: RecentWorkoutDisplay[] = [
    ...performed.map((workout) => ({
      id: `performed:${workout.id}`,
      title: workout.title,
      date: workout.date,
      status: workout.status,
      source: 'performed' as const,
    })),
    ...activities
      .filter((activity) => !linkedActivityIds.has(activity.id))
      .map((activity) => ({
        id: `activity:${activity.id}`,
        title: activity.title,
        date: activity.date,
        status: 'logged',
        source: 'activity' as const,
      })),
  ]

  return rows
    .sort((left, right) => timestamp(right.date) - timestamp(left.date))
    .slice(0, Math.max(0, limit))
}
