# Antigravity (Gemini) uchun tayyor ishlab chiqish topshirig‘i

Ushbu faylni loyiha konteksti sifatida biriktiring yoki to‘liq matnini Antigravity chatiga yuboring. Fayl mustaqil topshiriq: quyida amaldagi TZ ham to‘liq keltirilgan. Platformaning maxsus sozlama fayli yoki sintaksisi talab qilinmaydi.

## Sening vazifang

Sen ushbu loyihani ishlab chiquvchi full-stack muhandissan. “Davomat” nomli o‘quv markazi va maktab ustozlari uchun davomat hamda ish haqi hisoblash web ilovasini yarat. Faqat reja yoki maket bilan cheklanma: mavjud repositoryni tekshir, zarur kodlarni yoz, ishga tushir va asosiy oqimlarni tekshir.

Mahsulot tili — o‘zbekcha, lotin yozuvi. Foydalanuvchiga tushuntirishlar ham o‘zbekcha bo‘lsin. Kod identifikatorlari inglizcha bo‘lishi mumkin.

## 1. Talablar ustuvorligi

1. Ushbu topshiriqdagi qat’iy talablar va aniqlashtirishlar.
2. Quyida keltirilgan TZ v1.1.
3. Amaldagi kirish-admin-v1.1.png dizayn konsepti.
4. Qolgan dizaynlar faqat eski vizual ma’lumot: ulardagi QR, email yoki eski autentifikatsiya oqimini qaytarmang.

TZdagi texnik tanlovlarni sezilarli o‘zgartirishdan oldin sababini tushuntir. Oddiy UI va papka tuzilishi qarorlarini mustaqil hal qil. Ishlayotgan kodni tekshirmasdan almashtirma yoki foydalanuvchining o‘zgarishlarini yo‘qotma.

## 2. O‘zgarmas talablar

- Frontend: Vue 3 + TypeScript + Vite. React yoki Next.jsga o‘tkazma.
- Backend: Node.js + TypeScript; Vercel Functionsga mos REST API.
- Doimiy saqlash: Supabase PostgreSQL va private Storage.
- PWA: o‘rnatiladigan, mobilga mos web ilova. Arxitektura keyinchalik Capacitor Android/iOS uchun mos bo‘lsin.
- Kirishda faqat aynan 8 raqamli login va matnli parol so‘ralsin. Masalan: 00123456. Email va SMS OTP so‘ralmasin.
- Login string sifatida saqlansin; boshidagi nollar yo‘qolmasin. Login butun tizim bo‘yicha unique.
- Custom Node.js autentifikatsiyasi qo‘llansin. Supabase Authga o‘tish yoki foydalanuvchi uchun soxta email yaratish bilan talabni aylanib o‘tma.
- Foydalanuvchilarni admin yaratadi: profil rasmi, ism, familiya, lavozim, rol, filial, login, boshlang‘ich parol.
- Admin profilni, loginni, dars soatlarini tahrirlay olsin; parolni yangilasin va hisobni o‘chira olsin.
- Hisobni o‘chirish — soft delete: kirish va sessiyalar bekor bo‘ladi; eski davomat va oylik saqlanadi.
- QR kod, QR skaner, shtrix-kod va ularga tegishli kutubxona, ekran, endpoint yoki ma’lumot maydoni kerak emas.
- Xona, sinf/guruh va fan dars jadvalidan olinsin. GPS orqali aynan xonada ekanlik tasdiqlangan deb ko‘rsatilmasin.
- Dars boshlash va yakunlashda yangi selfi, lokatsiya va server vaqti yozilsin.
- Oylik faqat tasdiqlangan, yakunlangan darslarning haq to‘lanadigan to‘liq daqiqalaridan hisoblansin.
- UI tugmalari real backend amallarini bajarsin. Mock ma’lumot, localStorage yoki faqat frontenddagi hisob production saqlash o‘rnini bosmasin.
- Ushbu topshiriq MVPni yaratish uchun; Android/iOS storega chiqarish, yuz tanish, o‘quvchi davomati va bank orqali oylik yuborish MVPga kirmaydi.

## 3. Boshlash tartibi

1. Repository fayllari va mavjud loyiha yo‘riqnomalarini o‘qi; mavjud implementatsiya, dependency va ishga tushirish buyruqlarini aniqlagin.
2. Qisqa implementatsiya rejasi tuz. Uni yozishdan so‘ng darhol kodlashni boshlagin.
3. Mavjud ishlaydigan qismlarni saqla. Bo‘sh repository bo‘lsa frontend, API, shared turlar, migrations va testlar uchun tushunarli tuzilma yarat.
4. Kerakli kutubxonalarning amaldagi rasmiy hujjatlari va o‘zaro mos versiyalarini tekshir. Lockfile saqla.
5. Yetishmayotgan cloud credential yoki tashqi hisobni taxmin qilma. .env.example yarat; maxfiy qiymatlarni chatga yoki kodga yozma.
6. Credential bo‘lmasa mustaqil bajariladigan ishlarni davom ettir: local baza imkoniyati, migratsiyalar, UI, domain hisoblash va testlar. Tashqi integratsiya tekshirilmaganini yakunda aniq ko‘rsat.
7. “Tayyor” deb faqat real bajarilgan va tekshirilgan natijani ayt. Deployment bo‘lmasa deployed deb yozma.

## 4. Implementatsiya bosqichlari

### A. Poydevor va emailsiz kirish

- Vue ilova qobig‘i, responsive layout va Node API.
- Private user_accounts va auth_sessions, tashkilot/filial/rol modeli.
- 8 raqamli login, Argon2id parol hash, server sessiyasi, logout, majburiy birinchi parol almashish.
- Webda Secure/HttpOnly/SameSite cookie; CSRF/Origin tekshiruvi.
- IP va login bo‘yicha rate limit doimiy yoki ulashiladigan saqlash bilan; serverless jarayon RAMiga tayanma.
- API darajasida autentifikatsiya, rol va filial tekshiruvi. Faqat frontend route guard bilan cheklanma.
- Birinchi adminni server CLI/seed orqali bir marta xavfsiz yaratish yo‘riqnomasi. Productionda ommaviy default parol bo‘lmasin.

Qabul: haqiqiy DB bilan login/logout ishlaydi; bloklangan foydalanuvchi va noto‘g‘ri parol rad etiladi.

### B. Admin foydalanuvchilar va jadval

