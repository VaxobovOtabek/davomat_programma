# Davomat

Vue 3 PWA + Node.js API: ustozlar davomati, foydalanuvchilar, dars jadvali va daqiqalik oylik.

## Lokal ishga tushirish

Node.js 22 yoki 24 kerak. Ushbu kompyuterda dependencylar o‘rnatilgan va lokal admin yaratilgan.

```powershell
npm ci
npm run setup:local
npm run dev
```

`setup:local` birinchi ishga tushishda bazani va adminni yaratadi. Qayta bajarilganda mavjud hisoblar, parollar va davomatni saqlab, xatosiz tugaydi. Mavjud baza bo‘lsa **faqat `npm run dev`** yetarli. Baza sozlashdan oldin dev terminalida Ctrl+C bosing.

`npm run dev` avval API va bazani tekshiradi, keyin frontendni ishga tushiradi. Port band bo‘lsa boshqa portga yashirin o‘tmaydi: eski dev terminalini Ctrl+C bilan to‘xtating. Frontend HMR ishlaydi; backend fayllarini tahrirlagach `npm run dev`ni qayta ishga tushiring. Developmentda `http://localhost:5173` va `http://127.0.0.1:5173` ikkalasi ham qo‘llanadi; productionda APP_ORIGIN aynan mos bo‘lishi kerak.

