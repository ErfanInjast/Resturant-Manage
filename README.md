<div align="center">

# ⚡ Mizoon | میزون

### Next-Gen Restaurant Cost Intelligence & Menu Engineering
**پلتفرم مدرن محاسبه بهای تمام‌شده (Food Cost)، مهندسی منو و تحلیل سودآوری رستوران و کافه**

<br />

[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5.8-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Offline First](https://img.shields.io/badge/Dexie_IndexedDB-FFA500?style=for-the-badge&logo=database&logoColor=white)](https://dexie.org/)
[![License](https://img.shields.io/badge/License-MIT-success?style=for-the-badge)](LICENSE)

<br />

[✨ ویژگی‌ها](#-core-features) •
[🚀 راه‌اندازی سریع](#-quick-start) •
[🏗️ معماری سیستم](#-architecture) •
[📊 مدل محاسباتی](#-costing-engine)

---

</div>

<br />

## 🌟 Overview

**میزون (Mizoon)** یک وب‌اپلیکیشن Offline-First، سریع و مدرن برای مدیران رستوران، کافه و فودکورت است که فرایند پیچیده فرمولاسیون رسپی، محاسبه دقیق بهای تمام‌شده غذا (**Food Cost / COGS**)، کسر خودکار انبار و تحلیل محبوبیت منو (**BCG Matrix**) را در قالب یک داشبورد چابک و بدون نیاز به اینترنت فراهم می‌کند.

<br />

## ⚡ Core Features

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🥘 فرمولاسیون زنده (Dynamic Costing)</h3>
      <ul>
        <li>محاسبه آنی بهای تمام‌شده بر اساس گرم و میلی‌لیتر</li>
        <li>محاسبه ضریب پرت و ضایعات ماده خام (Wastage Factor)</li>
        <li>محاسبه هزینه‌های سربار، بسته‌بندی و دستمزد مستقیم</li>
        <li>پیشنهاد هوشمند قیمت فروش بر اساس حاشیه سود هدف</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>📈 مهندسی منو (Menu Engineering)</h3>
      <ul>
        <li>تحلیل ۴ گانه ماتریس محبوبیت و سودآوری:
          <br /> ⭐ <b>Stars</b> &nbsp;|&nbsp; 🐎 <b>Plowhorses</b> &nbsp;|&nbsp; ❓ <b>Puzzles</b> &nbsp;|&nbsp; 🐕 <b>Dogs</b>
        </li>
        <li>پیشنهاد خودکار اصلاح قیمت یا تغییر ترکیب منو</li>
        <li>تحلیل نقطه سربه سر (Break-even Analysis)</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>📦 انبارداری و خرید (Smart Inventory)</h3>
      <ul>
        <li>محاسبه میانگین موزون قیمت خرید در فاکتورهای جدید</li>
        <li>سیستم هشدار کسری و نقطه سفارش (Min Stock Alert)</li>
        <li>تاریخچه کامل تغییرات نرخ و نمودار تورم مواد اولیه</li>
        <li>تقویم جلالی با پاپ‌اور تعاملی و بدون وابستگی سروری</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>🔒 صندوق و امنیت آفلاین (Offline-First POS)</h3>
      <ul>
        <li>ثبت سفارش با <b>کسر خودکار موجودی مواد خام</b></li>
        <li>پایگاه‌داده محلی پرسرعت IndexedDB (Dexie.js)</li>
        <li>عملکرد ۱۰۰٪ مستقل از اینترنت (Zero Downtime)</li>
        <li>پشتیبان‌گیری و بازیابی آنی با فرمت JSON</li>
      </ul>
    </td>
  </tr>
</table>

<br />

## 🛠️ Tech Stack

```ini
Frontend     │ React 19 • TypeScript 5.8 • Tailwind CSS v4 • Motion
Primitives   │ Radix UI • Lucide Icons • Recharts
Persistence  │ Dexie.js (IndexedDB) • Zustand Store
Localization │ Jalaali Date Engine • Persian RTL Typography
Tooling      │ Vite 6 • ESLint
```

<br />

## 🚀 Quick Start

```bash
# ۱. کلون مخزن
git clone https://github.com/YOUR_USERNAME/mizoon.git
cd mizoon

# ۲. نصب پکیج‌ها
npm install

# ۳. اجرای سرور توسعه
npm run dev

# ۴. بیلد پروداکشن
npm run build
```

> پس از اجرا، برنامه روی `http://localhost:3000` در دسترس خواهد بود.

<br />

## 🏗️ Architecture

```graphql
src/
├── components/
│   ├── analytics/     # تحلیل مالی، سود و زیان و شاخص‌های KPI
│   ├── dashboard/     # داشبورد مدیریت و گزارش روزانه
│   ├── inventory/     # مدیریت مواد خام، فاکتورهای خرید و انبارگردانی
│   ├── menu/          # فرمولاسیون رسپی، مهندسی منو و قیمت‌گذاری
│   ├── sales/         # ثبت فاکتور فروش و کسر خودکار انبار
│   └── ui/            # کامپوننت‌های اتمیک، تقویم جلالی و مودال‌ها
├── db/                # اسکیما و کلاینت Dexie IndexedDB
├── lib/               # موتور تبدیل تاریخ شمسی، محاسبات مالی و استایل
└── types/             # مدل‌های داده و اینترفیس‌های سیستم
```

<br />

## 📄 License

تحت مجوز **MIT** توسعه یافته است. استفاده تجاری و شخصی با رعایت لایسنس آزاد است.

<div align="center">
  <sub>Built for precision, speed, and real-world restaurant efficiency.</sub>
</div>
