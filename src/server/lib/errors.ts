import { TRPCError } from '@trpc/server'

export const RESOURCE_NOT_FOUND_OR_FORBIDDEN = 'Resource not found or access denied'

export const resourceNotFound = () =>
  new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
