# الحديد — Gym Tracker APK

## الخطوات

1. اعمل repo جديد على GitHub (public أو private، الاتنين هيشتغلوا).
2. ارفع كل الملفات اللي في المجلد ده على الـ repo (نفس الهيكل بالظبط، متلقيش بالك بمجلد `node_modules` أو `android` أو `dist` — متضافينش أصلًا لإنهم في `.gitignore`).

   عن طريق سطر الأوامر:
   ```bash
   cd gym-tracker-apk
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPO.git
   git push -u origin main
   ```

3. لما الملفات توصل GitHub، الـ workflow اللي في `.github/workflows/build-apk.yml` هيشتغل تلقائيًا (Actions tab).
4. استنى الـ build يخلص (بياخد 3-5 دقايق أول مرة).
5. روح تاب **Actions** → افتح آخر run → هتلاقي في الأسفل قسم **Artifacts** فيه ملف اسمه `gym-tracker-apk` — نزّله، ده ملف zip فيه الـ APK.
6. فك الضغط، انسخ ملف `app-debug.apk` على موبايلك، وثبّته (لازم تفعّل "السماح بالتثبيت من مصادر غير معروفة" في إعدادات الأندرويد أول مرة).

## لو عايز تشغّله على جهازك للتجربة قبل كده

```bash
npm install
npm run dev
```

## ملاحظات

- الـ APK ده **debug build** (غير موقّع رسميًا) — مناسب للتجربة الشخصية وتثبيته على موبايلك مباشرة، لكن مش مناسب للنشر على Google Play (ده محتاج توقيع release منفصل).
- البيانات بتتخزن محليًا على الموبايل (`localStorage` جوه الـ WebView) — لو مسحت التطبيق أو بياناته، هتتمسح البيانات.
- تقدر تغيّر اسم التطبيق والـ app ID من `capacitor.config.json`.
