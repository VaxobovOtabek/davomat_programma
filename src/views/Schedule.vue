<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import {
  api,
  post,
  today,
  dayRange,
  dateLabel,
  timeLabel,
  toast,
} from "../api";
import { useSession } from "../session";
import type { Lesson, User, Branch } from "../../shared/types";
import Icon from "../components/Icon.vue";
import Modal from "../components/Modal.vue";
const s = useSession(),
  date = ref(today()),
  lessons = ref<Lesson[]>([]),
  users = ref<User[]>([]),
  branches = ref<Branch[]>([]),
  attendances = ref<any[]>([]),
  show = ref(false),
  editingId = ref(""),
  error = ref(""),
  busy = ref(false),
  cancel = ref<Lesson | null>(null);
const canEdit = computed(() => ["owner", "admin"].includes(s.user?.role || ""));
const form = ref({
  teacher_id: "",
  branch_id: s.user?.branch_id || "",
  subject: "",
  group_name: "",
  room: "",
  date: today(),
  start: "09:00",
  end: "09:45",
  repeat_weeks: 1,
});
async function load() {
  try {
    const r = dayRange(date.value);
    const [lData, bData, aData] = await Promise.all([
      api("/lessons?" + new URLSearchParams(r)),
      api("/branches"),
      api("/attendance"),
    ]);
    lessons.value = lData;
    branches.value = bData;
    attendances.value = aData;
    if (canEdit.value)
      users.value = (await api<User[]>("/users")).filter(
        (u) => u.role === "teacher" && u.status === "active",
      );
    error.value = "";
  } catch (e) {
    error.value = (e as Error).message;
  }
}
async function markLessonCompleted(l: Lesson) {
  if (!window.confirm(`"${l.subject}" darsi o‘tildi deb davomat kiritilsinmi?`)) return;
  busy.value = true;
  try {
    await post("/attendance/mark-completed", { lesson_id: l.id });
    await load();
    toast("Dars o‘tildi deb davomatga kiritildi.");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function save() {
  busy.value = true;
  try {
    const body = {
      ...form.value,
      starts_at: new Date(
        form.value.date + "T" + form.value.start + ":00+05:00",
      ).toISOString(),
      ends_at: new Date(
        form.value.date + "T" + form.value.end + ":00+05:00",
      ).toISOString(),
    };
    if (editingId.value)
      await api("/lessons/" + editingId.value, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    else await post("/lessons", body);
    date.value = form.value.date;
    show.value = false;
    await load();
    toast("Dars jadvali saqlandi.");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
function editLesson(l: Lesson) {
  const local = (v: string) =>
    new Date(Date.parse(v) + 5 * 3600000).toISOString();
  form.value = {
    teacher_id: l.teacher_id,
    branch_id: l.branch_id,
    subject: l.subject,
    group_name: l.group_name,
    room: l.room,
    date: local(l.starts_at).slice(0, 10),
    start: local(l.starts_at).slice(11, 16),
    end: local(l.ends_at).slice(11, 16),
    repeat_weeks: 1,
  };
  editingId.value = l.id;
  error.value = "";
  show.value = true;
}
async function remove() {
  try {
    await api("/lessons/" + cancel.value!.id, { method: "DELETE" });
    cancel.value = null;
    await load();
    toast("Dars bekor qilindi.");
  } catch (e) {
    error.value = (e as Error).message;
  }
}
onMounted(load);
</script>
<template>
  <section class="page-head">
    <div>
      <span class="eyebrow">REJA VA TARTIB</span>
      <h1>Dars jadvali</h1>
      <p class="muted">Dars vaqtlari, ustozlar va xonalarni rejalashtiring.</p>
    </div>
    <button
      v-if="canEdit"
      class="btn primary"
      @click="
        show = true;
        editingId = '';
        error = '';
        form.date = date;
      "
    >
      <Icon name="plus" />Dars qo‘shish
    </button>
  </section>
  <div v-if="error && !show && !cancel" class="error">{{ error }}</div>
  <section class="panel">
    <header class="toolbar">
      <div class="row">
        <Icon name="calendar" /><input
          v-model="date"
          type="date"
          aria-label="Jadval sanasi"
          @change="load"
        />
      </div>
      <span class="count-pill">{{ lessons.length }} ta dars</span
      ><span class="muted">Toshkent vaqti · UTC+5</span>
    </header>
    <div v-if="!lessons.length" class="empty-state">
      <Icon name="calendar" :size="38" />
      <h3>Bu sana uchun jadval bo‘sh</h3>
      <p>Dars qo‘shilgach ustoz kabinetida avtomatik ko‘rinadi.</p>
    </div>
    <div v-else class="schedule-list">
      <article v-for="l in lessons" :key="l.id" class="schedule-item">
        <div class="schedule-time">
          <strong>{{ timeLabel(l.starts_at) }}</strong
          ><span>{{ timeLabel(l.ends_at) }}</span>
        </div>
        <div class="schedule-divider"></div>
        <div class="schedule-info">
          <span class="eyebrow">{{ l.group_name }}</span>
          <h3>{{ l.subject }}</h3>
          <span>{{ l.first_name }} {{ l.last_name }}</span>
        </div>
        <span class="room-chip"
          ><Icon name="building" :size="16" />{{ l.room }}-xona</span
        ><span class="badge" :class="l.status === 'scheduled' ? 'green' : ''">{{
          l.status === "scheduled" ? "Rejada" : "Bekor qilingan"
        }}</span
        ><span
          v-if="attendances.some((a) => a.lesson_id === l.id)"
          class="badge green"
          title="Ushbu dars uchun davomat mavjud"
          ><Icon name="check" :size="14" />Davomat bor</span
        ><button
          v-else-if="canEdit && l.status === 'scheduled'"
          class="btn secondary small-btn"
          title="Dars o‘tildi deb davomat kiritish"
          :disabled="busy"
          @click="markLessonCompleted(l)"
        >
          <Icon name="check" :size="14" />O‘tildi</button
        ><button
          v-if="canEdit && l.status === 'scheduled'"
          class="icon-button"
          aria-label="Darsni tahrirlash"
          @click="editLesson(l)"
        >
          <Icon name="edit" :size="18" /></button
        ><button
          v-if="canEdit && l.status === 'scheduled'"
          class="icon-button red"
          aria-label="Darsni bekor qilish"
          @click="
            cancel = l;
            error = '';
          "
        >
          <Icon name="trash" :size="18" />
        </button>
      </article>
    </div>
  </section>
  <Modal
    v-if="show"
    :title="editingId ? 'Darsni tahrirlash' : 'Yangi dars rejalashtirish'"
    wide
    @close="show = false"
    ><form @submit.prevent="save">
      <div class="modal-body">
        <div class="form-grid">
          <label
            >Filial<select v-model="form.branch_id" required>
              <option v-for="b in branches" :value="b.id" :key="b.id">
                {{ b.name }}
              </option>
            </select></label
          ><label
            >Ustoz<select v-model="form.teacher_id" required>
              <option disabled value="">Ustoz tanlang</option>
              <option
                v-for="u in users.filter((u) => u.branch_id === form.branch_id)"
                :key="u.id"
                :value="u.id"
              >
                {{ u.first_name }} {{ u.last_name }}
              </option>
            </select></label
          ><label
            >Fan<input
              v-model="form.subject"
              placeholder="Matematika"
              required /></label
          ><label
            >Sinf / guruh<input
              v-model="form.group_name"
              placeholder="9-A"
              required /></label
          ><label
            >Xona<input v-model="form.room" placeholder="204" required /></label
          ><label>Sana<input v-model="form.date" type="date" required /></label
          ><label
            >Boshlanish<input
              v-model="form.start"
              type="time"
              required /></label
          ><label>Tugash<input v-model="form.end" type="time" required /></label
          ><label
            >Haftalik takrorlanish<select v-model="form.repeat_weeks">
              <option :value="1">Faqat shu dars</option>
              <option :value="4">4 hafta</option>
              <option :value="8">8 hafta</option>
              <option :value="16">16 hafta</option>
            </select></label
          >
        </div>
        <div v-if="!users.length" class="warning-strip">
          Avval foydalanuvchilar bo‘limida ustoz yarating.
        </div>
        <div v-if="error" class="error">{{ error }}</div>
        <p class="muted tiny">
          Bir ustoz yoki xona bir vaqtda ikkita darsga biriktirilmaydi.
        </p>
      </div>
      <footer class="modal-actions">
        <button type="button" class="btn secondary" @click="show = false">
          Bekor qilish</button
        ><button class="btn primary" :disabled="busy">
          {{ busy ? "Saqlanmoqda…" : "Jadvalga qo‘shish" }}
        </button>
      </footer>
    </form></Modal
  ><Modal v-if="cancel" title="Darsni bekor qilish" @close="cancel = null"
    ><div class="modal-body">
      <p>
        {{ cancel.subject }} · {{ dateLabel(cancel.starts_at) }} ·
        {{ timeLabel(cancel.starts_at) }} darsini bekor qilasizmi?
      </p>
      <div v-if="error" class="error">{{ error }}</div>
    </div>
    <footer class="modal-actions">
      <button class="btn secondary" @click="cancel = null">Ortga</button
      ><button class="btn danger" @click="remove">Darsni bekor qilish</button>
    </footer></Modal
  >
</template>
