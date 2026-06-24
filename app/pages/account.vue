<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { authClient } from '../lib/auth-client'
import { useAuth } from '../lib/use-auth'
import { SOCIAL, type SocialProvider } from '../lib/social-providers'
import { errorMessage } from '../lib/errors'

// TODO: use pinia colada mutations to handle the auth state maybe?

const router = useRouter()
const { session, refresh } = useAuth()

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

// O(1) lookup of the linked account for a provider (drives both the "linked"
// badge and the unlink button), so the template doesn't scan `linked` twice.
const linkedByProvider = computed(() => new Map(linked.value.map((a) => [a.providerId, a])))

// Refetch just the linked accounts + passkeys (no session round-trip).
async function reloadLists() {
  const [accounts, keys] = await Promise.all([
    authClient.listAccounts(),
    authClient.passkey.listUserPasskeys(),
  ])
  linked.value = accounts.data ?? []
  passkeys.value = keys.data ?? []
}

async function load() {
  error.value = null
  await refresh()
  if (!session.value) {
    router.replace('/login')
    return
  }
  await reloadLists()
  ready.value = true
}

onMounted(load)

// Wrap a mutating action: clear errors, toggle `busy`, refresh the lists, and
// surface any failure. `fn` should throw (or return a `{ error }`) on failure.
async function run(fn: () => Promise<unknown>, fallback: string) {
  error.value = null
  busy.value = true
  try {
    const res = (await fn()) as { error?: { message?: string | null } | null } | void
    if (res?.error) throw new Error(res.error.message ?? undefined)
    await reloadLists()
  } catch (e) {
    error.value = errorMessage(e, fallback)
  } finally {
    busy.value = false
  }
}

async function link(provider: SocialProvider) {
  error.value = null
  // Redirects into the OAuth flow; auto-links to this account on return because
  // the email matches (account linking is enabled server-side). No reload needed.
  return authClient.linkSocial({ provider, callbackURL: '/account' }).then(({ error: e }) => {
    if (e) error.value = e.message ?? `Could not link ${provider}`
  })
}

function unlink(providerId: string, accountId: string) {
  return run(() => authClient.unlinkAccount({ providerId, accountId }), 'Could not unlink')
}

function addPasskey() {
  return run(async () => {
    // Use the typed name, falling back to a sensible default if left blank.
    const name = newPasskeyName.value.trim() || `Passkey ${passkeys.value.length + 1}`
    const res = await authClient.passkey.addPasskey({ name })
    newPasskeyName.value = ''
    return res
  }, 'Could not register passkey')
}

function startRename(key: Passkey) {
  editingId.value = key.id
  editName.value = key.name ?? ''
}

function cancelRename() {
  editingId.value = null
  editName.value = ''
}

function saveRename(id: string) {
  const name = editName.value.trim()
  if (!name) return
  return run(async () => {
    const res = await authClient.passkey.updatePasskey({ id, name })
    cancelRename()
    return res
  }, 'Could not rename passkey')
}

function deletePasskey(id: string) {
  return run(() => authClient.passkey.deletePasskey({ id }), 'Could not delete passkey')
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
            <template v-if="linkedByProvider.get(p.id)">
              <span class="tag">linked</span>
              <button
                class="link"
                :disabled="busy"
                @click="unlink(p.id, linkedByProvider.get(p.id)!.accountId)"
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
