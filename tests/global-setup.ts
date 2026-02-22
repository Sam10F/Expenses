import { cleanupStaleTestGroups } from './helpers/supabase'

export default async function globalSetup() {
  await cleanupStaleTestGroups()
}
