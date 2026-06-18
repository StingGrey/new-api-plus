import { createFileRoute } from '@tanstack/react-router'
import { FAQ } from '@/features/faq'

export const Route = createFileRoute('/faq/')({
  component: FAQ,
})
