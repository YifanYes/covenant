'use client'
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'

const Collapsible = CollapsiblePrimitive.Root

function CollapsibleTrigger(props: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return <CollapsiblePrimitive.CollapsibleTrigger data-slot="collapsible-trigger" {...props} />
}

function CollapsibleContent(props: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return <CollapsiblePrimitive.CollapsibleContent data-slot="collapsible-content" {...props} />
}

export default Collapsible
export { CollapsibleTrigger, CollapsibleContent }
