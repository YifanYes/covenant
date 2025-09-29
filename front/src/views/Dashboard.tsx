import ObjectiveCard from '@/components/ObjectiveCard'
import { trpc } from '@/utils/trpc.utils'
import { useSuspenseQuery } from '@tanstack/react-query'

export default function Dashboard() {
  const { data } = useSuspenseQuery(trpc.objectives.getAll.queryOptions())

  return (
    <div>
      <h1>Dashboard</h1>
      {data.objectives?.map((objective) => (
        <ObjectiveCard
          key={objective.id}
          name={objective.name}
          {...(objective.description && { description: objective.description })}
        />
      ))}
    </div>
  )
}
