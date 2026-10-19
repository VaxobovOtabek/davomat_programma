<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api, post, toast, initials } from "../api";
import { useSession } from "../session";
import { locate } from "../device";
import Icon from "../components/Icon.vue";
const s = useSession(),
  branches = ref<any[]>([]),
  audit = ref<any[]>([]),
  error = ref(""),
  busy = ref(false),
  currentPassword = ref(""),
  newPassword = ref("");
const branch = ref({
  id: undefined as string | undefined,
  name: "",
  latitude: 41.3111,
  longitude: 69.2797,
  radius_m: 150,
  max_accuracy_m: 50,
});
async function load() {
  if (s.user?.must_change_password) return;
  try {
    branches.value = await api("/branches");
    if (["owner", "admin"].includes(s.user?.role || ""))
      audit.value = await api("/audit");
    if (branches.value[0]) branch.value = { ...branches.value[0] };
  } catch (e) {
    error.value = (e as Error).message;
  }
}
async function change() {
  busy.value = true;
  try {
    await post("/auth/change-password", {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });
    await s.refresh();
    currentPassword.value = "";
    newPassword.value = "";
    await load();
    toast("Parol yangilandi.");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function saveBranch() {
  busy.value = true;
  try {
    await post("/branches", branch.value);
    await load();
    toast("Filial sozlamalari saqlandi.");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function useLocation() {
  try {
    const l = await locate();
    branch.value.latitude = l.latitude;
    branch.value.longitude = l.longitude;
    toast("Joriy koordinatalar olindi. Saqlashni bosing.");
  } catch (e) {
    error.value = (e as Error).message;
  }
}
onMounted(load);
</script>
<template>
  <section class="page-head">
    <div>
      <span class="eyebrow">HISOB VA XAVFSIZLIK</span>
      <h1>Sozlamalar</h1>
      <p class="muted">Shaxsiy hisob, filial lokatsiyasi va amallar tarixi.</p>
    </div>
  </section>
  <div v-if="s.user?.must_change_password" class="warning-strip">
    <Icon name="key" />Davom etishdan oldin administrator bergan vaqtinchalik
    parolni almashtiring.
  </div>
  <div v-if="error" class="error">{{ error }}</div>
  <div class="settings-grid">
    <section class="panel">
      <header class="panel-head"><h2>Shaxsiy hisob</h2></header>
      <div class="panel-body">
        <div class="person mb">
          <span class="avatar large">{{
            initials(s.user!.first_name, s.user!.last_name)
          }}</span>
          <div>
            <h3>{{ s.user?.first_name }} {{ s.user?.last_name }}</h3>
            <p>{{ s.user?.position }}</p>
            <code>{{ s.user?.login }}</code>
          </div>
        </div>
        <form @submit.prevent="change">
          <label
            >Joriy parol<input
              v-model="currentPassword"
              type="password"
              autocomplete="current-password"
              required /></label
          ><label
            >Yangi parol<input
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
              minlength="8"
              maxlength="128"
              required /></label
          ><button class="btn primary" :disabled="busy">
            <Icon name="key" :size="17" />Parolni yangilash
          </button>
        </form>
      </div>
    </section>
    <section
      v-if="s.user?.role === 'owner' && !s.user.must_change_password"
      class="panel"
    >
      <header class="panel-head">
        <h2>Filial lokatsiyasi</h2>
        <button
          class="btn secondary small-btn"
          @click="
            branch = {
              id: undefined,
              name: '',
              latitude: 41.3111,
              longitude: 69.2797,
              radius_m: 150,
              max_accuracy_m: 50,
            }
          "
        >
          <Icon name="plus" :size="16" />Yangi filial
        </button>
      </header>
      <form class="panel-body" @submit.prevent="saveBranch">
        <label
          >Filialni tanlash<select
            @change="
              branch = {
                ...branches.find(
                  (b) => b.id === ($event.target as HTMLSelectElement).value,
                ),
              }
            "
          >
            <option v-for="b in branches" :key="b.id" :value="b.id">
              {{ b.name }}
            </option>
          </select></label
        ><label>Filial nomi<input v-model="branch.name" required /></label>
        <div class="form-grid">
          <label
            >Kenglik<input
              v-model.number="branch.latitude"
              type="number"
              step="any"
              min="-90"
              max="90"
              required /></label
          ><label
            >Uzunlik<input
              v-model.number="branch.longitude"
              type="number"
              step="any"
              min="-180"
              max="180"
              required /></label
          ><label
            >Radius (metr)<input
              v-model.number="branch.radius_m"
              type="number"
              min="20"
              max="1000"
              required /></label
          ><label
            >Maks. aniqlik xatosi (metr)<input
              v-model.number="branch.max_accuracy_m"
              type="number"
              min="5"
              max="200"
              required
          /></label>
        </div>
        <div class="row">
          <button type="button" class="btn secondary" @click="useLocation">
            <Icon name="pin" :size="17" />Joriy joylashuv</button
          ><button class="btn primary" :disabled="busy">Saqlash</button>
        </div>
        <p class="muted tiny">
          Lokatsiya filial yaqinligini baholaydi. Xona dars jadvalidan olinadi.
        </p>
      </form>
    </section>
  </div>
  <section v-if="audit.length" class="panel mt">
    <header class="panel-head">
      <h2>Amallar jurnali</h2>
      <span class="muted">Oxirgi 200 ta amal</span>
    </header>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Kim</th>
            <th>Amal</th>
            <th>Vaqt</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in audit" :key="a.id">
            <td>{{ a.first_name }} {{ a.last_name }}</td>
            <td>
              <code>{{ a.action }}</code>
            </td>
            <td>
              {{
                new Date(a.created_at).toLocaleString("uz-UZ", {
                  timeZone: "Asia/Tashkent",
                })
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
