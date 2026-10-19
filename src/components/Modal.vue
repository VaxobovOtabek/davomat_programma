<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import Icon from "./Icon.vue";
defineProps<{ title: string; wide?: boolean }>();
const emit = defineEmits<{ close: [] }>();
const el = ref<HTMLElement>();
let previous: Element | null = null;
const key = (e: KeyboardEvent) => {
  if (e.key === "Escape") emit("close");
  if (e.key === "Tab") {
    const nodes = el.value?.querySelectorAll<HTMLElement>(
      "button,input,select,textarea,a[href]",
    );
    if (!nodes?.length) return;
    const first = nodes[0],
      last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
};
onMounted(() => {
  previous = document.activeElement;
  document.addEventListener("keydown", key);
  el.value?.focus();
});
onUnmounted(() => {
  document.removeEventListener("keydown", key);
  (previous as HTMLElement)?.focus();
});
</script>
<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <section
      ref="el"
      class="modal"
      :class="{ wide }"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      tabindex="-1"
    >
      <header class="modal-head">
        <h2>{{ title }}</h2>
        <button class="icon-button" aria-label="Yopish" @click="emit('close')">
          <Icon name="x" />
        </button>
      </header>
      <slot />
    </section>
  </div>
</template>
