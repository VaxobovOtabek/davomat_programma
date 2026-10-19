<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { post } from "../api";
import { useSession } from "../session";
import Icon from "../components/Icon.vue";
const login = ref(""),
  password = ref(""),
  visible = ref(false),
  busy = ref(false),
  error = ref(""),
  router = useRouter(),
  s = useSession();
async function submit() {
  busy.value = true;
  error.value = "";
  try {
    await post("/auth/login", { login: login.value, password: password.value });
    await s.refresh();
    await router.push(s.user?.must_change_password ? "/settings" : "/");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="login-page">
    <section class="login-story">
      <div class="brand">
        <span class="brand-mark"><Icon name="attendance" :size="26" /></span
        ><span>davomat.</span>
      </div>
      <div class="story-content">
        <span class="eyebrow light">TA’LIM UCHUN YARATILGAN</span>
        <h1>
          Har bir dars.<br />Har bir daqiqa.<br /><em>Hammasi hisobda.</em>
        </h1>
        <p>
          Ustozlar davomati, dars jadvali va oylik hisobini yagona, qulay
          tizimda boshqaring.
        </p>
        <div class="story-card">
          <div class="story-check"><Icon name="checks" :size="26" /></div>
          <div>
            <strong>Shaffof davomat. Aniq hisob.</strong
            ><span>Selfi, lokatsiya va vaqt — birgalikda.</span>
          </div>
        </div>
      </div>
      <span class="story-footer">Yaxshi ta’lim tartibdan boshlanadi.</span>
      <div class="orbit orbit-one"></div>
      <div class="orbit orbit-two"></div>
    </section>
    <section class="login-form-side">
      <div class="login-form-wrap">
        <div class="login-badge"><Icon name="shield" :size="28" /></div>
        <h2>Xush kelibsiz!</h2>
        <p class="muted">Davom etish uchun hisobingizga kiring.</p>
        <form @submit.prevent="submit">
          <label
            >Login <span class="muted">(8 raqam)</span>
            <div class="input-icon">
              <Icon name="users" :size="18" /><input
                v-model="login"
                name="username"
                autocomplete="username"
                inputmode="numeric"
                pattern="[0-9]{8}"
                maxlength="8"
                placeholder="00123456"
                required
              /></div></label
          ><label
            >Parol
            <div class="input-icon">
              <Icon name="key" :size="18" /><input
                v-model="password"
                :type="visible ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Parolingizni kiriting"
                required
                maxlength="128"
              /><button
                type="button"
                class="icon-button"
                :aria-label="
                  visible ? 'Parolni yashirish' : 'Parolni ko‘rsatish'
                "
                @click="visible = !visible"
              >
                <Icon :name="visible ? 'eyeoff' : 'eye'" :size="18" />
              </button></div
          ></label>
          <div v-if="error" class="error" role="alert">{{ error }}</div>
          <button class="btn primary full" :disabled="busy">
            {{ busy ? "Kirilmoqda…" : "Tizimga kirish"
            }}<Icon name="forward" :size="18" />
          </button>
        </form>
        <div class="login-help">
          <Icon name="alert" :size="18" />
          <p>
            Login yoki parolni unutdingizmi?<br /><strong
              >Markaz administratoriga murojaat qiling.</strong
            >
          </p>
        </div>
        <div class="login-security">
          <Icon name="shield" :size="14" /> Ma’lumotlaringiz himoyalangan
        </div>
      </div>
      <span class="login-footer"
        >© {{ new Date().getFullYear() }} Davomat. Barcha huquqlar
        himoyalangan.</span
      >
    </section>
  </div>
</template>
