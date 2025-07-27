import { z } from 'zod/v4'

export const createAreaSchema = z.object({
  name: z.string(),
  color: z.string().optional(),
  icon: z.string().optional()
})

export const updateAreaSchema = z.object({
  id: z.uuid(),
  name: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional()
})

export const deleteAreaSchema = z.object({
  id: z.uuid()
})

export const defaultAreas = [
  {
    name: 'areas.finances',
    color: '#A8D5BA',
    icon: 'Banknote'
  },
  {
    name: 'areas.mental_health',
    color: '#D7BDE2',
    icon: 'Brain'
  },
  {
    name: 'areas.family_and_friends',
    color: '#FAD7A0',
    icon: 'Users'
  },
  {
    name: 'areas.love',
    color: '#F5B7B1',
    icon: 'Heart'
  },
  {
    name: 'areas.career',
    color: '#AED6F1',
    icon: 'BriefcaseBusiness'
  },
  {
    name: 'areas.physical_health',
    color: '#F9E79F',
    icon: 'Dumbbell'
  }
]
