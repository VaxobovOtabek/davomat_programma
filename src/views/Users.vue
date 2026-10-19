<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { api, post, today, initials, money, photoData, toast } from "../api";
import { useSession } from "../session";
import type { User, Branch } from "../../shared/types";
import Icon from "../components/Icon.vue";
import Modal from "../components/Modal.vue";
const s = useSession(),
  users = ref<User[]>([]),
  branches = ref<Branch[]>([]),
  search = ref(""),
  filter = ref("active"),
  error = ref(""),
  loading = ref(true),
  busy = ref(false),
  show = ref(false),
  editing = ref<User | null>(null),
  resetUser = ref<User | null>(null),
  newPassword = ref(""),
  deleting = ref<User | null>(null);
const roles: Record<string, string> = {
  owner: "Tashkilot egasi",
  admin: "Administrator",
  teacher: "Ustoz",
  accountant: "Buxgalter",
};
const blank = () => ({
  first_name: "",
  last_name: "",
  position: "",
  login: "",
  password: "",
  role: "teacher",
  branch_id: s.user?.branch_id || "",
  avatar_id: null as string | null,
  hourly_rate: 60000,
  rate_date: today(),
});
const form = ref(blank());
const filtered = computed(() =>
  users.value.filter(
    (u) =>
      (filter.value === "all" || u.status === filter.value) &&
      (u.first_name + " " + u.last_name + " " + u.login + " " + u.position)
        .toLowerCase()
        .includes(search.value.toLowerCase()),
  ),
);
const canEdit = computed(() => ["owner", "admin"].includes(s.user?.role || ""));
async function load() {
  try {
    [users.value, branches.value] = await Promise.all([
      api("/users"),
      api("/branches"),
    ]);
    error.value = "";
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
function open(u?: User) {
  editing.value = u || null;
  form.value = u
    ? {
        ...blank(),
        first_name: u.first_name,
        last_name: u.last_name,
        position: u.position,
        login: u.login,
        role: u.role,
        branch_id: u.branch_id || "",
        avatar_id: u.avatar_id,
        hourly_rate: Number(u.hourly_rate || 0),
      }
    : blank();
  show.value = true;
  error.value = "";
}
async function upload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  busy.value = true;
  try {
    const m = await post("/media", {
      kind: "avatar",
      data: await photoData(file),
    });
    form.value.avatar_id = m.id;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function save() {
  busy.value = true;
  error.value = "";
  try {
    const body = {
      ...form.value,
      password: editing.value ? undefined : form.value.password,
    };
    if (editing.value)
      await api("/users/" + editing.value.id, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    else await post("/users", body);
    show.value = false;
    await load();
    toast("Foydalanuvchi saqlandi.");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function reset() {
  busy.value = true;
  try {
    await post("/users/" + resetUser.value!.id + "/reset-password", {
      password: newPassword.value,
    });
    resetUser.value = null;
    newPassword.value = "";
    toast("Parol yangilandi. Eski sessiyalar bekor qilindi.");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function remove() {
  busy.value = true;
  try {
    await api("/users/" + deleting.value!.id, { method: "DELETE" });
    deleting.value = null;
    await load();
    toast("Hisob arxivlandi.");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
onMounted(load);
</script>
<template>
  <section class="page-head">
    <div>
      <span class="eyebrow">JAMOA BOSHQARUVI</span>
      <h1>Foydalanuvchilar</h1>
      <p class="muted">Jamoangiz, kirish ma’lumotlari va lavozimlar.</p>
    </div>
    <button v-if="canEdit" class="btn primary" @click="open()">
      <Icon name="plus" />Foydalanuvchi qo‘shish
    </button>
  </section>
  <div v-if="error && !show && !resetUser && !deleting" class="error">
    {{ error }}
  </div>
  <section class="panel">
    <div class="toolbar">
      <div class="input-icon search-box">
        <Icon name="search" /><input
          v-model="search"
          aria-label="Foydalanuvchini qidirish"
          placeholder="Ism, familiya yoki login bo‘yicha qidirish"
        />
      </div>
      <select v-model="filter" aria-label="Holat filtri">
        <option value="active">Faol foydalanuvchilar</option>
        <option value="deleted">Arxivlangan</option>
        <option value="all">Barchasi</option></select
      ><span class="count-pill">{{ filtered.length }} foydalanuvchi</span>
    </div>
    <div v-if="loading" class="empty-state">Yuklanmoqda…</div>
    <div v-else-if="!filtered.length" class="empty-state">
      <Icon name="users" :size="38" />
      <h3>Foydalanuvchi topilmadi</h3>
      <p>Qidiruvni o‘zgartiring yoki yangi foydalanuvchi qo‘shing.</p>
    </div>
    <div v-else class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Foydalanuvchi</th>
            <th>Lavozim</th>
            <th>Login</th>
            <th>Rol</th>
            <th>Stavka / soat</th>
            <th>Holat</th>
            <th v-if="canEdit">Amallar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in filtered" :key="u.id">
            <td>
              <div class="person">
                <img
                  v-if="u.avatar_id"
                  class="avatar"
                  :src="'/api/v1/media/' + u.avatar_id"
                  alt=""
                /><span v-else class="avatar">{{
                  initials(u.first_name, u.last_name)
                }}</span>
                <div>
                  <strong>{{ u.first_name }} {{ u.last_name }}</strong
                  ><small>{{
                    branches.find((b) => b.id === u.branch_id)?.name
                  }}</small>
                </div>
              </div>
            </td>
            <td>{{ u.position }}</td>
            <td>
              <code>{{ u.login }}</code>
            </td>
            <td>{{ roles[u.role] }}</td>
            <td>{{ money(u.hourly_rate) }} <span class="muted">so‘m</span></td>
            <td>
              <span
                class="badge"
                :class="u.status === 'active' ? 'green' : ''"
                >{{ u.status === "active" ? "Faol" : "Arxivlangan" }}</span
              >
            </td>
            <td v-if="canEdit">
              <div v-if="u.status === 'active'" class="row">
                <button
                  class="icon-button"
                  aria-label="Tahrirlash"
                  @click="open(u)"
                >
                  <Icon name="edit" :size="17" /></button
                ><button
                  class="icon-button"
                  aria-label="Parolni yangilash"
                  @click="
                    resetUser = u;
                    error = '';
                  "
                >
                  <Icon name="key" :size="17" /></button
                ><button
                  class="icon-button red"
                  aria-label="O‘chirish"
                  @click="
                    deleting = u;
                    error = '';
                  "
                >
                  <Icon name="trash" :size="17" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
  <Modal
    v-if="show"
    :title="editing ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi'"
    wide
    @close="show = false"
    ><form @submit.prevent="save">
      <div class="modal-body">
        <div class="profile-upload">
          <img
            v-if="form.avatar_id"
            class="avatar large"
            :src="'/api/v1/media/' + form.avatar_id"
            alt="Profil rasmi"
          /><span v-else class="avatar large"
            ><Icon name="users" :size="32" /></span
          ><label class="upload-label"
            ><Icon name="upload" :size="17" />Rasm yuklash<input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              @change="upload"
            /><small>JPEG, PNG, WebP · 2 MBgacha</small></label
          >
        </div>
        <div class="form-grid">
          <label
            >Ism<input
              v-model="form.first_name"
              required
              maxlength="120"
              placeholder="Aziz" /></label
          ><label
            >Familiya<input
              v-model="form.last_name"
              required
              maxlength="120"
              placeholder="Karimov" /></label
          ><label
            >Lavozim<input
              v-model="form.position"
              required
              placeholder="Matematika ustozi" /></label
          ><label
            >Tizim roli<select v-model="form.role">
              <option value="teacher">Ustoz</option>
              <option value="admin">Administrator</option>
              <option value="accountant">Buxgalter</option>
              <option v-if="s.user?.role === 'owner'" value="owner">
                Tashkilot egasi
              </option>
            </select></label
          ><label
            >Login (8 raqam)<input
              v-model="form.login"
              type="text"
              inputmode="numeric"
              pattern="[0-9]{8}"
              maxlength="8"
              autocomplete="off"
              required
              placeholder="00123456" /></label
          ><label v-if="!editing"
            >Parol<input
              v-model="form.password"
              type="password"
              minlength="8"
              maxlength="128"
              autocomplete="new-password"
              required /></label
          ><label
            >Filial<select v-model="form.branch_id" required>
              <option disabled value="">Filial tanlang</option>
              <option v-for="b in branches" :key="b.id" :value="b.id">
                {{ b.name }}
              </option>
            </select></label
          ><label
            >Soatlik stavka (so‘m / 60 daqiqa)<input
              v-model="form.hourly_rate"
              type="number"
              min="0"
              max="100000000"
              required /></label
          ><label
            >Stavka amal qilish sanasi<input
              v-model="form.rate_date"
              type="date"
              required
          /></label>
        </div>
        <div class="info-strip">
          <Icon name="calendar" :size="18" /><span
            >Dars kunlari va soatlarini saqlagandan keyin “Dars jadvali”
            bo‘limida belgilang.</span
          >
        </div>
        <div v-if="error" class="error" role="alert">{{ error }}</div>
      </div>
      <footer class="modal-actions">
        <button type="button" class="btn secondary" @click="show = false">
          Bekor qilish</button
        ><button class="btn primary" :disabled="busy">
          {{ busy ? "Saqlanmoqda…" : "Saqlash" }}
        </button>
      </footer>
    </form></Modal
  ><Modal v-if="resetUser" title="Parolni yangilash" @close="resetUser = null"
    ><form @submit.prevent="reset">
      <div class="modal-body">
        <p>
          {{ resetUser.first_name }} {{ resetUser.last_name }} uchun yangi
          parol. Eski sessiyalar bekor qilinadi.
        </p>
        <label
          >Yangi parol<input
            v-model="newPassword"
            type="password"
            minlength="8"
            maxlength="128"
            required
            autocomplete="new-password"
        /></label>
        <div v-if="error" class="error">{{ error }}</div>
      </div>
      <footer class="modal-actions">
        <button class="btn primary" :disabled="busy">Parolni yangilash</button>
      </footer>
    </form></Modal
  ><Modal v-if="deleting" title="Hisobni o‘chirish" @close="deleting = null"
    ><div class="modal-body">
      <p>
        <strong>{{ deleting.first_name }} {{ deleting.last_name }}</strong>
        tizimga kira olmaydi. Oldingi davomat va oylik hisoblari saqlanadi.
      </p>
      <div v-if="error" class="error">{{ error }}</div>
    </div>
    <footer class="modal-actions">
      <button class="btn secondary" @click="deleting = null">
        Bekor qilish</button
      ><button class="btn danger" :disabled="busy" @click="remove">
        O‘chirish
      </button>
    </footer></Modal
  >
</template>
