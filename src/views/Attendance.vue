<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { api, post, dateLabel, timeLabel, toast } from "../api";
import { useSession } from "../session";
import type { Attendance } from "../../shared/types";
import Icon from "../components/Icon.vue";
import Modal from "../components/Modal.vue";
const s = useSession(),
  rows = ref<any[]>([]),
  corrections = ref<any[]>([]),
  filter = ref("all"),
  search = ref(""),
  error = ref(""),
  selected = ref<any>(null),
  reason = ref(""),
  correct = ref<any>(null),
  start = ref(""),
  end = ref(""),
  busy = ref(false);
const manage = computed(() => ["owner", "admin"].includes(s.user?.role || ""));
const states: Record<string, string> = {
    active: "Dars o‘tilmoqda (jarayonda)",
    paused: "Tanaffus",
    completed: "Yakunlangan",
    cancelled: "Bekor qilingan",
  },
  approvals: Record<string, string> = {
    approved: "Tasdiqlangan",
    pending: "Tekshiruvda",
    rejected: "Rad etilgan",
  };

function stateLabel(a: any) {
  if (
    a.state === "completed" ||
    (a.planned_end && Date.parse(a.planned_end) <= Date.now())
  ) {
    return "Yakunlangan";
  }
  return states[a.state] || a.state;
}

function parseLocation(raw: any) {
  if (!raw) return null;
  let loc = raw;
  if (typeof loc === "string") {
    try {
      loc = JSON.parse(loc);
    } catch {
      return null;
    }
  }
  if (!loc || typeof loc !== "object") return null;
  if (
    loc.latitude == null &&
    loc.longitude == null &&
    loc.accuracy == null &&
    loc.distance_m == null
  ) {
    return null;
  }
  return loc;
}

function getLocation(type: string) {
  if (!selected.value) return null;
  return parseLocation(selected.value[type + "_location"]);
}

function formatCoord(val: any): string {
  const num = Number(val);
  return !isNaN(num) && val != null ? num.toFixed(5) : "—";
}