- Foydalanuvchilar ro‘yxati, qidirish/filtrlash, qo‘shish/tahrirlash formasi.
- Profil rasmi private Storagega yuklanadi; davomat selfilaridan ajratiladi.
- Ism, familiya, lavozim va tizim roli alohida maydonlar.
- Parol reseti barcha eski sessiyalarni bekor qiladi; saqlangan parol hech qachon qayta ko‘rsatilmaydi.
- O‘chirish tasdig‘i, soft delete va tarixni saqlash.
- Fan, guruh, xona, dars kunlari va boshlanish/tugash vaqti.
- Takroriy haftalik jadval, sanali darslar va ustoz/xona vaqt to‘qnashuvini tekshirish.

Qabul: admin yaratgan ustoz o‘z logini bilan kirib, o‘z jadvalini ko‘radi; boshqa filialga ruxsatsiz o‘ta olmaydi.

### C. Davomat va dalillar

- Bugungi darslar → dars tanlash → selfi/GPS → server tasdig‘i → faol taymer.
- Darsni boshlash, tanaffus, davom ettirish va yakunlash.
- Private media upload, serverda ownership va fayl validatsiyasi.
- Challenge faqat ichki server mexanizmi; foydalanuvchidan kod kiritish yoki skanerlash talab qilinmasin.
- Bir ustozga bitta ochiq sessiya, idempotency va tranzaksiyalar.
- UI serverda saqlanmaguncha muvaffaqiyat holatini ko‘rsatmasin.
- Oflayn draft, qayta yuborish, ruxsat rad etilishi, GPS aniqligi pastligi va upload uzilishi.

Qabul: refresh yoki ikki marta bosish darsni yo‘qotmaydi yoki ko‘paytirmaydi; dalillar DB/Storagega real yoziladi.

### D. Monitoring va tasdiqlash

- Admin monitoringi, filtrlar, dalillar paneli, pending navbati.
- Faol tabda 5 soniyali polling; yashirin tabda to‘xtatish/sekinlashtirish va qaytishda yangilash.
- Oxirgi yangilanish va ulanish xatosi aniq ko‘rsatiladi.
- Tuzatish so‘rovi, tasdiqlash/rad etish sababi va audit.
- Xona “jadvaldan olingan” deb ifodalansin, GPS bilan tasdiqlangan xona deb emas.

Qabul: ustoz hodisasi adminning ruxsatli ko‘rinishida paydo bo‘ladi; boshqa tashkilot dalili ochilmaydi.

### E. Oylik va eksport

- Hisoblash frontenddan mustaqil, server/domain funksiyasida bajariladi.
- Jadval va real interval kesishmasi, tanaffuslarni ayirish, to‘liq daqiqalar.
- Stavka versiyasi, bonus/ushlab qolish, draft/reviewed/locked.
- Locked snapshot o‘zgarmaydi; keyingi tuzatish alohida versiya/adjustment.
- Buxgalter ekranlari va real XLSX/CSV eksport; selfi/GPSga oddiy buxgalter kirishi yo‘q.
- Decimal hisob va CSV/XLSX formula injectiondan himoya.

Qabul: TZdagi 39 daqiqa = 39 000 so‘m misoli hamda eksport/UI/DB yig‘indilari mos.

### F. PWA, sinov va deployga tayyorlik

- Manifest, ikonka, service worker, oflayn qobiq va install yo‘riqnomasi.
- Maxfiy API javobi, selfi, parol/sessiya va signed URL service worker cachega tushmasin.
- Kamera/lokatsiya/session storage adapterlari Capacitor uchun ajratilsin.
- Vercel routelari, SPA fallback, Node runtime va env namunalari.
- SQL migration, seed, backup/restore va ishga tushirish READMEsi.
- Real qurilmada kamera/GPS sinovi bajarilmasa uni ochiq qolgan tekshiruv sifatida ko‘rsat.

## 5. Texnik aniqlashtirishlar

- Custom login bilan browser Supabase Data APIga to‘g‘ridan-to‘g‘ri murojaat qilmaydi. auth.uid() bizning sessiya tokenini avtomatik tushunadi deb taxmin qilma.
- Supabase Storage signed URLlarini Node API ruxsat tekshiruvidan keyin beradi. Maxfiy kalit clientga chiqmasin.
- DBga kirish uchun serverga mos connection pooling va cheklangan huquqli DB rolini tanla; serverless instansiyada uzoq yashovchi lokal holatga suyanma.
- Auth/account jadvallari private schema; biznes ma’lumotlari uchun organization_id majburiy. Exposed jadvallarda RLS va API darajasida avtorizatsiya saqlansin.
- Global unique login va immutable user_id alohida. Login tahrirlanganda eski login ishlamasin, faol sessiyalar bekor qilinsin.
- Parolni aynan yuborilgan matn sifatida tekshir; trim/lowercase qilib o‘zgartirma.
- Rasm resize/siqish qulaylik uchun clientda qilinishi mumkin, lekin server validatsiyasini almashtirmaydi.
- Dars soatlarini rejalashtirish va oylikdagi “stavka / 60 daqiqa” turli tushunchalar.
- “Kechikkan” faol dars bilan birga bo‘lishi mumkin. KPIlar kesishuvchi holatlarmi yoki o‘zaro ajratilganmi — UI labelida aniq bo‘lsin; sonlarni noto‘g‘ri yig‘ma.
- Tekshiruvdagi oylikni taxminiy deb ko‘rsat; tasdiqlangan jami summaga qo‘shma.
- Bu yerda “dars vaqti hisoblanadi” — start/end dalillari bo‘yicha davomiylik; ustozning butun vaqt xonada bo‘lganini texnik kafolatlash emas.

## 6. Majburiy tekshiruvlar

Build, TypeScript va tegishli lint ishlasin. Quyidagi xatti-harakatlar uchun unit/integration/E2E testlarni yoz va mavjud muhitda ishga tushir:

- Login validatsiyasi: 00123456, 7/9 raqam, harf, duplicate.
- Noto‘g‘ri parol, bloklangan hisob, resetdan keyingi eski sessiya.
- Admin foydalanuvchi yaratishi/tahrirlashi/o‘chirishi; tarixiy yozuv saqlanishi.
- Rol va tashkilot/filial bo‘yicha API hamda media ruxsatlari.
- Parallel start, retry va double-clickdan faqat bitta sessiya.
- Davomatning ruxsatli state transitionlari.
- Jadval kesishmasi, tanaffus, 39 daqiqalik misol, stavka versiyasi va oy chegarasi.
- Pending yozuv payrollga kirmasligi va locked report o‘zgarmasligi.
- Eksport summalari va formula injection.
- Oflayn draft server tasdig‘i deb chiqmasligi.

