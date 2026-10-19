<script setup lang="ts">
import { ref, onUnmounted, nextTick } from "vue";
import { set, get } from "idb-keyval";
import { camera, locate, type PositionProof } from "../device";
import { post, toast } from "../api";
import { useSession } from "../session";
import Icon from "./Icon.vue";
import Modal from "./Modal.vue";
const props = defineProps<{
    lessonId?: string;
    attendanceId?: string;
    title: string;
  }>(),
  emit = defineEmits<{ close: []; done: [] }>();
const video = ref<HTMLVideoElement>(),
  photo = ref(""),
  location = ref<PositionProof | null>(null),
  busy = ref(false),
  error = ref(""),
  stream = ref<MediaStream | null>(null);
const key = crypto.randomUUID();
const user = useSession();
async function prepare() {
  error.value = "";
  try {
    stream.value?.getTracks().forEach((t) => t.stop());
    photo.value = "";
    stream.value = await camera();
    await nextTick();
    if (video.value) {
      video.value.srcObject = stream.value;
      await video.value.play();
    }
    location.value = await locate();
  } catch (e) {
    error.value = (e as Error).message;
  }
}
function capture() {
  if (!video.value?.videoWidth) return;
  const canvas = document.createElement("canvas");
  canvas.width = video.value.videoWidth;
  canvas.height = video.value.videoHeight;
  canvas.getContext("2d")!.drawImage(video.value, 0, 0);
  photo.value = canvas.toDataURL("image/jpeg", 0.7);
  stream.value?.getTracks().forEach((t) => t.stop());
}
async function save() {
  if (!photo.value || !location.value) return;
  busy.value = true;
  error.value = "";
  const draft = {
    key,
    userId: user.user!.id,
    photo: photo.value,
    location: location.value,
    lessonId: props.lessonId,
    attendanceId: props.attendanceId,
    title: props.title,
  };
  try {
    const challenge = await post("/evidence/challenge");
    const media = await post("/media", { kind: "selfie", data: photo.value });
    await post(
      props.attendanceId
        ? "/attendance/" + props.attendanceId + "/finish"
        : "/attendance/start",
      {
        lesson_id: props.lessonId,
        media_id: media.id,
        challenge_id: challenge.id,
        location: location.value,
      },
      key,
    );
    toast("Davomat serverda saqlandi.");
    emit("done");
  } catch (e) {
    error.value = (e as Error).message;
    if (!navigator.onLine || e instanceof TypeError) {
      const queue = (await get<any[]>("davomat-drafts")) || [];
      if (!queue.some((d) => d.key === key)) queue.push(draft);
      await set("davomat-drafts", queue);
      error.value =
        "Yuborilmadi. Draft qurilmada saqlandi; internet qaytganda Bugun sahifasidan qayta yuboring. Bu hali tasdiqlangan davomat emas.";
    }
  } finally {
    busy.value = false;
  }
}
onUnmounted(() => stream.value?.getTracks().forEach((t) => t.stop()));
</script>
<template>
  <Modal
    title="Darsni boshlash — selfi va lokatsiya"
    @close="emit('close')"
    ><div class="modal-body">
      <div class="capture-summary">
        <Icon name="school" />
        <div>
          <strong>{{ title }}</strong
          ><small>Xona jadvaldan olindi</small>
        </div>
      </div>
      <div class="camera-box">
        <img v-if="photo" :src="photo" alt="Olingan selfi" /><video
          v-else-if="stream"
          ref="video"
          autoplay
          playsinline
          muted
        ></video>
        <div v-else class="camera-placeholder">
          <Icon name="camera" :size="48" />
          <p>Darsni tasdiqlash uchun selfi oling</p>
          <button class="btn primary" @click="prepare">Kamerani yoqish</button>
        </div>
      </div>
      <div class="row">
        <button v-if="stream && !photo" class="btn primary" @click="capture">
          <Icon name="camera" />Selfi olish</button
        ><button v-if="photo" class="btn secondary" @click="prepare">
          <Icon name="refresh" />Qayta olish</button
        ><button
          class="btn secondary"
          @click="
            async () => {
              try {
                location = await locate();
              } catch (e) {
                error = (e as Error).message;
              }
            }
          "
        >
          <Icon name="pin" />Lokatsiya
        </button>
      </div>
      <div v-if="location" class="success-strip">
        <Icon name="pin" />
        <div>
          <strong>Lokatsiya olindi</strong
          ><small
            >Aniqlik: {{ Math.round(location.accuracy) }} m · filial yaqinligi
            tekshiriladi</small
          >
        </div>
      </div>
      <div v-if="error" class="error" role="alert">{{ error }}</div>
      <p class="muted tiny">
        Selfi va lokatsiya davomat dalili sifatida saqlanadi. Vaqt server orqali
        belgilanadi.
      </p>
    </div>
    <footer class="modal-actions">
      <button class="btn secondary" @click="emit('close')">Bekor qilish</button
      ><button
        class="btn primary"
        :disabled="busy || !photo || !location"
        @click="save"
      >
        {{ busy ? "Saqlanmoqda…" : "Darsni boshlash" }}
      </button>
    </footer></Modal
  >
</template>
