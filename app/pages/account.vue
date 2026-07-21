<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/composables'
import { authClient } from '../lib/auth-client'
import { useAuth } from '../lib/use-auth'
import { SOCIAL, type SocialProvider } from '../lib/social-providers'
import { errorMessage } from '../lib/errors'
import { useSeoMeta } from '@unhead/vue'

const router = useRouter()
const { session, refresh } = useAuth()
const toast = useToast()

useSeoMeta({
  title: 'Account',
  robots: 'noindex, nofollow', // private page
})

definePage({
  // private page: TTFB beats first-paint, skip critical CSS inlining
  meta: { criticalCss: false },
})

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
const busy = ref(false)

// Name typed in the "add passkey" field, and inline-rename state.
const newPasskeyName = ref('')
const editingId = ref<string | null>(null)
const editName = ref('')

// Whether passkeys can be REGISTERED on this host (see server resolvePasskeyRp):
// on preview aliases the RP ID won't match, so the ceremony always fails. When
// off, the add form is swapped for a note — listing/deleting still work, as
// those aren't WebAuthn ceremonies.
const passkeysEnabled = ref(true)
const passkeyHost = ref('')

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
  await refresh()
  if (!session.value) {
    router.replace('/login')
    return
  }
  await Promise.all([reloadLists(), loadPasskeySupport()])
  ready.value = true
}

// Whether this host can register passkeys, and where they do work — fetched once
// (the answer is host-scoped, not user- or state-dependent).
async function loadPasskeySupport() {
  try {
    const data = await (await fetch('/api/auth-providers')).json()
    passkeysEnabled.value = data.passkeys ?? true
    passkeyHost.value = data.passkeyHost ?? ''
  } catch {
    // best-effort; leave the add form enabled
  }
}

onMounted(load)

// Wrap a mutating action: toggle `busy`, refresh the lists, and surface any
// failure as a toast. `fn` should throw (or return a `{ error }`) on failure.
async function run(fn: () => Promise<unknown>, fallback: string) {
  busy.value = true
  try {
    const res = (await fn()) as { error?: { message?: string | null } | null } | void
    if (res?.error) throw new Error(res.error.message ?? undefined)
    await reloadLists()
  } catch (e) {
    toast.add({ title: fallback, description: errorMessage(e, fallback), color: 'error' })
  } finally {
    busy.value = false
  }
}

async function link(provider: SocialProvider) {
  // Redirects into the OAuth flow; auto-links to this account on return because
  // the email matches (account linking is enabled server-side). No reload needed.
  return authClient.linkSocial({ provider, callbackURL: '/account' }).then(({ error: e }) => {
    if (e) {
      toast.add({
        title: `Could not link ${provider}`,
        color: 'error',
        ...(e.message ? { description: e.message } : {}),
      })
    }
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
  <div class="mx-auto max-w-2xl space-y-6">
    <div v-if="!ready" class="space-y-4">
      <USkeleton class="h-8 w-40" />
      <USkeleton class="h-32 w-full" />
    </div>

    <template v-else-if="session">
      <UPageHeader title="Account">
        <template #links>
          <UButton
            label="Sign out"
            icon="i-lucide-log-out"
            color="neutral"
            variant="subtle"
            :disabled="busy"
            @click="logout"
          />
        </template>
      </UPageHeader>

      <UCard>
        <template #header>
          <h2 class="font-semibold text-highlighted">Profile</h2>
        </template>
        <dl class="space-y-2 text-sm">
          <div class="flex gap-2">
            <dt class="w-32 text-muted">Name</dt>
            <dd>{{ session.user.name }}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="w-32 text-muted">Email</dt>
            <dd>{{ session.user.email }}</dd>
          </div>
          <div class="flex items-center gap-2">
            <dt class="w-32 text-muted">Email verified</dt>
            <dd>
              <UBadge
                :color="session.user.emailVerified ? 'success' : 'neutral'"
                variant="subtle"
                :label="session.user.emailVerified ? 'Verified' : 'Not verified'"
              />
            </dd>
          </div>
        </dl>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold text-highlighted">Connected providers</h2>
        </template>
        <p class="mb-3 text-sm text-muted">
          Sign in with any provider sharing this email and it links here automatically.
        </p>
        <ul class="divide-y divide-default">
          <li v-for="p in SOCIAL" :key="p.id" class="flex items-center gap-3 py-2.5">
            <UIcon :name="p.icon" class="size-5 shrink-0" />
            <span class="flex-1">{{ p.label }}</span>
            <template v-if="linkedByProvider.get(p.id)">
              <UBadge color="success" variant="subtle" label="Linked" />
              <UButton
                label="Unlink"
                color="error"
                variant="ghost"
                size="sm"
                :disabled="busy"
                @click="unlink(p.id, linkedByProvider.get(p.id)!.accountId)"
              />
            </template>
            <UButton
              v-else
              label="Connect"
              color="neutral"
              variant="subtle"
              size="sm"
              :disabled="busy"
              @click="link(p.id)"
            />
          </li>
        </ul>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold text-highlighted">Passkeys</h2>
        </template>

        <form v-if="passkeysEnabled" class="mb-4 flex gap-2" @submit.prevent="addPasskey">
          <UInput
            v-model="newPasskeyName"
            placeholder="Passkey name (e.g. MacBook Touch ID)"
            class="flex-1"
            :disabled="busy"
          />
          <UButton type="submit" label="Add passkey" icon="i-lucide-key-round" :disabled="busy" />
        </form>
        <UAlert
          v-else
          class="mb-4"
          color="neutral"
          variant="subtle"
          icon="i-lucide-info"
          title="Passkeys can't be added on this domain"
          :description="`Passkeys register only on ${passkeyHost || 'the production domain'}. Open the app there to add one; existing passkeys still work.`"
        />

        <p v-if="!passkeys.length" class="text-sm text-muted">No passkeys yet.</p>
        <ul v-else class="divide-y divide-default">
          <li v-for="key in passkeys" :key="key.id" class="flex items-center gap-3 py-2.5">
            <template v-if="editingId === key.id">
              <UInput
                v-model="editName"
                class="flex-1"
                :disabled="busy"
                autofocus
                @keyup.enter="saveRename(key.id)"
                @keyup.esc="cancelRename"
              />
              <UButton
                label="Save"
                size="sm"
                :disabled="busy || !editName.trim()"
                @click="saveRename(key.id)"
              />
              <UButton
                label="Cancel"
                color="neutral"
                variant="ghost"
                size="sm"
                :disabled="busy"
                @click="cancelRename"
              />
            </template>
            <template v-else>
              <span class="flex-1">{{ key.name || 'Passkey' }}</span>
              <span class="text-sm text-muted">
                {{ key.createdAt ? new Date(key.createdAt).toLocaleString() : '' }}
              </span>
              <UButton
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="sm"
                aria-label="Rename passkey"
                :disabled="busy"
                @click="startRename(key)"
              />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="sm"
                aria-label="Delete passkey"
                :disabled="busy"
                @click="deletePasskey(key.id)"
              />
            </template>
          </li>
        </ul>
      </UCard>
    </template>
  </div>
</template>