Tashqi xizmatga bog‘liq test uchun credential yo‘q bo‘lsa testni o‘tdi deb ko‘rsatma. Mock testlar bilan real integratsiya testlarini ajratib hisobot ber.

## 7. Natijani topshirish

Yakuniy javob qisqa va dalilli bo‘lsin:

1. Nima ishga tushdi va qaysi ekran/oqimlar tayyor.
2. Loyihani lokal ishga tushirish uchun aniq buyruqlar.
3. Kerakli env o‘zgaruvchilari nomlari — maxfiy qiymatlarsiz.
4. Test/build natijalari; bajarilmagan tekshiruvlar.
5. Tashqi sozlama yoki deploy uchun qolgan ishlar.
6. O‘zgargan asosiy fayllar va README havolasi.

Talablarni “keyin qilinadi” deb qoldirib to‘liq tayyor demagin. Muhit to‘sqinlik qilsa qolgan mustaqil ishlarni yakunla va aniq bloklovchi omilni yoz.

---

# To‘liq mahsulot talablari — TZ v1.1

Quyidagi bo‘limlar yuqoridagi bajarish topshirig‘i bilan birga qo‘llanadi.

# DAVOMAT — texnik topshiriq

Versiya: 1.1 · Sana: 19.10.2026 · Til: o‘zbekcha (lotin)

## 1. Maqsad va chegaralar

Maktab va o‘quv markazlarida ustozning qaysi filial, xona, sinf/guruh va fan bo‘yicha dars boshlaganini, tanaffuslarini va dars tugaganini qayd etish. Har bir boshlash/yakunlash hodisasida vaqt, lokatsiya va selfi saqlanadi. Admin jarayonni kuzatadi; tasdiqlangan dars vaqtiga ko‘ra oylik hisoblanib, buxgalterga eksport qilinadi.

Ushbu hujjat ishlab chiqish uchun TZ hisoblanadi. Dizayn rasmlari konsept bo‘lib, ishlaydigan ilova yoki yakuniy interfeys emas. Rasmdagi shaxslar va raqamlar namunaviy.

MVP: ustoz davomatini yuritish, jadval, dalillar, tekshiruv, daqiqalik oylik va eksport. O‘quvchilar davomati, ota-ona kabineti, to‘lov qabul qilish, avtomatik yuz tanish, soliq hisoblash va bankka pul o‘tkazish MVPga kirmaydi.

Boshlang‘ich rejalashtirish taxmini: 1 tashkilot, bir nechta filial, 100 tagacha ustoz, bir vaqtda 50 ta faol foydalanuvchi. Tuzilma keyinchalik bir nechta tashkilotni ajratib ishlatishga tayyor bo‘ladi. Bu bepul tarif quvvatiga berilgan kafolat emas.

## 2. Texnologiyalar va arxitektura

| Qism | Tanlov |
|---|---|
| Frontend | Vue 3, TypeScript, Vite, Vue Router, Pinia |
| UI | Tailwind CSS, qayta ishlatiladigan Vue komponentlari |
| PWA | Manifest, service worker, oflayn ilova qobig‘i |
| Backend | Node.js + TypeScript, Vercel Functions, REST API /api/v1 |
| Baza | Supabase PostgreSQL, SQL migratsiyalar |
| Login | Node.js autentifikatsiyasi; 8 raqamli login + matnli parol, hisobni admin yaratadi |
| Selfilar | Supabase Storage, private bucket |
| Monitoring | Node.js API orqali faol oynada 5 soniyali polling; qayta urinishda 30 soniya |
| Hisobot | XLSX va UTF-8 CSV |
| Mobilga o‘tish | Capacitor orqali Android/iOS qobig‘i |
| Deploy | Vue statik build va Node.js API Vercelda |

Oqim: Vue PWA → Node.js API → PostgreSQL. Rasm API bergan qisqa muddatli upload ruxsati orqali bevosita Storagega yuboriladi. API rasm mavjudligi va foydalanuvchiga tegishliligini tekshirgach, davomatni yakuniy yozadi. Monitoring so‘rovlari tashkilot va filial ruxsati bilan cheklanadi. Barcha biznes ma’lumotlari Node.js API orqali olinadi; clientdan Supabase Auth, Data API va Realtime MVPda ishlatilmaydi.

Backend stateless: davom etayotgan dars va taymer holati bazada saqlanadi. Telefon yoki server jarayoni qayta ishga tushganda dars yo‘qolmasligi kerak. Har soniyada API chaqirish yoki dars davomida funksiyani ochiq ushlab turish talab etilmaydi.

## 3. Rollar va ruxsatlar

| Rol | Vakolat |
|---|---|
| Tashkilot egasi | Filiallar, adminlar, siyosatlar, tariflar, barcha hisobotlar |
| Filial administratori | O‘z filialidagi ustozlar, jadval, davomat, dalillar, tuzatishlarni tasdiqlash |
| Ustoz | O‘z jadvali, darsni boshlash/yakunlash, o‘z davomati va oyligi, tuzatish so‘rovi |
| Buxgalter | Tasdiqlangan vaqt, stavka, oylik hisoboti va eksport; selfi/GPSga odatiy kirish yo‘q |

Ochiq ro‘yxatdan o‘tish o‘chiriladi. Telefon raqami profil maydoni; SMS OTP alohida xizmat va xarajat bo‘lgani sabab MVPga kiritilmaydi. Rol va filial a’zoligi server boshqaradigan jadvaldan tekshiriladi. Ustoz rolini o‘zi o‘zgartira olmaydi. Hisob bloklanganda sezgir API so‘rovlari mavjud token bilan ham rad etiladi.

## 4. Asosiy ma’lumotlar

### 4.1 Admin orqali foydalanuvchilarni boshqarish

Admin “Foydalanuvchi qo‘shish” formasida profil rasmi, ism, familiya, lavozim, tizim roli, filial, 8 raqamli login va boshlang‘ich parolni kiritadi. Rasm JPEG/WebP/PNG, 2 MBgacha; server tekshiradi va private Storagega joylaydi. Profil rasmi har darsdagi selfidan alohida saqlanadi. Lavozim erkin matn yoki ma’lumotnomadan tanlanadi (masalan “Matematika ustozi”); tizim roli ruxsatlarni boshqaradi.

