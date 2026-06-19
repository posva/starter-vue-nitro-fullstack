<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { authClient } from '../lib/auth-client'
import { useAuth } from '../lib/use-auth'

const router = useRouter()
const { session, refresh } = useAuth()

const SOCIAL = [
  { id: 'github', label: 'GitHub' },
  { id: 'google', label: 'Google' },
  { id: 'vercel', label: 'Vercel' },
] as const

// Infer the row shapes straight from the client so they never drift from the API.
type LinkedAccount = NonNullable<
  Awaited<ReturnType<typeof authClient.listAccounts>>['data']
>[number]
type Passkey = NonNullable<
  Awaited<ReturnType<typeof authClient.passkey.listUserPasskeys>>['data']
>[number]

const linked = shallowRef<LinkedAccount[]>([])
const passkeys = shallowRef<Passkey[]>([])
const ready = ref(false)
const error = ref<string | null>(null)
const busy = ref(false)

// Name typed in the "add passkey" field, and inline-rename state.
const newPasskeyName = ref('')
const editingId = ref<string | null>(null)
const editName = ref('')

async function load() {
  error.value = null
  await refresh()
  if (!session.value) {
    router.replace('/login')
    return
  }
  const [accounts, keys] = await Promise.all([
    authClient.listAccounts(),
    authClient.passkey.listUserPasskeys(),
  ])
  linked.value = accounts.data ?? []
  passkeys.value = keys.data ?? []
  ready.value = true
}

onMounted(load)

function isLinked(provider: string) {
  return linked.value.some((a) => a.providerId === provider)
}

async function link(provider: string) {
  error.value = null
  // Redirects into the OAuth flow; auto-links to this account on return because
  // the email matches (account linking is enabled server-side).
  const { error: e } = await authClient.linkSocial({
    provider: provider as 'github' | 'google' | 'vercel',
    callbackURL: '/account',
  })
  if (e) error.value = e.message ?? `Could not link ${provider}`
}

async function unlink(providerId: string, accountId: string) {
  error.value = null
  busy.value = true
  try {
    const { error: e } = await authClient.unlinkAccount({ providerId, accountId })
    if (e) throw new Error(e.message)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not unlink'
  } finally {
    busy.value = false
  }
}

async function addPasskey() {
  error.value = null
  busy.value = true
  try {
    // Use the typed name, falling back to a sensible default if left blank.
    const name = newPasskeyName.value.trim() || `Passkey ${passkeys.value.length + 1}`
    const res = await authClient.passkey.addPasskey({ name })
    if (res?.error) throw new Error(res.error.message)
    newPasskeyName.value = ''
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not register passkey'
  } finally {
    busy.value = false
  }
}

function startRename(key: Passkey) {
  editingId.value = key.id
  editName.value = key.name ?? ''
}

function cancelRename() {
  editingId.value = null
  editName.value = ''
}

async function saveRename(id: string) {
  const name = editName.value.trim()
  if (!name) return
  error.value = null
  busy.value = true
  try {
    const { error: e } = await authClient.passkey.updatePasskey({ id, name })
    if (e) throw new Error(e.message)
    cancelRename()
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not rename passkey'
  } finally {
    busy.value = false
  }
}

async function deletePasskey(id: string) {
  error.value = null
  busy.value = true
  try {
    const { error: e } = await authClient.passkey.deletePasskey({ id })
    if (e) throw new Error(e.message)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not delete passkey'
  } finally {
    busy.value = false
  }
}

async function logout() {
  await authClient.signOut()
  await refresh()
  router.push('/login')
}
</script>

<template>
  <main>
    <div v-if="!ready" class="card"><p>Loading…</p></div>

    <template v-else-if="session">
      <div class="header">
        <h1>Account</h1>
        <button class="button ghost" :disabled="busy" @click="logout">Sign out</button>
      </div>

      <div class="card">
        <h2>Profile</h2>
        <p><strong>Name:</strong> {{ session.user.name }}</p>
        <p><strong>Email:</strong> {{ session.user.email }}</p>
        <p>
          <strong>Email verified:</strong>
          {{ session.user.emailVerified ? 'yes' : 'no' }}
        </p>
      </div>

      <div class="card">
        <h2>Connected providers</h2>
        <p class="hint">
          Sign in with any provider sharing this email and it links here automatically.
        </p>
        <ul class="list">
          <li v-for="p in SOCIAL" :key="p.id">
            <span>{{ p.label }}</span>
            <template v-if="isLinked(p.id)">
              <span class="tag">linked</span>
              <button
                class="link"
                :disabled="busy"
                @click="unlink(p.id, linked.find((a) => a.providerId === p.id)!.accountId)"
              >
                Unlink
              </button>
            </template>
            <button v-else class="link" :disabled="busy" @click="link(p.id)">Connect</button>
          </li>
        </ul>
      </div>

      <div class="card">
        <h2>Passkeys</h2>
        <form class="add-passkey" @submit.prevent="addPasskey">
          <input
            v-model="newPasskeyName"
            type="text"
            placeholder="Passkey name (e.g. MacBook Touch ID)"
            :disabled="busy"
          />
          <button class="button" type="submit" :disabled="busy">Add passkey</button>
        </form>

        <p v-if="!passkeys.length" class="hint">No passkeys yet.</p>
        <ul v-else class="list">
          <li v-for="key in passkeys" :key="key.id">
            <!-- Inline rename -->
            <template v-if="editingId === key.id">
              <input
                v-model="editName"
                class="rename-input"
                type="text"
                :disabled="busy"
                @keyup.enter="saveRename(key.id)"
                @keyup.esc="cancelRename"
              />
              <button class="link" :disabled="busy || !editName.trim()" @click="saveRename(key.id)">
                Save
              </button>
              <button class="link" :disabled="busy" @click="cancelRename">Cancel</button>
            </template>
            <!-- Default row -->
            <template v-else>
              <span>{{ key.name || 'Passkey' }}</span>
              <span class="muted">{{
                key.createdAt ? new Date(key.createdAt).toLocaleString() : ''
              }}</span>
              <button class="link" :disabled="busy" @click="startRename(key)">Rename</button>
              <button class="link" :disabled="busy" @click="deletePasskey(key.id)">Delete</button>
            </template>
          </li>
        </ul>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
    </template>
  </main>
</template>

<style scoped>
/* Layout only — colours/components come from the global theme (styles.css). */
main {
  max-width: 640px;
  margin: 2rem auto;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

h1 {
  margin: 0;
}

h2 {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
}

.card {
  margin-bottom: 1rem;
}

.card .header {
  margin-bottom: 0.5rem;
}

.hint {
  margin: 0 0 0.5rem;
}

.add-passkey {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.add-passkey input {
  flex: 1;
}

.add-passkey .button {
  flex-shrink: 0;
}

.rename-input {
  flex: 1;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.list li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.list li:last-child {
  border-bottom: none;
}

.list li > span:first-child {
  flex: 1;
}
</style>
