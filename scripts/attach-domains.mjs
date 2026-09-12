import { execFileSync } from 'node:child_process'

const raw = execFileSync('npx', ['wrangler', 'auth', 'token', '--json'], {
  encoding: 'utf8',
  env: process.env,
})
const start = raw.indexOf('{')
const end = raw.lastIndexOf('}')
if (start < 0 || end < start) {
  console.error('Could not read Wrangler credentials.')
  process.exit(1)
}
const parsed = JSON.parse(raw.slice(start, end + 1))
const token =
  parsed.token || parsed.oauth_token || parsed.access_token || parsed.value
if (!token) {
  console.error('Could not find an access token in Wrangler output.')
  process.exit(1)
}

const account = '974e84b53ef389050af4a398452978fc'
const project = 'meowmeowsoft-web'

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
}

if (process.argv.includes('--status')) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${project}/domains`,
    { headers },
  )
  const body = await res.json()
  for (const d of body.result ?? []) {
    console.log(
      `${d.name}: status=${d.status} verify=${d.verification_data?.status ?? '?'} err=${d.verification_data?.error_message || d.validation_data?.error_message || 'none'}`,
    )
  }
  if (!body.success) {
    console.log(body.errors?.map((e) => e.message).join('; ') || 'list failed')
  }
  process.exit(0)
}

for (const name of ['meowmeowsoft.com', 'www.meowmeowsoft.com']) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${project}/domains`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ name }),
    },
  )
  const body = await res.json()
  if (body.success) {
    console.log(`${name}: ${body.result?.status ?? 'added'}`)
  } else {
    const message = body.errors?.map((e) => e.message).join('; ') || res.status
    console.log(`${name}: failed (${message})`)
  }
}
