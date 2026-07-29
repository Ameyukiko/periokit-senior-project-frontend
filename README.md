<h1 align="center">🦷 PerioKit — Frontend</h1>

<p align="center">
  <b>A web app for dentists to record, visualize, and diagnose gum health in one place.</b><br />
  <sub>Senior Project · Software Engineering, Chiang Mai University</sub>
</p>

<p align="center">
  <a href="https://periokit.netlify.app/">
    <img src="https://img.shields.io/badge/🔗_Live_Demo-2563EB?style=for-the-badge" />
  </a>
  <a href="https://github.com/Siwali/periokit-senior-project-backend">
    <img src="https://img.shields.io/badge/Backend_Repo-181717?style=for-the-badge&logo=github&logoColor=white" />
  </a>
  <img src="https://img.shields.io/badge/status-in_development-F59E0B?style=for-the-badge" />
</p>

<p align="center">
  <img src="https://skillicons.dev/icons?i=vue,ts,vite,graphql,supabase,postgres&perline=6" />
</p>

---

## The problem

Periodontal charting at the **Prosthodontics Department, Faculty of Dentistry, CMU** is still done
on paper. A single periodontal chart records **6 measurement points per tooth across 32 teeth** —
pocket depth, recession, bleeding, mobility — and dentists then calculate summary indices by hand.

That means:

- 🐢 Slow to record during an exam, slower to look up later
- ✏️ Manual index calculation is error-prone
- 📂 Clinical data, charts, and X-rays live in three separate places
- 📉 No easy way to compare a patient's condition across visits

**PerioKit replaces the paper workflow** — recording, visualization, and diagnosis in one screen.

---

## What's working now

| Feature | Description |
|---|---|
| 🦷 **Interactive periodontal chart** | Click-and-record charting UI mirroring the paper form dentists already know |
| 👤 **Patient management** | Create, search, and manage patient records and visit history |
| 🧮 **Automatic calculation** | Periodontal indices computed from chart input — no manual math |

**Planned:** X-ray viewer alongside the chart · diagnosis suggestions · Docker + Azure deployment

---

## Tech stack

**Frontend** — Vue 3 (`<script setup>`) · TypeScript · Vite · Apollo Client
**API** — GraphQL
**Data** — Supabase (PostgreSQL) via Prisma
**Hosting** — Netlify (frontend) · Render (backend)

> **Why GraphQL?** A periodontal chart pulls deeply nested data — patient → visit → tooth →
> measurement point. REST would have meant either many round trips or heavily over-fetching;
> GraphQL lets the chart request exactly the shape it renders in one call.

---

## Running locally

```bash
git clone https://github.com/Siwali/periokit-senior-project-frontend.git
cd periokit-senior-project-frontend

npm install
cp .env.example .env      # fill in your GraphQL endpoint
npm run dev
```

The [backend](https://github.com/Siwali/periokit-senior-project-backend) needs to be running too.

---

## ⚠️ Trying the live demo

The demo runs on free tiers, so the backend sleeps when idle.
**First load takes 1–2 minutes** while it wakes up — after that it's responsive.
Production deployment will move to **Docker on Azure**.

---

## About this project

Built as a two-person senior project with a real client — the Prosthodontics Department at CMU's
Faculty of Dentistry. Actively in development.

---

<sub>All data shown in the demo is synthetic. No real patient information is stored in this repository.</sub>
