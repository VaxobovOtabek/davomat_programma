<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSession } from "./session";
import { notice, initials } from "./api";
import Icon from "./components/Icon.vue";
const s = useSession(),
  route = useRoute(),
  router = useRouter(),
  mobile = ref(false);
const links = computed(() =>
  [
    {
      path: "/",
      title:
        s.user?.role === "teacher" ? "Bugungi darslar" : "Umumiy ko‘rinish",
      icon: "dashboard",
    },
    {
      path: "/users",
      title: "Foydalanuvchilar",
      icon: "users",
      hidden: s.user?.role === "teacher",
    },
    { path: "/schedule", title: "Dars jadvali", icon: "calendar" },
    { path: "/attendance", title: "Davomat", icon: "attendance" },
    { path: "/payroll", title: "Oylik hisoboti", icon: "wallet" },
    { path: "/settings", title: "Sozlamalar", icon: "settings" },
  ].filter((x) => !x.hidden),
);
const roles: Record<string, string> = {
  owner: "Tashkilot egasi",
  admin: "Administrator",
  teacher: "Ustoz",
  accountant: "Buxgalter",
};
async function logout() {
  if (await s.logout()) await router.push("/login");
}
const title = computed(
  () => links.value.find((l) => l.path === route.path)?.title || "Davomat",
);
</script>
<template>
  <div v-if="s.user" class="app-shell">
    <div v-if="mobile" class="nav-scrim" @click="mobile = false"></div>
    <aside class="sidebar" :class="{ open: mobile }">
      <RouterLink to="/" class="brand"
        ><span class="brand-mark"><Icon name="attendance" :size="25" /></span
        ><span>davomat<span class="brand-dot">.</span></span></RouterLink
      >
      <div class="workspace">
        <span class="workspace-icon"><Icon name="school" /></span>
        <div><strong>Ta’lim boshqaruvi</strong><small>Ish muhiti</small></div>
        <Icon name="right" :size="15" />
      </div>
      <span class="nav-label">BOSHQARUV PANELI</span>
      <nav>
        <RouterLink
          v-for="link in links"
          :key="link.path"
          :to="link.path"
          :class="{ active: route.path === link.path }"
          @click="mobile = false"
          ><Icon :name="link.icon" /><span>{{ link.title }}</span
          ><span v-if="route.path === link.path" class="nav-dot"></span
        ></RouterLink>
      </nav>
      <div class="sidebar-note">
        <div class="note-icon"><Icon name="shield" :size="20" /></div>
        <strong>Har bir daqiqa hisobda</strong>
        <p>Davomat va oylik — bir joyda, aniq va tartibli.</p>
      </div>
      <div class="sidebar-user">
        <span class="avatar small">{{
          initials(s.user.first_name, s.user.last_name)
        }}</span>
        <div>
          <strong>{{ s.user.first_name }} {{ s.user.last_name }}</strong
          ><small>{{ roles[s.user.role] }}</small>
        </div>
        <button
          class="icon-button"
          title="Chiqish"
          aria-label="Tizimdan chiqish"
          @click="logout"
        >
          <Icon name="logout" :size="18" />
        </button>
      </div>
    </aside>
    <div class="main-shell">
      <header class="topbar">
        <div class="breadcrumb">
          <button
            class="icon-button mobile-toggle"
            aria-label="Menyuni ochish"
            @click="mobile = true"
          >
            <Icon name="menu" /></button
          ><span>Boshqaruv</span><Icon name="right" :size="14" /><strong>{{
            title
          }}</strong>
        </div>
        <div class="topbar-right">
          <span class="secure"><i></i> Himoyalangan tizim</span
          ><span class="avatar small">{{
            initials(s.user.first_name, s.user.last_name)
          }}</span>
        </div>
      </header>
      <main class="content"><RouterView /></main>
      <footer class="footer">
        <span>© {{ new Date().getFullYear() }} Davomat</span
        ><span>Ta’limdagi har bir daqiqa qadrli.</span>
      </footer>
    </div>
    <nav class="mobile-bottom">
      <RouterLink to="/"><Icon name="dashboard" /><span>Bugun</span></RouterLink
      ><RouterLink to="/attendance"
        ><Icon name="attendance" /><span>Davomat</span></RouterLink
      ><RouterLink to="/payroll"
        ><Icon name="wallet" /><span>Oylik</span></RouterLink
      ><RouterLink to="/settings"
        ><Icon name="settings" /><span>Profil</span></RouterLink
      >
    </nav>
  </div>
  <RouterView v-else />
  <div v-if="notice" class="toast" role="status">
    <Icon name="check" />{{ notice }}
  </div>
</template>
