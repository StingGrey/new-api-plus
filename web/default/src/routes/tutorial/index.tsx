import { createFileRoute } from '@tanstack/react-router'
import { Tutorial } from '@/features/tutorial'

export const Route = createFileRoute('/tutorial/')({
  component: Tutorial,
})