Admin dars kunlari, boshlanish/tugash vaqti, fan, sinf/guruh va xonani belgilaydi; haftalik yuklama avtomatik chiqariladi. 45 yoki 60 daqiqalik dars davomiyligi jadvalga mos olinadi, oylik stavka birligi alohida sozlama bo‘lib qoladi. Admin keyin profil, rasm, login, lavozim, rol va kelgusi dars jadvalini tahrirlaydi, yangi parol beradi yoki hisobni o‘chiradi. Yakunlangan darslarning tarixiy ma’lumotlari jadval tahriridan o‘zgarmaydi.

“O‘chirish” tasdiqlash oynasidan keyin hisobni arxivlaydi (soft delete), barcha sessiyalarni bekor qiladi va loginni bloklaydi. Davomat va oylik tarixi saqlanadi. Faol dars yoki kelgusi jadval bo‘lsa, admin ularni yakunlash, boshqa ustozga o‘tkazish yoki bekor qilishni hal qiladi. O‘chirilgan login boshqa odamga berilmaydi. Oxirgi faol tashkilot egasini o‘chirish yoki uning rolini tushirish taqiqlanadi. Filial admini faqat o‘z vakolati ichida hisob ochadi; tashkilot egasi rolini bera olmaydi.

### 4.2 Emailsiz autentifikatsiya

Kirish oynasida faqat “Login (8 raqam)” va “Parol” maydonlari, parolni ko‘rsatish/yashirish va “Kirish” tugmasi bo‘ladi. Email, OTP va ochiq ro‘yxatdan o‘tish so‘ralmaydi. Login — aynan 8 ta ASCII raqamdan iborat string: `^[0-9]{8}$`; masalan `00123456`. Boshlang‘ich nollar saqlanadi, number turiga aylantirilmaydi. Input type=text, inputmode=numeric, maxlength=8; server ham tekshiradi. Login butun tizim bo‘yicha unique, chunki kirishda tashkilot tanlash talab qilinmaydi.

Parol — matnli maxfiy qiymat; 8–128 belgi, harf/raqam/maxsus belgilar qabul qilinadi, katta-kichik harf farqlanadi. Admin yaratadi yoki yangisini belgilaydi. Saqlangan parol admin uchun qayta ochilmaydi; faqat yangilanadi. Birinchi kirishda yoki admin resetidan keyin ustozdan parolini almashtirish talab etiladi. Unutilsa “Adminga murojaat qiling” ko‘rsatiladi; email orqali tiklash yo‘q.

Node.js parolni Argon2id bilan saltli hash ko‘rinishida saqlaydi; ochiq parol API javobi, audit yoki logga tushmaydi. Kirishda umumiy “Login yoki parol noto‘g‘ri” xabari, IP va login kesimida urinish cheklovi ishlaydi. Web sessiyasi tasodifiy tokenli Secure/HttpOnly/SameSite cookie orqali, cookie tokenining hashi private DBda saqlanadi; mutatsiyalarda CSRF/Origin tekshiruvi bo‘ladi. Sessiya muddati 7 kun, maxfiy o‘zgarishlar uchun qayta autentifikatsiya; reset/bloklash/o‘chirishda barcha sessiyalar bekor qilinadi. Native ilovada xuddi shu API uchun sessiya tokeni secure storageda saqlanadi. Parol yoki login tahriri auditga sir qiymatlarsiz yoziladi.

Autentifikatsiya va serverga xos jadvallar exposed bo‘lmagan private schemada saqlanadi. Browser PostgreSQLga bevosita ulanmaydi. Node.js har so‘rovda sessiya, hisob holati, rol va tashkilot/filialni tekshiradi; Supabase auth.uid() bilan ishlaydigan policy custom sessiyani avtomatik tanimaydi.

Tashkilot → filial → xona. Fan, sinf/guruh, ustoz va dars jadvali alohida yuritiladi. Sinf/guruh misoli: “9-A” yoki “IELTS 18:00”; xona misoli: “204-xona”. Ular bir maydonga birlashtirilmaydi.

Jadvalda ustoz, filial, xona, guruh, fan, mavzu (ixtiyoriy), sana, boshlanish/tugash vaqti bo‘ladi. Haftalik takroriy jadval aniq sanali darslarga aylantiriladi. Bayram, bekor qilingan dars, ustoz almashtirish va xona o‘zgarishi audit bilan boshqariladi. Bir ustoz yoki xonada bir vaqtda ikki dars rejalashtirish rad etiladi.

## 5. Ustozning ishlash ssenariysi

1. Login qiladi; bugungi darslari, faol darsi va tasdiqlanmagan yozuvlarini ko‘radi.
2. Jadvaldagi darsni tanlaydi. Fan, guruh va xona oldindan to‘ldiriladi.
3. “Darsni boshlash”ni bosadi; serverdan qisqa muddatli bir martalik challenge oladi.
4. Jadvaldagi xona va sinfni ko‘radi, lokatsiyaga ruxsat beradi va kamera orqali selfi oladi.
5. Dalillar yuklanadi. Server token, jadval, xona, lokatsiya, dalil va takroriy so‘rovni tekshiradi.
6. Muvaffaqiyatli yozuvdan keyin server boshlanish vaqtini qaytaradi. Ekranda taymer ko‘rinadi.
7. “Tanaffus” va “Davom ettirish” orqali haq to‘lanmaydigan interval qayd qilinadi. Ularda server vaqti saqlanadi; qo‘shimcha selfi MVPda shart emas.
8. “Darsni yakunlash”da yangi lokatsiya va selfi olinadi. Server tugash vaqtini yozadi va davomiylikni hisoblaydi.
9. Ustoz “Saqlangan”, “Tekshiruvda” yoki aniq xatolik sababini ko‘radi. Mahalliy saqlangan yozuv server tasdig‘i sifatida ko‘rsatilmaydi.

Filialga kelish alohida arrival hodisasi sifatida shu dalillar bilan qayd etilishi mumkin; u darsni boshlamaydi va avtomatik oylik vaqtiga kirmaydi.

## 6. Vaqt, lokatsiya va selfi qoidalari

### 6.1 Vaqt

