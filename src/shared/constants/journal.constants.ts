export interface MoodDefinition {
  id: string
  color: string
}

export const MOODS: MoodDefinition[] = [
  { id: 'happy', color: '#FFD700' },
  { id: 'sad', color: '#4682B4' },
  { id: 'angry', color: '#DC143C' },
  { id: 'disappointed', color: '#8B7D6B' },
  { id: 'focused', color: '#228B22' },
  { id: 'hopeful', color: '#FF8C00' },
  { id: 'depressed', color: '#483D8B' },
  { id: 'calm', color: '#5F9EA0' },
  { id: 'anxious', color: '#B22222' },
  { id: 'excited', color: '#FF4500' },
  { id: 'grateful', color: '#DAA520' },
  { id: 'tired', color: '#708090' }
]

export const MOOD_COLOR_MAP: Map<string, string> = new Map(MOODS.map((m) => [m.id, m.color]))
