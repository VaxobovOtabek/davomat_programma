import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import Login from "./views/Login.vue";
import Dashboard from "./views/Dashboard.vue";
import Users from "./views/Users.vue";
import Schedule from "./views/Schedule.vue";
import Attendance from "./views/Attendance.vue";
import Payroll from "./views/Payroll.vue";
import Settings from "./views/Settings.vue";
import { useSession } from "./session";
import "./style.css";
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: Login },
    { path: "/", component: Dashboard },
    { path: "/users", component: Users },
    { path: "/schedule", component: Schedule },
    { path: "/attendance", component: Attendance },
    { path: "/payroll", component: Payroll },
    { path: "/settings", component: Settings },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});
const app = createApp(App);
app.use(createPinia());
router.beforeEach(async (to) => {
  const s = useSession();
  if (!s.loaded) await s.refresh();
  if (!s.user && to.path != "/login") return "/login";
  if (s.user && to.path === "/login") return "/";
  if (s.user?.must_change_password && to.path != "/settings")
    return "/settings";
  if (s.user?.role === "teacher" && to.path === "/users") return "/";
});
app.use(router);
app.mount("#app");