Bazada UTC timestamptz, foydalanuvchiga Asia/Tashkent ko‘rsatiladi. Asosiy vaqt serverniki; qurilma vaqti faqat diagnostika uchun. Dalillar yuborilib, operatsiya qabul qilingan vaqt hisob boshlanishi hisoblanadi. Yuklash cho‘zilishi tufayli tafovut bo‘lsa, ustoz tuzatish so‘rovi yuboradi.

Taymer server vaqti bilan sinxron ko‘rsatiladi. Brauzer yopilishi yoki telefon uyquga ketishi darsni to‘xtatmaydi. Bir ustozda ko‘pi bilan bitta active/paused sessiya bo‘ladi. Parallel so‘rovlar bazadagi cheklov va tranzaksiya bilan himoyalanadi.

### 6.2 Lokatsiya va xona

Saqlanadi: latitude, longitude, accuracy_m, captured_at_client, received_at_server, filial markazidan distance_m, geofence natijasi, tekshiruv sababi.

Pilot uchun sozlanadigan standart: radius 150 m, maksimal aniqlik xatosi 50 m, lokatsiya yoshi 60 soniyadan oshmasin. Bu qiymatlar har filialda real qurilmalar bilan sinab moslanadi. Radiusdan tashqari yoki aniqligi yomon holat “Tekshiruvda”; kamera/GPS ruxsati yo‘q holat oddiy tasdiqlashdan o‘tmaydi, sababli qo‘lda so‘rovga yo‘naltiriladi.

Xona va sinf/guruh admin belgilagan jadvaldan olinadi. Ekranda “Xona jadvaldan olindi” deb ko‘rsatiladi. Xona o‘zgarsa admin jadvalni tahrirlaydi yoki ustoz tuzatish so‘rovi beradi. GPS filial yaqinligini baholaydi; xona yoki qavatni ishonchli tasdiqlamaydi. QR kod va skanerlash loyihadan chiqarilgan.

Brauzer GPSi va kamera tasviri mutlaq firibgarlikdan himoya emas. MVP dalillar va admin tekshiruvi beradi; aniq xonada doimiy bo‘lish yoki yuz haqiqiyligini kafolatlamaydi. Uzluksiz fon lokatsiya kuzatuvi talab qilinmaydi.

### 6.3 Selfi

Boshlash va tugatishda jonli kamera UI ishlatiladi; odatiy galereyadan tanlash yo‘q. Kamera preview, qayta olish va tasdiqlash mavjud. Yuzni avtomatik identifikatsiya qilish va liveness MVPga kirmaydi.

Maqsadli hajm 150–250 KB; server limiti 1 MB, JPEG/WebP; server fayl mazmuni, o‘lchami va dekodlanishini tekshiradi. EXIF tozalanadi. Object path taxmin qilib ochib bo‘lmaydigan ID bilan tashkilot/ustoz kesimida ajratiladi. Bir dalil boshqa hodisaga qayta biriktirilmaydi. Ko‘rish uchun ruxsat tekshirilgan, 60 soniyali signed URL ishlatiladi.

Upload yarim yo‘lda uzilsa dars “tasdiqlangan” bo‘lmaydi. Tugallash so‘rovi idempotent; bir xil kalit bilan retry yangi sessiya ochmaydi. Bog‘lanmagan uploadlar 24 soatdan so‘ng tozalanadi.

## 7. Holatlar va istisnolar

Sessiya holatlari: active → paused → active → completed; kerak bo‘lsa cancelled. Tasdiqlash holati mustaqil: pending / approved / rejected. “Kechikkan” alohida flag; “Darsda” tasdiqlangan degani emas.

- Yaxshi dalilli yakunlangan sessiya tashkilot siyosatiga ko‘ra avtomatik approved bo‘lishi mumkin; standart pilotda avtomatik tekshiruvdan o‘tadi.
- Shubhali GPS, oflayn hodisa, jadvaldan tashqari dars yoki yetishmagan dalil pending bo‘ladi; oylikka kirmaydi.
- Tugatish unutilsa, jadval tugaganidan 30 daqiqa o‘tib overdue belgisi ko‘rsatiladi. Ish haqi cheksiz oshmaydi; admin yakun vaqtini sabab bilan tasdiqlamaguncha sessiya oylikka kirmaydi.
- Jadvaldan tashqari dars va o‘rinbosar ustoz admin tasdig‘ini talab qiladi.
- Ruxsat rad etilsa sozlamani yoqish yo‘riqnomasi va “Tuzatish so‘rovi” tugmasi bo‘ladi.
- Telefon almashtirilganda faol sessiya serverdan olinadi; ikkinchi qurilmadagi boshlash rad etiladi.
- Ustoz original davomatni o‘chira olmaydi. Tuzatish sabab, eski/yangi qiymat va tasdiqlovchi bilan versiyalanadi.

## 8. Oylikni daqiqagacha hisoblash

MVP modeli: tasdiqlangan darsning haq to‘lanadigan har to‘liq daqiqasi. Har ustozga kuchga kirish sanasi bilan soatlik stavka belgilanadi. Standart 1 soat = 60 daqiqa; akademik 45 daqiqalik soat alohida sozlama orqali va aniq nom bilan qo‘llanadi.

Standart siyosat: haq to‘lanadigan interval — haqiqiy dars va jadval intervalining kesishmasi. Jadvaldan oldingi va keyingi daqiqalar faqat alohida tasdiqlangan overtime bo‘lsa qo‘shiladi. Tanaffuslar shu interval ichida ayiriladi; interval takrorlari birlashtirilib, ikki marta to‘lanmaydi.

```text
S = max(actual_start, scheduled_start)
E = min(actual_end, scheduled_end)
payable_seconds = max(0, E - S - union(unpaid_breaks ∩ [S,E]))
payable_minutes = floor(payable_seconds / 60)
lesson_amount = payable_minutes × hourly_rate / 60
month_amount = round(sum(lesson_amount) + bonuses - approved_deductions)
```

Aniqlik siyosati: sekundlar xom holatda saqlanadi; har darsning to‘liq daqiqasi olinadi, qolgan sekundlar boshqa darsga ko‘chmaydi. Summalar decimal/numeric bilan hisoblanadi; yakuniy oy summasi eng yaqin butun so‘mga yaxlitlanadi. Float ishlatilmaydi. Har bir report satri daqiqa va qo‘llangan stavkani ko‘rsatadi.

