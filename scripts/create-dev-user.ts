import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const EMAIL = 'dev@movu.app'
const PASSWORD = 'movu1234'

async function main() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  })

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }

  console.log(`✓ User created: ${EMAIL} / ${PASSWORD}`)
  console.log(`  UUID: ${data.user.id}`)
}

main()
