import { defineStore } from "pinia";
import { ref } from "vue";
import { api, post } from "./api";
import type { User } from "../shared/types";
import { get, del } from "idb-keyval";
export const useSession = defineStore("session", () => {
  const user = ref<User | null>(null),
    loaded = ref(false);
  async function refresh() {
    try {
      user.value = await api("/me");
    } catch {
      user.value = null;
    }
    loaded.value = true;
  }
  async function logout() {
    const drafts = (await get<any[]>("davomat-drafts")) || [];
    if (
      drafts.length &&
      !window.confirm(
        "Yuborilmagan davomat draftlari bor. Chiqishda ular o‘chiriladi. Baribir chiqasizmi?",
      )
    )
      return false;
    await post("/auth/logout");
    await del("davomat-drafts");
    user.value = null;
    return true;
  }
  return { user, loaded, refresh, logout };
});
