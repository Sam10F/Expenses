export default defineEventHandler(async (event) => {
  const { userId, username } = await requireAuth(event)
  return { user_id: userId, username }
})
