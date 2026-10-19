<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { api, post, today, money, dateLabel, toast } from "../api";
import { useSession } from "../session";
import Icon from "../components/Icon.vue";
import Modal from "../components/Modal.vue";
const s = useSession(),
  month = ref(today().slice(0, 7)),
  runs = ref<any[]>([]),
  branches = ref<any[]>([]),
  branch = ref(s.user?.branch_id || ""),
  runId = ref(""),
  error = ref(""),
  busy = ref(false),
  detail = ref<any>(null),
  adjust = ref<any>(null),
  bonus = ref(0),
  deduction = ref(0),
  reason = ref("");
const teacher = computed(() => s.user?.role === "teacher"),
  run = computed(
    () => runs.value.find((r) => r.id === runId.value) || runs.value[0],
  ),
  items = computed(() => run.value?.items || []),
  minutes = computed(() =>
    items.value.reduce((n: number, i: any) => n + i.minutes, 0),
  ),
  total = computed(() =>
    items.value.reduce((n: number, i: any) => n + Number(i.total), 0),
  );
async function load() {
  try {
    runs.value = await api("/payroll?month=" + month.value);
    branches.value = await api("/branches");
    error.value = "";
  } catch (e) {
    error.value = (e as Error).message;
  }
}
async function calculate() {
  busy.value = true;
  try {
    const r = await post("/payroll/calculate", {
      month: month.value,
      branch_id: branch.value,
    });
    runId.value = r.id;
    await load();
    toast("Hisobot hisoblandi.");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function lock() {
  if (!window.confirm("Hisobotni yopasizmi? Bu versiya keyin tahrirlanmaydi."))
    return;
  busy.value = true;
  try {
    await post("/payroll/" + run.value.id + "/lock");
    await load();
    toast("Hisobot tasdiqlandi va yopildi.");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function saveAdjustment() {
  try {
    await api("/payroll/" + run.value.id + "/adjust", {
      method: "PATCH",
      body: JSON.stringify({
        teacher_id: adjust.value.teacher_id,
        bonus: bonus.value,
        deduction: deduction.value,
        reason: reason.value,
      }),
    });
    adjust.value = null;
    await load();
    toast("Tuzatish saqlandi.");
  } catch (e) {
    error.value = (e as Error).message;
  }
}
async function download(format: string) {
  try {
    const response = await fetch(
      "/api/v1/payroll/" + run.value.id + "/export?format=" + format,
    );
    if (!response.ok) throw new Error((await response.json()).message);
    const url = URL.createObjectURL(await response.blob()),
      a = document.createElement("a");
    a.href = url;
    a.download = "davomat-" + month.value + "." + format;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (e) {
    error.value = (e as Error).message;
  }
}
onMounted(load);
</script>
<template>
  <section class="page-head">
    <div>
      <span class="eyebrow">ANIQ VA SHAFFOF HISOB</span>
      <h1>{{ teacher ? "Mening oyligim" : "Oylik hisoboti" }}</h1>
      <p class="muted">
        Tasdiqlangan darslar va haq to‘lanadigan daqiqalar asosida.
      </p>
    </div>
    <div v-if="run && !teacher" class="row">
      <button class="btn secondary" @click="download('xlsx')">
        <Icon name="download" />Excel yuklash</button
      ><button class="btn secondary" @click="download('csv')">CSV</button>
    </div>
  </section>
  <div v-if="error && !adjust" class="error">{{ error }}</div>
  <div class="panel toolbar mb">
    <input
      v-model="month"
      type="month"
      aria-label="Hisobot oyi"
      @change="
        runId = '';
        load();
      "
    /><select v-if="!teacher" v-model="branch" aria-label="Filial">
      <option v-for="b in branches" :key="b.id" :value="b.id">
        {{ b.name }}
      </option></select
    ><select v-if="runs.length" v-model="runId" aria-label="Hisobot versiyasi">
      <option value="">Eng so‘nggi hisobot</option>
      <option v-for="r in runs" :key="r.id" :value="r.id">
        v{{ r.version }} ·
        {{ r.state === "locked" ? "Yopilgan" : "Qoralama" }} ·
        {{ branches.find((b) => b.id === r.branch_id)?.name }}
      </option></select
    ><button
      v-if="!teacher"
      class="btn primary"
      :disabled="busy"
      @click="calculate"
    >
      <Icon name="refresh" />{{ busy ? "Hisoblanmoqda…" : "Hisoblash" }}
    </button>
  </div>
  <div class="stats-grid three">
    <article class="stat-card">
      <div class="stat-top">
        <span>Jami daqiqa</span
        ><span class="stat-icon teal"><Icon name="clock" /></span>
      </div>
      <strong>{{ money(minutes) }}</strong
      ><small
        >{{ Math.floor(minutes / 60) }} soat {{ minutes % 60 }} daqiqa</small
      >
    </article>
    <article class="stat-card">
      <div class="stat-top">
        <span>Hisoblangan summa</span
        ><span class="stat-icon blue"><Icon name="wallet" /></span>
      </div>
      <strong>{{ money(total) }}<span class="stat-unit"> so‘m</span></strong
      ><small>Bonus va ushlab qolishlar bilan</small>
    </article>
    <article class="stat-card">
      <div class="stat-top">
        <span>Hisobot holati</span
        ><span class="stat-icon violet"><Icon name="shield" /></span>
      </div>
      <strong class="status-heading">{{
        !run
          ? "Hisobot yo‘q"
          : run.state === "locked"
            ? "Tasdiqlangan"
            : "Qoralama"
      }}</strong
      ><small>{{
        run
          ? "Versiya " + run.version + " · " + dateLabel(run.created_at)
          : "Oy tanlang va hisoblang"
      }}</small>
    </article>
  </div>
  <section class="panel">
    <header class="panel-head">
      <div>
        <h2>Ustozlar kesimida</h2>
        <p>{{ month }} · {{ items.length }} ta ustoz</p>
      </div>
      <button
        v-if="run && run.state !== 'locked' && !teacher"
        class="btn primary small-btn"
        :disabled="busy"
        @click="lock"
      >
        <Icon name="check" :size="16" />Tasdiqlash va yopish</button
      ><span v-else-if="run?.state === 'locked'" class="badge green"
        ><Icon name="shield" :size="14" />O‘zgarmas hisobot</span
      >
    </header>
    <div v-if="!items.length" class="empty-state">
      <Icon name="wallet" :size="38" />
      <h3>Hisoblangan darslar yo‘q</h3>
      <p>
        {{
          teacher
            ? "Admin hisoblagan oylik bu yerda chiqadi."
            : "Tasdiqlangan, yakunlangan darslar bo‘lgach oylikni hisoblang."
        }}
      </p>
    </div>
    <div v-else class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Ustoz</th>
            <th>Daqiqa</th>
            <th>Asosiy summa</th>
            <th>Bonus</th>
            <th>Ushlab qolish</th>
            <th>Jami</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in items" :key="i.teacher_id">
            <td>
              <strong>{{ i.name }}</strong
              ><small>{{ i.lessons.length }} ta dars</small>
            </td>
            <td>{{ money(i.minutes) }}</td>
            <td>{{ money(i.base) }}</td>
            <td class="green-text">+{{ money(i.bonus) }}</td>
            <td>{{ money(i.deduction) }}</td>
            <td>
              <strong>{{ money(i.total) }} so‘m</strong>
            </td>
            <td>
              <div class="row">
                <button
                  class="icon-button"
                  aria-label="Darslar tafsiloti"
                  @click="detail = i"
                >
                  <Icon name="eye" :size="18" /></button
                ><button
                  v-if="!teacher && run.state !== 'locked'"
                  class="icon-button"
                  aria-label="Bonus va ushlab qolish"
                  @click="
                    adjust = i;
                    bonus = Number(i.bonus);
                    deduction = Number(i.deduction);
                    reason = i.adjustment_reason;
                    error = '';
                  "
                >
                  <Icon name="edit" :size="18" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <footer class="panel-foot">
      <span
        ><Icon name="shield" :size="15" />Faqat tasdiqlangan vaqt hisobga
        olinadi. Soliq va bank to‘lovi kiritilmagan.</span
      >
    </footer>
  </section>
  <Modal
    v-if="detail"
    :title="detail.name + ' — darslar'"
    wide
    @close="detail = null"
    ><div class="modal-body table-scroll">
      <table>
        <thead>
          <tr>
            <th>Fan</th>
            <th>Sana</th>
            <th>Daqiqa</th>
            <th>Stavka / soat</th>
            <th>Summa</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in detail.lessons" :key="l.attendance_id">
            <td>{{ l.subject }}</td>
            <td>{{ dateLabel(l.start) }}</td>
            <td>{{ l.minutes }}</td>
            <td>{{ money(l.rate) }}</td>
            <td>{{ money(l.amount) }}</td>
          </tr>
        </tbody>
      </table>
    </div></Modal
  ><Modal v-if="adjust" title="Bonus va ushlab qolish" @close="adjust = null"
    ><form @submit.prevent="saveAdjustment">
      <div class="modal-body">
        <p>{{ adjust.name }}</p>
        <label
          >Bonus (so‘m)<input
            v-model="bonus"
            type="number"
            min="0"
            required /></label
        ><label
          >Ushlab qolish (so‘m)<input
            v-model="deduction"
            type="number"
            min="0"
            required /></label
        ><label
          >Sabab<textarea v-model="reason" minlength="3" required></textarea>
        </label>
        <div v-if="error" class="error">{{ error }}</div>
      </div>
      <footer class="modal-actions">
        <button class="btn primary">Saqlash</button>
      </footer>
    </form></Modal
  >
</template>
