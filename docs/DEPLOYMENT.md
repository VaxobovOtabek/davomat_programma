# Supabase va Vercelga chiqarish

## 1. Baza va Storage

Supabase loyihasi va **private** `davomat-private` Storage bucketini yarating. Bucket public bo‘lmasin.

Frontend Supabase Data API yoki Authga ulanmaydi. Node.js server `davomat` private schemada ishlaydi. Bu schemani Supabase exposed schemas ro‘yxatiga qo‘shmang. Server har so‘rovda sessiya, tashkilot va filial ruxsatlarini tekshiradi.

`.env.example`dan lokal `.env` yarating; qiymatlarni Supabase dashboarddan oling. Hech qanday secretga `VITE_` prefiksi qo‘ymang.

```text
DATABASE_URL=<Supabase PostgreSQL pooler connection string>
SUPABASE_URL=<project URL>
SUPABASE_SECRET_KEY=<server secret key>
SUPABASE_STORAGE_BUCKET=davomat-private
APP_ORIGIN=https://your-app.example
```

Serverless uchun Supabase pooler connection tanlang. Dastlabki schema va seed:

```powershell
npm run db:migrate
npm run seed
```

Seed uchun ADMIN_LOGIN (8 raqam), ADMIN_PASSWORD (kamida 8 belgi), ADMIN_FIRST_NAME va ADMIN_LAST_NAME belgilang. Seed mavjud foydalanuvchi bor bazani qayta yaratmaydi. Seed tugagach ADMIN_PASSWORDni ishchi muhitdan olib tashlang. Adminning haqiqiy filial lokatsiyasini UI orqali belgilang.

Runtime DB hisobiga faqat `davomat` schema va kerakli jadvallar uchun SELECT/INSERT/UPDATE/DELETE ruxsatlarini bering. Migratsiyani yuqori vakolatli alohida credential bilan bajarish ma’qul. Parolni SQL yoki Gitga yozmang. Public/anon foydalanuvchilarga schema ruxsati bermang. Auditni bevosita oddiy foydalanuvchi tahrirlaydigan API mavjud emas.

## 2. Vercel

Repositoryni Vercelga import qiling. Framework/build: Vite, `npm run build`, output `dist`. Root `vercel.json` Node API va SPA route sozlamalarini beradi.

Production envga DATABASE_URL, SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_STORAGE_BUCKET va APP_ORIGINni kiriting. APP_ORIGIN brauzerdagi origin bilan aynan teng bo‘lsin; aks holda mutatsiyalar CSRF tekshiruvida rad etiladi. Preview uchun alohida baza/bucket va alohida origin ishlating.

Node runtime 22 yoki 24 tanlang; lockfiledan `npm ci`. Vercel filesystemida .data ishlatilmaydi: production config missing bo‘lsa startup xato beradi.

Supabase free pilot uchun ishlashi mumkin, lekin selfi arxivi tez o‘sadi. Vercel Hobby tijorat foydalanishi uchun mos emas; joriy tarif shartlarini tekshiring.

## 3. Production smoke-check

1. /api/v1/health 200 qaytarsin.
2. Admin login, foydalanuvchi yaratish, parolni almashtirish.
3. Ustoz selfisi Storagega private saqlansin; anonim media so‘rovi 401 qaytarsin.
4. Boshqa filial/tashkilot IDsi bilan ma’lumotga kirish rad etilsin.
5. Ikki marta start faqat bitta sessiya yaratsin.
6. Dars yakunlash, admin review, payroll calculate/lock, XLSX/CSV ishlasin.
7. Refreshdan keyin dars va hisobotlar yo‘qolmasin.
8. iPhone Safari va Android Chrome real qurilmalarida kamera/GPS, ekran qulflanishi, aloqa uzilishi sinovi.
9. PWA install va statik oflayn qobiq; maxfiy API javoblari cachega tushmasligi.

## 4. Backup, retention va operatsion tayyorgarlik

DB backup va Storage obyektlarini alohida saqlang. DB dump media fayllarni o‘z ichiga olmaydi. Mahalliy PGlite uchun API to‘xtatilgan paytda .data/postgres va .data/media nusxalarini birga saqlash kerak.

Production uchun Supabase backup/export rejasi va Storage backup rejasi tanlanib, restore sinovi o‘tkazilsin. Media retention muddati va nizodagi yozuvlarni saqlash siyosati belgilanmaguncha avtomatik o‘chirishni yoqmang. Ilovada hozir automatic retention job yo‘q.

Loglarga credential, selfi yoki aniq GPS yozmang. Secretlar almashganda deploymentni qayta ishga tushiring. Haftalik quota va storage usage monitoringini sozlang.

## 5. Joriy schema yangilash

Hozir `server/schema.sql` boshlang‘ich idempotent schema hisoblanadi; `npm run db:migrate` uni qo‘llaydi. Keyingi ALTER TABLE o‘zgarishlari versiyali migration sifatida qo‘shilib, staging backup bilan tekshirilishi kerak. Mavjud jadvalni qayta CREATE qilish uning ustunlarini avtomatik yangilamaydi.

