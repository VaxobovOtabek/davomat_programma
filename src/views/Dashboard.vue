<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { get, set } from "idb-keyval";
import { useSession } from "../session";
import {
  api,
  post,
  dateLabel,
  timeLabel,
  today,
  dayRange,
  initials,
  toast,
} from "../api";
import type { Lesson, Attendance, User } from "../../shared/types";
import Icon from "../components/Icon.vue";
import EvidenceCapture from "../components/EvidenceCapture.vue";
const s = useSession(),
  lessons = ref<Lesson[]>([]),
  attendances = ref<Attendance[]>([]),
  users = ref<User[]>([]),
  loading = ref(true),
  error = ref(""),
  updated = ref(""),
  now = ref(Date.now()),
  capture = ref<{
    lessonId?: string;
    attendanceId?: string;
    title: string;
  } | null>(null),
  drafts = ref<any[]>([]);
let timer: ReturnType<typeof setInterval>,
  clock: ReturnType<typeof setInterval>;
const teacher = computed(() => s.user?.role === "teacher");
async function load() {
  if (document.hidden) return;
  try {
    const range = dayRange(today());
    const results = await Promise.all([
      api<Lesson[]>("/lessons?" + new URLSearchParams(range)),
      api<Attendance[]>("/attendance"),
      teacher.value ? Promise.resolve([]) : api<User[]>("/users"),
    ]);
    [lessons.value, attendances.value, users.value] = results;
    drafts.value = ((await get<any[]>("davomat-drafts")) || []).filter(
      (d) => d.userId === s.user?.id,
    );
    updated.value = new Date().toLocaleTimeString("uz-UZ");
    error.value = "";
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
onMounted(() => {
  load();
  timer = setInterval(load, 5000);
  clock = setInterval(() => (now.value = Date.now()), 1000);
});
onUnmounted(() => {
  clearInterval(timer);
  clearInterval(clock);
});
const active = computed(() =>
  attendances.value.filter((a) => ["active", "paused"].includes(a.state)),
);
const mine = computed(() =>
  active.value.find((a) => a.teacher_id === s.user?.id),
);
const late = computed(
  () =>
    attendances.value.filter(
      (a) =>
        a.started_at.slice(0, 10) === today() &&
        Date.parse(a.started_at) > Date.parse(a.planned_start) + 300000,
    ).length,
);
const completed = computed(
  () =>
    attendances.value.filter(
      (a) => a.state === "completed" && a.started_at.slice(0, 10) === today(),
    ).length,
);
const pending = computed(
  () =>
    attendances.value.filter(
      (a) => a.approval === "pending" && a.state === "completed",
    ).length,
);
function elapsed(a: Attendance) {
  const sec = Math.max(
    0,
    Math.floor((now.value - Date.parse(a.started_at)) / 1000),
  );
  return [Math.floor(sec / 3600), Math.floor((sec % 3600) / 60), sec % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
function status(l: Lesson) {
  const a = attendances.value.find((a) => a.lesson_id === l.id);
  return l.status === "cancelled"
    ? "Bekor qilingan"
    : a?.state === "completed"
      ? "Yakunlangan"
      : a?.state === "paused"
        ? "Tanaffusda"
        : a
          ? "Darsda"
          : Date.parse(l.starts_at) < now.value
            ? "Boshlanmagan"
            : "Kutilmoqda";
}
async function action(a: Attendance) {
  try {
    await post(
      "/attendance/" + a.id + "/" + (a.state === "paused" ? "resume" : "pause"),
      {},
      crypto.randomUUID(),
    );
    await load();
  } catch (e) {
    toast((e as Error).message);
  }
}
async function sync(d: any) {
  try {
    const c = await post("/evidence/challenge"),
      m = await post("/media", { kind: "selfie", data: d.photo });
    await post(
      d.attendanceId
        ? "/attendance/" + d.attendanceId + "/finish"
        : "/attendance/start",
      {
        lesson_id: d.lessonId,
        challenge_id: c.id,
        media_id: m.id,
        location: d.location,
        offline: true,
      },
      d.key,
    );
    await set(
      "davomat-drafts",
      ((await get<any[]>("davomat-drafts")) || []).filter(
        (x) => x.key !== d.key,
      ),
    );
    await load();
    toast("Yuborildi. Admin tekshiruvi kutilmoqda.");
  } catch (e) {
    toast((e as Error).message);
  }
}
</script>
<template>
  <section class="page-head">
    <div>
      <span class="eyebrow">{{
        teacher ? "USTOZ KABINETI" : "BUGUNGI HOLAT"
      }}</span>
      <h1>
        {{
          teacher ? "Salom, " + s.user?.first_name + "!" : "Davomat monitoringi"
        }}
        <span class="wave" v-if="teacher">✦</span>
      </h1>
      <p class="muted">
        {{
          teacher
            ? "Yangi kun, yangi bilimlar. Bugungi darslaringiz shu yerda."
            : "Ustozlar faoliyati va darslar holatini bir joyda kuzating."
        }}
      </p>
    </div>
    <div class="date-pill">
      <Icon name="calendar" :size="18" />{{
        dateLabel(new Date().toISOString())
      }}
    </div>
  </section>
  <div v-if="error" class="error" role="alert">
    {{ error }} <button @click="load">Qayta urinish</button>
  </div>
  <div v-for="d in drafts" :key="d.key" class="warning-strip">
    <Icon name="offline" /><span>{{ d.title }} — yuborilmagan draft</span
    ><button class="btn secondary" @click="sync(d)">Qayta yuborish</button>
  </div>
  <div v-if="loading" class="empty-state">Ma’lumotlar yuklanmoqda…</div>
  <template v-else
    ><div class="stats-grid">
      <article class="stat-card">
        <div class="stat-top">
          <span>{{ teacher ? "Bugungi darslar" : "Jami ustozlar" }}</span
          ><span class="stat-icon teal"
            ><Icon :name="teacher ? 'calendar' : 'users'"
          /></span>
        </div>
        <strong>{{
          teacher
            ? lessons.length
            : users.filter((u) => u.role === "teacher" && u.status === "active")
                .length
        }}</strong
        ><small>{{
          teacher ? "Jadval bo‘yicha" : "Faol foydalanuvchilar"
        }}</small>
      </article>
      <article class="stat-card">
        <div class="stat-top">
          <span>Dars davom etmoqda</span
          ><span class="stat-icon blue"><Icon name="school" /></span>
        </div>
        <strong>{{ active.length }}<span class="stat-unit"> ta</span></strong
        ><small><i class="status-dot"></i> Hozir faol</small>
      </article>
      <article class="stat-card">
        <div class="stat-top">
          <span>{{ teacher ? "Yakunlangan" : "Kech boshlangan" }}</span
          ><span class="stat-icon amber"
            ><Icon :name="teacher ? 'checks' : 'clock'"
          /></span>
        </div>
        <strong
          >{{ teacher ? completed : late
          }}<span class="stat-unit"> ta</span></strong
        ><small>{{
          teacher
            ? "Bugungi yakunlangan darslar"
            : "5 daqiqadan ortiq kechikish"
        }}</small>
      </article>
      <article class="stat-card">
        <div class="stat-top">
          <span>Tekshiruv kutilmoqda</span
          ><span class="stat-icon violet"><Icon name="shield" /></span>
        </div>
        <strong>{{ pending }}<span class="stat-unit"> ta</span></strong
        ><small>Yakunlangan, tasdiqlanmagan</small>
      </article>
    </div>
    <div v-if="mine" class="active-lesson">
      <div>
        <span class="live-label"
          ><i></i>
          {{
            mine.state === "paused" ? "TANAFFUS" : "DARS DAVOM ETMOQDA"
          }}</span
        >
        <h2>{{ mine.subject }} · {{ mine.group_name }}</h2>
        <p>
          {{ mine.room }}-xona · Boshlangan: {{ timeLabel(mine.started_at) }}
        </p>
      </div>
      <strong class="timer">{{ elapsed(mine) }}</strong>
      <div class="row">
        <button class="btn secondary" @click="action(mine)">
          <Icon :name="mine.state === 'paused' ? 'play' : 'pause'" />{{
            mine.state === "paused" ? "Davom ettirish" : "Tanaffus"
          }}</button
        ><button
          class="btn danger"
          @click="
            capture = {
              attendanceId: mine.id,
              title: mine.subject + ' · ' + mine.group_name,
            }
          "
        >
          <Icon name="stop" />Yakunlash
        </button>
      </div>
    </div>
    <div class="dashboard-grid">
      <section class="panel">
        <header class="panel-head">
          <div>
            <h2>{{ teacher ? "Bugungi darslarim" : "Bugungi darslar" }}</h2>
            <p>{{ lessons.length }} ta rejalashtirilgan dars</p>
          </div>
          <RouterLink to="/schedule" class="text-link"
            >Jadvalni ko‘rish <Icon name="right" :size="16"
          /></RouterLink>
        </header>
        <div v-if="!lessons.length" class="empty-state">
          <span class="empty-icon"><Icon name="calendar" :size="32" /></span>
          <h3>Bugun uchun darslar yo‘q</h3>
          <p>
            {{
              teacher
                ? "Admin jadval belgilagach, darslaringiz shu yerda chiqadi."
                : "Dars jadvalini tuzing va ustozlarni biriktiring."
            }}
          </p>
          <RouterLink
            v-if="!teacher && s.user?.role !== 'accountant'"
            to="/schedule"
            class="btn primary"
            ><Icon name="plus" />Dars qo‘shish</RouterLink
          >
        </div>
        <div v-else class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{{ teacher ? "Fan / guruh" : "Ustoz / fan" }}</th>
                <th>Xona</th>
                <th>Vaqt</th>
                <th>Holat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in lessons" :key="l.id">
                <td>
                  <div class="person">
                    <span class="avatar">{{
                      initials(l.first_name || l.subject, l.last_name || "")
                    }}</span>
                    <div>
                      <strong>{{
                        teacher ? l.subject : l.first_name + " " + l.last_name
                      }}</strong
                      ><small>{{
                        teacher
                          ? l.group_name
                          : l.subject + " · " + l.group_name
                      }}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="room-chip">{{ l.room }}</span>
                </td>
                <td class="nowrap">
                  {{ timeLabel(l.starts_at) }} – {{ timeLabel(l.ends_at) }}
                </td>
                <td>
                  <span
                    class="badge"
                    :class="
                      status(l) === 'Darsda'
                        ? 'green'
                        : status(l) === 'Boshlanmagan'
                          ? 'amber'
                          : ''
                    "
                    >{{ status(l) }}</span
                  >
                </td>
                <td>
                  <button
                    v-if="
                      teacher &&
                      !attendances.some((a) => a.lesson_id === l.id) &&
                      l.status === 'scheduled'
                    "
                    class="btn primary small-btn"
                    :disabled="!!mine"
                    @click="
                      capture = {
                        lessonId: l.id,
                        title:
                          l.subject +
                          ' · ' +
                          l.group_name +
                          ' · ' +
                          l.room +
                          '-xona',
                      }
                    "
                  >
                    <Icon name="play" :size="16" />Boshlash
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer class="panel-foot">
          <span
            ><i class="status-dot"></i> Oxirgi yangilanish: {{ updated }}</span
          ><button class="icon-button" aria-label="Yangilash" @click="load">
            <Icon name="refresh" :size="16" />
          </button>
        </footer>
      </section>
      <aside class="side-panels">
        <article class="insight-card">
          <span class="insight-icon"
            ><Icon name="calendarcheck" :size="26" /></span
          ><span class="eyebrow">KUN TARTIBI</span>
          <h2>Tartibli dars.<br />Aniq natija.</h2>
          <p>
            Har bir darsni o‘z vaqtida boshlash va yakunlash oylik hisobining
            aniqligini ta’minlaydi.
          </p>
          <RouterLink to="/attendance"
            >Davomatni ko‘rish <Icon name="forward" :size="17"
          /></RouterLink>
        </article>
        <article class="panel compact-panel">
          <h3>Qanday hisoblanadi?</h3>
          <div class="check-line">
            <Icon name="check" />Serverdagi aniq vaqt
          </div>
          <div class="check-line">
            <Icon name="check" />Tasdiqlangan dars daqiqalari
          </div>
          <div class="check-line">
            <Icon name="check" />Tanaffuslar alohida hisobda
          </div>
          <RouterLink to="/payroll" class="text-link"
            >Oylik hisobotiga o‘tish <Icon name="right" :size="15"
          /></RouterLink>
        </article>
      </aside></div></template
  ><EvidenceCapture
    v-if="capture"
    v-bind="capture"
    @close="capture = null"
    @done="
      capture = null;
      load();
    "
  />
</template>