Misol: jadval 09:00–09:45, boshlash 09:03:20, tugatish 09:46:10, hisob ichidagi tanaffus 120 soniya. Hisob: 2500 − 120 = 2380 soniya → 39 daqiqa. 60 000 so‘m/soatda 39 000 so‘m. 09:45 dan keyingi vaqt qo‘shimcha tasdiqsiz to‘lanmaydi.

Kechikish flagi uchun standart chegara 5 daqiqa; bu faqat ko‘rsatkich, yetishmagan daqiqani to‘lanadigan vaqtga qo‘shmaydi. Avtomatik jarima yo‘q. Bonus/ushlab qolish faqat vakolatli shaxs, sabab va audit bilan kiritiladi.

Stavka darsning rejalashtirilgan boshlanishida amal qilgan versiyadan olinadi va hisobga snapshot qilinadi. Stavka tahriri oldin yopilgan oyni o‘zgartirmaydi. Yarim tundan yoki oy chegarasidan o‘tgan vaqt mahalliy sana bo‘yicha kesiladi; yaxlitlashdan qoladigan soniyalar yakuniy segmentga taqsimlanib, jami dars daqiqasiga tengligi saqlanadi.

Hisobot holati: draft → reviewed → locked. Pending sessiyalar mavjud bo‘lsa yopish bloklanadi yoki ular chiqarib tashlangani aniq ro‘yxat bilan vakolatli tasdiqlanadi. Locked hisobot o‘zgarmas snapshot; keyingi tuzatish yangi versiya yoki keyingi oy adjustmenti orqali. Bu hisoblangan yalpi haq; soliq va sof to‘lov buxgalteriya tizimida.

## 9. Admin va buxgalter interfeysi

Admin monitoringi: bugungi rejalashtirilgan ustozlar, darsda, kechikkan, kutilmoqda, tugagan va tekshiruvdagi yozuvlar. Jadval ustunlari: ustoz, fan, guruh, xona, reja, real vaqt, davomiylik, holat. Sana, filial, ustoz, xona va holat bo‘yicha filtrlar.

Davomat tafsiloti: boshlash/yakunlash selfilari, lokatsiya, aniqlik, filialgacha masofa, jadvaldagi xona, vaqtlar, tanaffuslar va audit. Admin xarita dalilini ochadi; xarita provayderi keyin tanlanadi, MVP koordinata va masofa bilan ham ishlashi kerak. Yangilanish uzilsa oxirgi yangilanish va qayta ulanish holati ko‘rsatiladi.

Buxgalter sahifasi: oy, filial, ustoz, to‘lanadigan daqiqa, soat-daqiqa formati, stavka versiyasi, hisoblangan summa, bonus, ushlab qolish, yakuniy summa, tasdiqlash holati. Har satrdan darslar kesimidagi hisob ochiladi, selfi/GPS ochilmaydi.

XLSX/CSV ikki kesimda: oylik yig‘ma va darslar tafsiloti. Eksportda tashkilot, oy, timezone, report ID, versiya, yaratilgan vaqt, tasdiqlovchi bo‘ladi. Formula injection oldi olinadi; eksport joriy filtr va report snapshotiga mos keladi. Har yuklash auditga yoziladi. Oddiy eksport payrollni bankka yubormaydi.

## 10. Baza modeli

Barcha biznes jadvallarida UUID, organization_id, created_at; o‘zgaruvchi obyektlarda updated_at/version. Bog‘lanishlarda boshqa tashkilot IDlarini ulashga DB darajasida yo‘l qo‘yilmaydi.

| Jadval | Muhim ustunlar |
|---|---|
| organizations | name, timezone, attendance_policy_version |
| private.user_accounts | id, login varchar(8) UNIQUE, password_hash, must_change_password, status, deleted_at |
| private.auth_sessions | user_id, token_hash, expires_at, revoked_at |
| memberships | user_id, organization_id, role, status |
| membership_branches | membership_id, branch_id |
| user_profiles | user_id, first_name, last_name, position, avatar_path, phone (ixtiyoriy), employee_code |
| branches | name, latitude, longitude, radius_m, max_accuracy_m |
| rooms | branch_id, name, active |
| groups / subjects | name, active |
| schedule_templates | teacher_id, weekdays, local_time, validity |
| lessons | teacher_id, branch_id, room_id, group_id, subject_id, planned_start/end, status |
| attendance_sessions | teacher_id, lesson_id, state, approval_status, start/end_at, policy_version |
| attendance_events | session_id, type, server_at, client_at, idempotency_key, location_id, media_id |
| location_evidence | coordinates, accuracy_m, distance_m, verdict |
| media_evidence | owner_id, storage_path, mime, bytes, hash, expires_at |
| break_intervals | session_id, start_at, end_at |
| correction_requests | session_id, proposed_values, reason, status, reviewer_id |
| teacher_rates | teacher_id, valid_from/to, amount, unit_minutes, currency |
| payroll_runs | period, version, state, policy_snapshot, approved_by |
| payroll_items | run_id, teacher_id, minutes, rate_snapshot, adjustments, total |
| payroll_item_lessons | item_id, session_version, calculated_seconds/minutes, amount |
| audit_logs | actor_id, action, entity, before/after, reason, created_at |

Indekslar: organization_id + sana, filial + sana, teacher_id + start_at, approval_status; FK ustunlari. Unique: organization_id + employee_code, actor + idempotency_key; ustozning ochiq sessiyasiga partial unique index. Stavka davrlari kesishishi rad etiladi. Hodisalar append-only; tuzatish alohida auditli versiya. Oylik va davomat hisoblash tranzaksiyada bajariladi.

## 11. API shartnomasi

