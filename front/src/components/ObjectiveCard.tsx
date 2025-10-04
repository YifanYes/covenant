import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export default function ObjectiveCard({ name, description }: { name: string; description?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
      </CardHeader>
      {description && (
        <CardContent>
          <p>{description}</p>
        </CardContent>
      )}
    </Card>
  )
}
