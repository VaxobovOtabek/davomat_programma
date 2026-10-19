export interface PositionProof {
  latitude: number;
  longitude: number;
  accuracy: number;
  captured_at: string;
}
export function locate(): Promise<PositionProof> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(new Error("Qurilma lokatsiyani qo‘llamaydi."));
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
          captured_at: new Date(p.timestamp).toISOString(),
        }),
      () =>
        reject(
          new Error(
            "Lokatsiyani olish imkoni yo‘q. Brauzer ruxsatlarini tekshiring.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}
export async function camera() {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 960 } },
    audio: false,
  });
}