| Endpoint | Vazifa |
|---|---|
| GET /api/v1/me | Rol, profil, filiallar |
| POST /api/v1/auth/login | 8 raqamli login va parol orqali sessiya yaratish |
| POST /api/v1/auth/logout | Joriy sessiyani bekor qilish |
| POST /api/v1/auth/change-password | Eski parolni tekshirib parolni almashtirish |
| GET, POST /api/v1/users | Admin: foydalanuvchilar ro‘yxati va yaratish |
| PATCH /api/v1/users/:id | Admin: profil, login, lavozim, rol va filialni tahrirlash |
| POST /api/v1/users/:id/reset-password | Admin: yangi vaqtinchalik parol va sessiyalarni bekor qilish |
| DELETE /api/v1/users/:id | Admin: hisobni arxivlash va kirishni bloklash |
| GET /api/v1/lessons?date=... | Ruxsatli jadval |
| POST /api/v1/evidence/challenge | Qisqa muddatli challenge va upload ruxsati |
| POST /api/v1/attendance/start | Dalillarni tekshirish va darsni boshlash |
| POST /api/v1/attendance/:id/pause | Tanaffus |
| POST /api/v1/attendance/:id/resume | Davom ettirish |
| POST /api/v1/attendance/:id/finish | Yangi dalillar bilan yakunlash |
| GET /api/v1/attendance | Filtrli/paginatsiyali ro‘yxat |
| POST /api/v1/corrections | Tuzatish so‘rovi |
| POST /api/v1/corrections/:id/review | Tasdiqlash/rad etish va sabab |
| GET /api/v1/monitoring | Admin holatlari |
| POST /api/v1/payroll/calculate | Draft hisoblash |
| POST /api/v1/payroll/:id/lock | Versiyani yopish |
| GET /api/v1/payroll/:id/export | XLSX/CSV |
| CRUD /api/v1/{teachers,branches,rooms,groups,subjects,lessons,rates} | Vakolatli boshqaruv |

Mutatsiyalarda Idempotency-Key; start/finishda challenge_id, lesson/session ID, location, media_id; xona serverda jadvaldan olinadi. Server actorni tokendan oladi, client yuborgan teacher_idga ishonmaydi. Xatolar: code, message_uz, request_id, field_errors. Masalan ALREADY_ACTIVE, LOCATION_UNCERTAIN, MEDIA_MISSING, REPORT_LOCKED. Xato yoki timeoutdan keyin client server holatini tekshirib retry qiladi.

## 12. PWA va mobilga tayyorlik

Responsive diapazon: 360 px mobil, 768 px planshet, 1440 px desktop. PWA manifest, 192/512 ikonka, maskable ikonka, standalone display, HTTPS va install yo‘riqnomasi. Push bildirishnomalar MVPning majburiy qismi emas.

Oflayn: ilova qobig‘i va minimal bugungi jadval ko‘rinadi. Draft dalil IndexedDBga qisqa muddat saqlanishi mumkin, lekin “Yuborilmagan” deb belgilanadi. Oflayn vaqt avtomatik tasdiqlanmaydi; internet qaytganda received_at alohida yozilib admin tekshiradi. Fon sinxronizatsiyasi kafolatlanmaydi, “Qayta yuborish” tugmasi shart. Logoutda lokal shaxsiy kesh va draftlar haqida ogohlantirib tozalash kerak; yuborilmagan yozuv yo‘qolishi aniq aytiladi.

Service worker selfi, signed URL, token, payroll va maxfiy API javoblarini keshlamaydi. Kamera, lokatsiya, secure storage va notification imkoniyatlari adapterlar orqali ajratiladi. Web adapterlar keyinchalik Capacitor native adapterlari bilan almashadi. Umumiy domain/types/API client UI komponentlardan ajratiladi.

Capacitor Vue kodini qayta ishlatishga yordam beradi, ammo bir tugmali tayyor store eksporti emas: Android/iOS ruxsatlari, secure token saqlash, signing, build, qurilma testlari va store talablari alohida bajariladi. iOS build uchun tegishli Apple ishlab chiqish muhiti kerak.

## 13. Xavfsizlik va saqlash

Public schema jadvallarida RLS; tashkilot, filial va egalik tekshiruvi. Ustozga oylik/approval/server vaqtini bevosita yozish taqiqlanadi. Service-role/secret kalit frontendga chiqmaydi. Server privileged kalit bilan ishlasa har operatsiyada tashkilot va rolni o‘zi tekshiradi; RLS uni avtomatik himoyalaydi deb taxmin qilinmaydi. Viewlarda RLSni chetlab o‘tmaslik tekshiriladi.

Storage private, qisqa signed URL, o‘qish/yuklashda ownership. Login va uploadga rate limit, schema validation, xavfsiz xato matnlari, loglarda token/selfi/aniq koordinatani chiqarishdan saqlanish. Admin/buxgalter uchun MFA tavsiya etiladi. Auditni oddiy admin o‘chirishi yoki tahrirlashi mumkin emas.

Pilot taklifi: selfi va aniq GPS 90 kun; nizo bilan bog‘liq dalillar alohida hold bilan saqlanadi. Hisoblangan daqiqalar va payroll snapshotlari uchun saqlash muddati tashkilot siyosati va tegishli talablarga ko‘ra ishga tushirishdan oldin belgilanadi. 90 kun qonuniy muddat haqidagi da’vo emas. Xodimga yig‘iladigan ma’lumot, maqsad, kiruvchi rollar va muddat tushuntiriladi. O‘zbekiston uchun shaxsiy ma’lumotlarni joylashtirish talablari va tanlangan cloud region mosligi alohida tekshirilib, production qarori olinadi.

Zaxira: DB va Storage obyektlari alohida backup qilinadi; DB dump selfilarni o‘z ichiga olmaydi. Free tarifda avtomatik backup bor deb hisoblanmaydi. Pilot maqsadi RPO 24 soat, RTO 8 soat; bu maqsadlar backup va qayta tiklash mashqi bilan tekshiriladi.

## 14. Dizayn talablari

Uslub: och fon, to‘q ko‘k matn, teal asosiy tugmalar, orange tekshiruv holatlari. Ranglar: #F5F7FA, #142638, #0D9488, #D97706. Asosiy shrift Inter yoki tizim sans-serif; kamida 16 px asosiy mobil matn, kamida 44 px sensor tugma.

Mobil ekranlar: login; bugungi jadval; kamera/GPS tasdiqlash; davom etayotgan dars; tarix/tafsilot; oylik; profil; tuzatish so‘rovi. Pastki navigatsiya: Bugun, Tarix, Oylik, Profil.

Desktop ekranlar: monitoring; davomat dalillari paneli; foydalanuvchilar va profil tahriri; jadval; filial/xonalar; stavkalar; tekshiruv navbati; oylik; audit/sozlamalar. Barcha ekranlarda loading, empty, error, permission denied va offline holatlar loyihalanadi. Status faqat rang bilan ifodalanmaydi; klaviatura navigatsiyasi, label va ko‘rinadigan focus mavjud bo‘ladi.

## 15. Deploy va xarajat cheklovlari