function formatDistance(val: any): string {
  const num = Number(val);
  return !isNaN(num) && val != null ? Math.round(num) + " m" : "—";
}
const filtered = computed(() =>
  rows.value.filter(
    (a) =>
      (filter.value === "all" || a.approval === filter.value) &&
      (a.first_name + " " + a.last_name + " " + a.subject + " " + a.group_name)
        .toLowerCase()
        .includes(search.value.toLowerCase()),
  ),
);
async function load() {
  try {
    rows.value = await api("/attendance");
    if (s.user?.role !== "accountant")
      corrections.value = await api("/corrections");
    error.value = "";
  } catch (e) {
    error.value = (e as Error).message;
  }
}
function edit(a: any) {
  correct.value = a;
  const local = (v: string) =>
    new Date(Date.parse(v) + 5 * 3600000).toISOString().slice(0, 16);
  start.value = local(a.started_at);
  end.value = local(a.ended_at || new Date().toISOString());
  reason.value = "";
}
async function correction() {
  busy.value = true;
  try {
    await post("/corrections", {
      attendance_id: correct.value.id,
      proposed_start: new Date(start.value + ":00+05:00").toISOString(),
      proposed_end: new Date(end.value + ":00+05:00").toISOString(),
      reason: reason.value,
    });
    correct.value = null;
    await load();
    toast("Tuzatish so‘rovi yuborildi.");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function review(approval: string) {
  busy.value = true;
  try {
    await post("/attendance/" + selected.value.id + "/review", {
      approval,
      reason: reason.value,
    });
    selected.value = null;
    await load();
    toast("Qaror saqlandi.");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function reviewCorrection(c: any, approve: boolean) {
  const why = window.prompt("Qaror sababini kiriting:");
  if (!why) return;
  try {
    await post("/corrections/" + c.id + "/review", { approve, reason: why });
    await load();
    toast("Tuzatish ko‘rib chiqildi.");
  } catch (e) {
    error.value = (e as Error).message;
  }
}
onMounted(load);
</script>
<template>
  <section class="page-head">
    <div>
      <span class="eyebrow">ISHTIROK VA DALILLAR</span>
      <h1>Davomat tarixi</h1>
      <p class="muted">
        Har bir darsning boshlanishi, yakuni va tasdiqlash holati.
      </p>
    </div>
    <button class="btn secondary" @click="load">
      <Icon name="refresh" />Yangilash
    </button>
  </section>
  <div v-if="error && !selected && !correct" class="error">{{ error }}</div>
  <section
    v-if="corrections.some((c) => c.status === 'pending')"
    class="panel mb"
  >
    <header class="panel-head">
      <h2>Tuzatish so‘rovlari</h2>
      <span class="badge amber"
        >{{ corrections.filter((c) => c.status === "pending").length }} ta</span
      >
    </header>
    <div
      v-for="c in corrections.filter((c) => c.status === 'pending')"
      :key="c.id"
      class="correction-row"
    >
      <div>
        <strong>{{ c.first_name }} {{ c.last_name }}</strong>
        <p>{{ c.reason }}</p>
        <small
          >{{ dateLabel(c.proposed_start) }} ·
          {{ timeLabel(c.proposed_start) }} –
          {{ timeLabel(c.proposed_end) }}</small
        >
      </div>
      <div v-if="manage" class="row">
        <button
          class="btn secondary small-btn"
          @click="reviewCorrection(c, false)"
        >
          Rad etish</button
        ><button
          class="btn primary small-btn"
          @click="reviewCorrection(c, true)"
        >
          Tasdiqlash
        </button>
      </div>
      <span v-else class="badge amber">Tekshiruvda</span>
    </div>
  </section>
  <section class="panel">
    <div class="toolbar">
      <div class="input-icon search-box">
        <Icon name="search" /><input
          v-model="search"
          placeholder="Ustoz, fan yoki guruhni qidiring"
          aria-label="Davomatni qidirish"
        />
      </div>
      <select v-model="filter" aria-label="Tasdiqlash filtri">
        <option value="all">Barcha holatlar</option>
        <option value="pending">Tekshiruvda</option>
        <option value="approved">Tasdiqlangan</option>
        <option value="rejected">Rad etilgan</option>
      </select>
    </div>
    <div v-if="!filtered.length" class="empty-state">
      <Icon name="attendance" :size="38" />
      <h3>Davomat yozuvlari yo‘q</h3>
      <p>Dars boshlanganida yozuv shu yerda paydo bo‘ladi.</p>
    </div>
    <div v-else class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Ustoz / fan</th>
            <th>Sana</th>
            <th>Vaqt</th>
            <th>Dars holati</th>
            <th>Tasdiqlash</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in filtered" :key="a.id">
            <td>
              <strong>{{ a.first_name }} {{ a.last_name }}</strong
              ><small
                >{{ a.subject }} · {{ a.group_name }} · {{ a.room }}-xona</small
              >
            </td>
            <td>{{ dateLabel(a.started_at) }}</td>
            <td>
              {{ timeLabel(a.started_at) }} –
              {{ a.ended_at ? timeLabel(a.ended_at) : "…" }}
            </td>
            <td>
              <span class="badge">{{ stateLabel(a) }}</span>
            </td>
            <td>
              <span
                class="badge"
                :class="
                  a.approval === 'approved'
                    ? 'green'
                    : a.approval === 'pending'
                      ? 'amber'
                      : 'red-badge'
                "
                >{{ approvals[a.approval] }}</span
              >
            </td>
            <td>
              <button
                class="btn secondary small-btn"
                @click="
                  selected = a;
                  reason = '';
                  error = '';
                "
              >
                Tafsilotlar<Icon name="right" :size="15" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
  <Modal
    v-if="selected"
    title="Davomat tafsilotlari"
    wide
    @close="selected = null"
    ><div class="modal-body">
      <div class="capture-summary">
        <Icon name="school" />
        <div>
          <strong>{{ selected.subject }} · {{ selected.group_name }}</strong
          ><small
            >{{ selected.first_name }} {{ selected.last_name }} ·
            {{ selected.room }}-xona (jadvaldan)</small
          >
        </div>
      </div>
      <div class="evidence-grid">
        <article v-for="type in ['start', 'end']" :key="type">
          <h3>{{ type === "start" ? "Dars boshlanishi" : "Dars yakuni" }}</h3>
          <img
            v-if="selected[type + '_evidence']"
            class="evidence-image"
            :src="'/api/v1/media/' + selected[type + '_evidence']"
            :alt="type === 'start' ? 'Boshlash selfisi' : 'Yakunlash selfisi'"
          />
          <div v-else class="evidence-empty">
            <Icon name="image" /><span>{{
              s.user?.role === "accountant"
                ? "Dalillar bu rolga berilmaydi"
                : "Dalil yo‘q"
            }}</span>
          </div>
          <p>
            <Icon name="clock" :size="16" />{{
              type === "start"
                ? timeLabel(selected.started_at)
                : selected.ended_at
                  ? timeLabel(selected.ended_at)
                  : "Yakunlanmagan"
            }}
          </p>
          <template v-if="getLocation(type)"
            ><p v-if="getLocation(type)?.accuracy != null">
              <Icon name="pin" :size="16" />Aniqlik:
              {{ formatDistance(getLocation(type)?.accuracy) }}
            </p>
            <small v-if="getLocation(type)?.distance_m != null"
              >Filialgacha:
              {{ formatDistance(getLocation(type)?.distance_m) }}</small
            ><small v-if="getLocation(type)?.latitude != null"
              >{{ formatCoord(getLocation(type)?.latitude) }},
              {{ formatCoord(getLocation(type)?.longitude) }}</small
            ></template
          >
          <div v-else class="evidence-empty">
            <span class="muted tiny">Lokatsiya mavjud emas</span>
          </div>
        </article>
      </div>
      <div v-if="selected.reason" class="warning-strip">
        {{ selected.reason }}
      </div>
      <div v-if="manage && selected.state === 'completed'" class="review-area">
        <label
          >Qaror sababi<textarea
            v-model="reason"
            minlength="3"
            placeholder="Tekshiruv natijasini yozing"
          ></textarea>
        </label>
        <div class="row">
          <button
            class="btn secondary"
            :disabled="busy || reason.length < 3"
            @click="review('rejected')"
          >
            Rad etish</button
          ><button
            class="btn primary"
            :disabled="busy || reason.length < 3"
            @click="review('approved')"
          >
            <Icon name="check" />Tasdiqlash
          </button>
        </div>
      </div>
      <div v-if="error" class="error">{{ error }}</div>
    </div>
    <footer class="modal-actions">
      <button
        v-if="s.user?.role !== 'accountant'"
        class="btn secondary"
        @click="
          edit(selected);
          selected = null;
        "
      >
        <Icon name="edit" />Vaqtni tuzatish so‘rovi</button
      ><button class="btn secondary" @click="selected = null">Yopish</button>
    </footer></Modal
  ><Modal v-if="correct" title="Vaqtni tuzatish so‘rovi" @close="correct = null"
    ><form @submit.prevent="correction">
      <div class="modal-body">
        <p class="muted">
          O‘zgarish admin tasdiqlagandan keyin qo‘llanadi. Oldingi yozuv auditda
          saqlanadi.
        </p>
        <label
          >Boshlanish (Toshkent)<input
            v-model="start"
            type="datetime-local"
            required /></label
        ><label
          >Tugash (Toshkent)<input
            v-model="end"
            type="datetime-local"
            required /></label
        ><label
          >Sabab<textarea v-model="reason" minlength="5" required></textarea>
        </label>
        <div v-if="error" class="error">{{ error }}</div>
      </div>
      <footer class="modal-actions">
        <button class="btn primary" :disabled="busy">So‘rov yuborish</button>
      </footer>
    </form></Modal
  >
</template>
