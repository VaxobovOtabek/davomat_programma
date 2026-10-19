# Tekshiruv qaydi

Lokal: Windows, Node.js 24, Vue/Vite, Node Express API, diskka yoziladigan PGlite PostgreSQL.

## Avtomatik

Yakuniy natija: 9 ta test o‘tdi, 0 ta yiqildi; Vue/TypeScript va production build muvaffaqiyatli. Dependency o‘rnatishning yakuniy npm audit natijasi: 0 ta ma’lum zaiflik.

Lokal kirish tuzatishi: setup:local qayta bajarilganda parol/ma’lumotni saqlashi test qilindi. Dev server API tayyorligini kutadi; developmentda localhost va 127.0.0.1 bir xil portda qabul qilinadi, production origin tekshiruvi o‘zgarishsiz qat’iy qoladi.

- Frontend Vue/TypeScript va backend TypeScript tekshiruvi.
- Production Vite build va PWA service worker generatsiyasi.
- Izolyatsiyalangan PostgreSQL bazasida API orqali login → user → lesson → private media → attendance → payroll → XLSX.
- Leading-zero login, duplicate login, rol/tashkilot izolyatsiyasi, CSRF origin.
- Majburiy parol almashtirish, reset va oldingi sessiyani bekor qilish.
- Jadval to‘qnashuvi, idempotent start, noqonuniy resume, pause/resume/finish.
- Payroll lock va yopilgan hisobotni tahrirlashni rad etish.
- Soft delete va tarix saqlanishi.
- Daqiqa/interval/tanaffus/oy chegarasi va CSV formula himoyasi.

## Brauzer / foydalanuvchi

Kirish sahifasi brauzerda ochildi va ko‘rinishi tekshirildi. Lokal admin bilan login muvaffaqiyatli bajarildi; sozlamalar sahifasi server ma’lumotlari bilan ochildi. Foydalanuvchi ham tekshiruvdan o‘tganini bildirdi.

## Tekshirilmagan

Haqiqiy Supabase/Vercel deployment, real Android/iOS kamera/GPS va store paketlari; load test, backup restore va retention job. Bu tekshiruvlar bajarilmaguncha ishlab chiqarish uchun to‘liq tayyorlik da’vo qilinmaydi.