Frontend build Vercel CDNda, /api/v1 Node.js funksiyalarida. API routelari SPA fallbackdan oldin ishlaydi. Supabase doimiy DB/Storage beradi. Development, preview va production ma’lumotlari ajratiladi; preview production dalillariga ulanmaydi. SQL migratsiyalar deploydan oldin sinovdan o‘tkaziladi; orqaga mos o‘zgarish va rollback rejasi bo‘ladi.

Frontend Node.js APIga ulanadi; Storage uchun API bergan qisqa muddatli URLdan foydalanadi. Server secretlari Vercel envda turadi. Region baza bilan yaqin tanlanadi. Health endpoint DB holatini xavfsiz tekshiradi. Katta eksport paginatsiya/chunk bilan ishlaydi; fon vazifalarining natijasi DBga yoziladi.

19.10.2026 kuni ko‘rilgan rasmiy tariflar: Supabase Free 500 MB DB, 1 GB Storage; faolsizlikdan keyin pauza va backup cheklovlari mavjud. Masalan 20 ustoz × 4 dars × 22 kun × 2 selfi × 200 KB ≈ 704 MB/oy; 90 kunlik selfi taxminan 2.1 GB. Shuning uchun bepul baza pilot uchun yetishi mumkin, ammo selfi arxivi uchun doimiy bepul ishlash va’da qilinmaydi. Saqlash 70/85/95 foizga yetganda admin ogohlantiriladi; limit sabab yo‘qolgan dalil tasdiqlangan deb ko‘rsatilmaydi. [Supabase pricing](https://supabase.com/pricing)

Vercel Hobby shaxsiy, notijorat foydalanish bilan cheklangan. Tijorat o‘quv markazi uchun mos pullik tarif rejalashtiriladi. Narx va limitlar deploy vaqtida qayta tekshiriladi. [Vercel Hobby shartlari](https://vercel.com/docs/plans/hobby)

## 16. Qabul mezonlari va testlar

1. Ustoz bugungi darsni tanlab xona, guruh, fan, selfi, lokatsiya va server vaqti bilan saqlay oladi.
2. Start tugmasi ikki marta yoki ikki qurilmada bosilganda bitta faol sessiya yaratiladi.
3. Boshqa ustoz/tashkilot IDsi bilan API va Storagega murojaat ruxsatsiz ma’lumot bermaydi.
4. Telefon soati o‘zgartirilishi hisoblangan vaqtga ta’sir qilmaydi; refreshdan keyin taymer tiklanadi.
5. GPS xatosi, ruxsat rad etilishi va upload uzilishi tushunarli holat beradi.
6. Tanaffus, 39 daqiqalik misol, overtime, stavka almashuvi, oy chegarasi va yaxlitlash avtomatik unit testlarda tekshiriladi.
7. Tugallanmagan, rejected va pending sessiyalar tasdiqlangan oylikka kirmaydi.
8. Locked report eski summani saqlaydi; tuzatish yangi versiya/audit bilan chiqadi.
9. Eksportdagi jami UI va DB snapshotiga teng; formula sifatidagi foydalanuvchi matni bajarilmaydi.
10. Oflayn yozuv online tasdiq sifatida ko‘rinmaydi; retry takror yozuv yaratmaydi.
11. Monitoring normal ulanishda hodisani maqsadli 5 soniya ichida, fallbackda 30 soniya ichida ko‘rsatadi.
12. 50 parallel foydalanuvchida oddiy API uchun p95 maqsad 2 soniya (media upload va cold start alohida o‘lchanadi); 4Gda asosiy ekran maqsadi 3 soniya. Pilotda o‘lchanadi, tarif kafolati emas.
13. Android Chrome va iPhone Safari/PWAda kamera, lokatsiya, qaytish/uyqu va qayta ulanish real qurilmada tekshiriladi.
14. DB hamda media backupdan tiklash sinovi o‘tadi; retention nizo holatidagi dalilni o‘chirmaydi.
15. Admin rasm, ism, familiya, lavozim, dars jadvali, login va parol bilan foydalanuvchi yaratadi; keyin tahrirlash va o‘chirish ishlaydi.
16. `00123456` loginidagi nollar saqlanadi; 7/9 raqamli, harfli yoki takror login rad etiladi. Email hech bir kirish yoki tiklash oynasida talab qilinmaydi.
17. Parol reseti va hisob o‘chirilishi eski sessiyalarni bekor qiladi; parol hashdan tashqari saqlanmaydi. Boshqa filial foydalanuvchisini tahrirlash vakolatsiz rad etiladi.
18. Davomat oqimida skaner yoki kod talabi yo‘q; xona jadvaldan olinadi, selfi/GPS/server vaqti bilan yozuv saqlanadi. Hisob o‘chirilgach tarixiy oylik va davomat saqlanadi.

## 17. Ish bosqichlari va topshiriladigan natijalar

1. Qoidalar va UX: stavka birligi, radius, retention, tasdiqlash siyosati; maketlar va ekran holatlari.
2. Poydevor: repo, Vue PWA, Node API, login/parol autentifikatsiyasi, Supabase DB/RLS, migratsiya va seed.
3. Davomat: jadval, kamera, GPS, session state, offline/retry.
4. Admin: monitoring, dalillar, tuzatish, audit.
5. Oylik: hisoblash, snapshot/lock, buxgalter eksporti.
6. Sinov/pilot: real filialda GPS va aloqa, xavfsizlik, backup, Vercel deploy.
7. Keyingi bosqich: Capacitor Android/iOS, push va kerakli integratsiyalar.

Topshirish tarkibi: source code, lockfile, .env.example (maxfiy kalitlarsiz), SQL migratsiyalar/RLS, API OpenAPI tavsifi, unit/integration/E2E testlar, test natijalari, deploy/backup yo‘riqnomasi, admin/ustoz qo‘llanmasi va dizayn fayllari. MVP muddatini yakuniy ekranlar va jamoa tarkibidan keyin baholash kerak.

## 18. Rasmiy texnik manbalar

- [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js) — Node API joylashtirish.
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control) — rasm ruxsatlari.
- [Supabase changelog](https://supabase.com/changelog) — implementatsiyadan oldin o‘zgarishlar tekshiruvi.
- [Capacitor hujjatlari](https://capacitorjs.com/docs) — web kodini native qobiqda qayta ishlatish.
- [MDN Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) — HTTPS va ruxsatli lokatsiya olish.

