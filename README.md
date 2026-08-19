<div align="center">

# 🍽️ میزون | Mizoon
### پلتفرم هوشمند تحلیل هزینه، قیمت‌گذاری و مهندسی منوی کافه و رستوران
**Smart Cost Analysis, Food Costing & Menu Engineering Platform for Restaurants & Cafes**

[![React](https://img.shields.io/badge/React-19-blue.svg?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Dexie](https://img.shields.io/badge/IndexedDB-Dexie.js-orange.svg)](https://dexie.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

<p align="center">
  <a href="#-درباره-پروژه">درباره پروژه</a> •
  <a href="#-قابلیت‌های-کلیدی">قابلیت‌ها</a> •
  <a href="#-تکنولوژی‌های-استفاده‌شده">تکنولوژی‌ها</a> •
  <a href="#-نصب-و-راه‌اندازی">نصب و اجرا</a> •
  <a href="#-معماری-پروژه">معماری</a>
</p>

---

</div>

## 📖 درباره پروژه

**میزون (Mizoon)** یک نرم‌افزار تحت وب پیشرفته، مدرن و اختصاصی برای مدیران رستوران‌ها، کافی‌شاپ‌ها، کیترینگ‌ها و سرآشپزها است که به آن‌ها کمک می‌کند تا:
- **بهای تمام‌شده هر غذا و نوشیدنی (Food Cost / COGS)** را با احتساب گرم و درصد ضایعات به دقت ریال محاسبه کنند.
- منوی خود را با مدل **مهندسی منو (Menu Engineering / BCG Matrix)** تحلیل کرده و اقلام پرفروش و سودده را شناسایی کنند.
- انبار مواد اولیه، فاکتورهای خرید، میانگین موزون قیمت خرید و تاریخ انقضا/نقطه سفارش را هوشمندانه کنترل کنند.
- سود و زیان خالص (P&L)، هزینه‌های سربار و نقطه سر‌به‌سر (Break-even Point) را در داشبوردهای گرافیکی ارزیابی نمایند.

---

## ✨ قابلیت‌های کلیدی

### ۱. 📦 مدیریت جامع انبار و مواد اولیه (Inventory Management)
- تعریف مواد خام با واحدهای سنجش منعطف (گرم، کیلوگرم، میلی‌لیتر، لیتر، عدد، قوطی و...)
- ثبت فاکتورهای خرید همراه با تاریخ شمسی و محاسبه خودکار میانگین قیمت فی خرید
- هشدار خودکار رسیدن به **نقطه سفارش (Min Stock Alert)**
- اصلاح موجودی و انبارگردانی آسان

### ۲. 🍲 فرمولاسیون و رسپی ساخت (Recipe & Food Costing)
- فرمول‌نویسی دقیق برای تک‌تک آیتم‌های منو و نیمه‌آماده‌ها (Sub-recipes)
- ضریب پرت و ضایعات ماده اولیه (Wastage / Yield Percentage)
- محاسبه هزینه بسته‌بندی، دستمزد مستقیم و بهای تمام‌شده زنده (Live Cost Calculation)
- پیشنهاد قیمت فروش هوشمند بر اساس حاشیه سود هدف (Target Margin %)

### ۳. 📊 مهندسی منو (Menu Engineering Matrix)
- تحلیل ماتریسی محبوبیت در برابر سودآوری اقلام:
  - ⭐ **ستاره‌ها (Stars):** سود بالا + فروش بالا
  - 🐎 **اسب‌های کاری (Plowhorses):** سود پایین + فروش بالا
  - ❓ **معماها (Puzzles):** سود بالا + فروش پایین
  - 🐕 **سگ‌ها (Dogs):** سود پایین + فروش پایین
- راهکارهای پیشنهادی هوشمند برای بهینه‌سازی قیمت و ترکیب منو

### ۴. 🧾 صندوق و مدیریت سفارشات (Sales & Live POS)
- ثبت سریع فاکتورهای فروش روزانه
- **کسر خودکار موجودی انبار بر اساس رسپی ساخت** (Auto Stock Deduction)
- گزارش ریز فروش آیتم‌ها و پرفروش‌ترین روزها و ساعات

### ۵. 📈 گزارش سود و زیان و تحلیل مالی (P&L Analytics)
- محاسبه درآمد ناخالص، بهای تمام‌شده کالای فروش‌رفته، هزینه‌های ثابت (اجاره، حقوق، قبوض) و سود خالص
- نمودارهای مقایسه‌ای و روند فروش با استفاده از **Recharts**
- تحلیل نقطه سربه سر فروش روزانه و ماهانه

### ۶. 🔒 ذخیره‌سازی آفلاین و امنیت اطلاعات (Offline-First)
- پایگاه داده سمت کلاینت با **Dexie.js (IndexedDB)** با بالاترین سرعت و عملکرد
- بدون نیاز به اینترنت برای استفاده روزمره در محیط کاری رستوران
- خروجی و پشتیبان‌گیری استاندارد (Export / Import JSON Backup)

### ۷. 📅 تقویم شمسی جلالی و زبان فارسی (Full RTL & Persian UX)
- ادغام موتور تبدیل و انتخابگر اختصاصی تقویم جلالی با پاپ‌اور استاندارد
- تبدیل خودکار ارقام به فارسی و قالب‌بندی ریالی/تومانی استاندارد

---

## 🛠️ تکنولوژی‌های استفاده‌شده

| بخش | ابزار / کتابخانه |
| :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) |
| **Language** | [TypeScript 5.8](https://www.typescriptlang.org/) |
| **Styling & CSS** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Build Tool** | [Vite 6](https://vitejs.dev/) |
| **Client Database** | [Dexie.js](https://dexie.org/) (IndexedDB) |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) |
| **UI Primitives** | [Radix UI](https://www.radix-ui.com/) |
| **Animations** | [Motion](https://motion.dev/) (Framer Motion) |
| **Charts & Data Viz** | [Recharts](https://recharts.org/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Calendar Engine** | [Jalaali JS](https://github.com/jalaali/jalaali-js) |

---

## 🚀 نصب و راه‌اندازی

برای راه‌اندازی و اجرای محلی پروژه، مراحل زیر را طی کنید:

### پیش‌نیازها
- نصب [Node.js](https://nodejs.org/) (نسخه ۱۸ به بالا)
- نصب مدیریت بسته `npm` یا `yarn` یا `pnpm`

### مراحل اجرا

۱. **کلون کردن مخزن:**
```bash
git clone https://github.com/YOUR_USERNAME/mizoon.git
cd mizoon
```

۲. **نصب وابستگی‌ها:**
```bash
npm install
```

۳. **اجرای نسخه توسعه (Development):**
```bash
npm run dev
```
برنامه در آدرس `http://localhost:3000` آماده به کار خواهد بود.

۴. **بیلد پروژه برای محیط پروداکشن:**
```bash
npm run build
```

---

## 📂 ساختار پوشه‌ها و معماری

```text
src/
├── components/
│   ├── analytics/      # کامپوننت‌های تحلیلی و گزارشات مالی
│   ├── dashboard/      # داشبورد مدیریتی و حالت ساده/پیشرفته
│   ├── guide/          # راهنمای تعاملی سیستم
│   ├── inventory/      # مدیریت انبار، خرید و اصلاح موجودی
│   ├── layout/         # هدر، سایدبار و ناوبری اصلی
│   ├── menu/           # مهندسی منو و فرمول ساخت (Recipes)
│   ├── sales/          # ثبت سفارش و گزارش فروش
│   ├── settings/       # تنظیمات، بکاپ و بازیابی اطلاعات
│   └── ui/             # دکمه‌ها، مودال‌ها، دیت‌پیکر شمسی و المان‌های پایه
├── db/                 # پیکربندی دیتابیس لوکال Dexie IndexedDB
├── hooks/              # هوک‌های اختصاصی ری‌اکت
├── lib/                # توابع کمکی، تبدیل تاریخ جلالی و فرمت پول
├── types/              # اینترفیس‌ها و تعاریف تایپ‌اسکریپت
├── App.tsx             # کامپوننت ریشه
└── main.tsx            # ورودی اصلی برنامه
```

---

## 🤝 مشارکت در توسعه (Contribution)

پیشنهادات و گزارش باگ‌ها صمیمانه استقبال می‌شود:
1. پروژه را **Fork** کنید.
2. یک Branch جدید برای قابلیت خود بسازید (`git checkout -b feature/AmazingFeature`).
3. تغییرات خود را Commit کنید (`git commit -m 'feat: Add some AmazingFeature'`).
4. به Branch اصلی Push کنید (`git push origin feature/AmazingFeature`).
5. یک **Pull Request** ارسال کنید.

---

## 📄 مجوز (License)

این پروژه تحت مجوز **MIT** منتشر شده است. برای اطلاعات بیشتر فایل `LICENSE` را مطالعه کنید.

<div align="center">
  <sub>طراحی و توسعه یافته با ❤️ برای صنعت رستوران و میزبانی ایران</sub>
</div>