Brauzer: [http://127.0.0.1:5173](http://127.0.0.1:5173).

Admin logini va tasodifiy paroli: `.data/LOCAL_LOGIN.txt`. Bu fayl Gitga kirmaydi. Productionda ushbu hisob yoki paroldan foydalanmang.

Lokal baza — haqiqiy PostgreSQL engine asosidagi PGlite; ma’lumotlar `.data/postgres` papkasida, rasmlar `.data/media`da saqlanadi. Bu test rejimidagi mock yoki browser localStorage bazasi emas. Lokal baza bilan bir paytda faqat bitta API jarayoni ishlasin.

## Birinchi foydalanish

1. Admin bilan kiring.
2. **Sozlamalar → Filial lokatsiyasi**: haqiqiy filial koordinatalari, radius va GPS aniqlik chegarasini belgilang. Dastlabki Toshkent koordinatasi faqat boshlang‘ich qiymat.
3. **Foydalanuvchilar**: ustoz rasmi, ism/familiya, lavozim, 8 raqamli login, vaqtinchalik parol va stavka kiriting.
4. **Dars jadvali**: ustoz, fan, sinf/guruh, xona va vaqtni belgilang. Haftalik takrorlash mavjud.
5. Ustoz birinchi kirishda vaqtinchalik parolini almashtiradi.
6. Ustoz bugungi darsini selfi va lokatsiya bilan boshlaydi, kerak bo‘lsa tanaffus qiladi va yakunlaydi.
7. Admin shubhali yozuvlarni va vaqtni tuzatish so‘rovlarini ko‘rib chiqadi.
8. **Oylik hisoboti**: oy/filialni tanlab hisoblang, bonus yoki ushlab qolishni sabab bilan kiriting, tasdiqlang va XLSX/CSV yuklang.

Emailsiz kirish ishlaydi; login string bo‘lib, `00123456`dagi nollar saqlanadi. QR/skaner yo‘q. Xona jadvaldan olinadi; GPS aynan xonada bo‘lganlikni kafolatlamaydi.

## Tayyor imkoniyatlar

- Owner, admin, ustoz va buxgalter rollari; tashkilot/filial bo‘yicha server avtorizatsiyasi.
- Foydalanuvchi yaratish, profil/rasm/login/rol/stavkani tahrirlash, parol reseti, soft delete.
- Bekor qilingan loginning qayta ishlatilmasligi; reset/o‘chirishda sessiyalar bekor bo‘lishi.
- Filial va geofence sozlamalari.
- Dars yaratish, tahrirlash, bekor qilish, 4/8/16 haftalik takrorlash va bandlik tekshiruvi.
- Jonli kamera, lokatsiya, private media, server vaqti, start/pause/resume/finish.
- Bitta ochiq dars cheklovi, idempotent retry, tranzaksiyalar va audit.
- Monitoring va davomat tafsiloti; tuzatish so‘rovi va admin qarori.
- To‘liq daqiqalik oylik, stavka snapshoti, bonus/ushlab qolish, o‘zgarmas yopilgan hisobot va yangi versiyalar.
- XLSX yig‘ma + darslar tafsiloti; CSV yig‘ma eksport.
- PWA manifest, ikonlar, statik oflayn qobiq. Maxfiy API/rasmlar keshlanmaydi.
- Upload paytida aloqa uzilsa IndexedDB drafti va qayta yuborish; bunday dalil admin tekshiruviga tushadi.
- Mobil layout, pastki navigatsiya, modal fokus boshqaruvi.

## Tekshiruvlar

```powershell
npm test
npm run build
npm audit
```

`npm test` alohida `.data/tests-*` bazasini yaratadi. Testlar ishlayotgan lokal hisob ma’lumotlarini o‘zgartirmaydi. Test papkalarini API ishlamayotgan paytda tozalash mumkin.

Avtomatik testlar: auth/rol, leading-zero login, takror login, majburiy parol almashish, boshqa tashkilot ma’lumotiga kirishni rad etish, jadval to‘qnashuvi, media, dars state transitionlari, duplicate start, payroll lock, XLSX, parol reseti va tarixni saqlaydigan o‘chirish. Domain testlari: tanaffus birlashmasi, 39 daqiqa misoli, overtime chegarasi, oy chegarasidagi sekundlarni taqsimlash, CSV injection.

## Supabase + Vercel

Batafsil: [DEPLOYMENT.md](docs/DEPLOYMENT.md).

`.env.example`dagi parametrlar:
- `DATABASE_URL`: Supabase PostgreSQL server connection/pooler URL.
- `SUPABASE_URL`, `SUPABASE_SECRET_KEY`: **faqat serverda**.
- `SUPABASE_STORAGE_BUCKET`: private bucket nomi.
- `APP_ORIGIN`: aniq frontend origin, oxirida slashsiz.
- `ADMIN_*`: birinchi production admin uchun seed; bir martalik foydalanishdan keyin olib tashlash mumkin.

`DATABASE_URL` bo‘lmasa faqat developmentda lokal baza tanlanadi. Productionda DB/Storage/APP_ORIGIN yo‘q bo‘lsa ilova xavfsiz ravishda ishga tushmaydi. Supabase Auth ishlatilmaydi; Node.js login/parol va sessiyani boshqaradi.

## Tuzilma

```text
src/                  Vue sahifalari, komponentlar, PWA UI
server/routes/        Auth, admin, attendance, payroll API
server/domain.ts      Daqiqa va pul hisoblash funksiyalari
server/db.ts          PostgreSQL/PGlite adapter
server/schema.sql     Takroran xavfsiz qo‘llanadigan boshlang‘ich schema
server/media.ts       Private media adapter
shared/               Umumiy turlar
api/index.ts          Vercel Functions kirish nuqtasi
scripts/              Baza, seed va PWA ikon skriptlari
tests/                Izolyatsiyalangan API va domain testlari
docs/                 TZ, dizaynlar va deploy yo‘riqnomasi
```

## Amaliy cheklovlar va keyingi ishlar

- Supabase cloud va Vercel deployment hali ushbu lokal build doirasida bajarilmagan; ulanish credentiallari kerak. Lokal DB integratsiyasi tekshirilgan, cloud integratsiyasi alohida tekshirilishi lozim.
- Kamera/GPS ruxsatlari va sifatini real Android/iPhone qurilmalarida pilotdan o‘tkazing. HTTPS kerak; localhost desktop uchun istisno.
- To‘liq oflayn ishlash/login yo‘q: PWA qobig‘i va yuborilmagan dalil drafti bor. Oflayn sessiyani qayta ochish, kech yuborilgan dars va yetishmagan dalil uchun admin bilan tuzatish jarayoni talab etiladi.
- Uzluksiz fon GPS, push, native APK/IPA build, MFA, yuz tanish va jonlilik tekshiruvi hali amalga oshirilmagan. Kamera/lokatsiya moduli native adapterga ajratishga tayyor; Capacitor qobig‘i hali qo‘shilmagan.
- Filial/xona/fan/guruhning to‘liq katalog CRUDsi o‘rniga hozir filial katalogi va jadvaldagi fan/guruh/xona maydonlari ishlaydi.
- Jadvaldan tashqari alohida overtime, 45 daqiqalik stavka birligi va alohida filialga kelish hodisasi hozir yo‘q; soatlik stavka 60 daqiqaga asoslanadi.
- Payroll `draft → locked` oqimi ishlaydi; alohida `reviewed` bosqichi hali ajratilmagan.
- Media retention, nizo holdi, rejalashtirilgan tozalash va avtomatik backup ishlarini productiondan oldin sozlash kerak. Hozir rasmlar avtomatik o‘chirilmaydi.
- API ro‘yxatlari 1000 ta davomat/dars, audit 200 ta bilan cheklangan; katta ishlab chiqarish hajmiga server pagination va filtrlar qo‘shilishi kerak.
- Eksport stream/queue emas; kichik va o‘rta pilot uchun sinovdan o‘tgan.
- Upload Node API orqali validatsiya qilinadi va Storagega yoziladi; bevosita browser signed-upload oqimi hali ajratilmagan.
- Bu pilot uchun ishlaydigan dastlabki versiya; TZdagi barcha production talablar bajarilgan degani emas.

