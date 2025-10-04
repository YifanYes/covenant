import ObjectiveCard from '@/components/ObjectiveCard'
import { trpc } from '@/utils/trpc'
import { useQuery } from '@tanstack/react-query'

export default function Dashboard() {
  const { data, isLoading } = useQuery(trpc.objectives.getAll.queryOptions())

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>Dashboard</h1>
      {data?.objectives?.map((objective) => (
        <ObjectiveCard
          key={objective.id}
          name={objective.name}
          {...(objective.description && { description: objective.description })}
        />
      ))}
    </div>
  )
}
