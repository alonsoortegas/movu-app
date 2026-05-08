import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const PASSWORD = 'movu1234'

const USERS = [
  { email: 'sebas@movu.app', fullName: 'Sebas', inviteCode: 'MOVU-SEBAS-01' },
  { email: 'alonso@movu.app', fullName: 'Alonso', inviteCode: 'MOVU-ALONSO-01' },
]

async function main() {
  const { data: existing, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('Error:', listError.message)
    process.exit(1)
  }

  for (const user of USERS) {
    const existingUser = existing.users.find((u) => u.email === user.email)

    if (existingUser) {
      const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password: PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: user.fullName,
          invite_code: user.inviteCode,
        },
      })

      if (error) {
        console.error(`Error updating ${user.email}:`, error.message)
        process.exit(1)
      }

      console.log(`✓ User updated: ${user.email} / ${PASSWORD}`)
      console.log(`  UUID: ${existingUser.id}`)
      continue
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: user.fullName,
        invite_code: user.inviteCode,
      },
    })

    if (error) {
      console.error(`Error creating ${user.email}:`, error.message)
      process.exit(1)
    }

    console.log(`✓ User created: ${user.email} / ${PASSWORD}`)
    console.log(`  UUID: ${data.user.id}`)
  }
}

main()
