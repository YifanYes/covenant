import { trpc } from '@/utils/trpc'
import { useQuery } from '@tanstack/react-query'

export default function Dashboard() {
  const { data, isLoading } = useQuery(trpc.objectives.getAll.queryOptions())

  console.log(data)
  return (
    <div>
      <h1>Dashboard</h1>
    </div>
  )
}
