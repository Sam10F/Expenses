import { cleanupStaleTestGroups, cleanupStaleTestUsers } from './helpers/supabase'

export default async function globalSetup() {
  await cleanupStaleTestGroups()
  await cleanupStaleTestUsers()
}
