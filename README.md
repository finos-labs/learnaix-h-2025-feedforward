## 📄 Summary of Your Solution (under 150 words)

**What problem does your solution solve?**  
Our solution tackles the challenge of unstructured and hard-to-analyze student feedback in Moodle. Instructors often lack actionable insights to improve teaching quality and course design in real time.  

**How does it work?**  
Feedback submitted in Moodle is captured via a custom plugin and passed to a Next.js API. The data is stored in Snowflake, where AI enrichment extracts sentiment, themes, and actionable suggestions. A Next.js dashboard then displays key metrics, while an AI chatbot powered by Snowflake Cortex Llama3 answers instructor queries based on enriched data.  

**What technologies did you use?**  
- **Frontend:** Next.js, Recharts
- **Backend/API:** Next.js serverless routes  
- **Data & AI:** Snowflake (storage, enrichment, Cortex Llama3)  
- **Integration:** Moodle plugin for feedback transfer  

---

## 👥 Team Information

| Field             | Details                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| **Team Name**     | FEEDFORWARD                                                             |
| **Title**         | AI FEEDBACK REVIEW                                                      |
| **Theme**         | Feedback as a Service                                                   |
| **Contact Email** | vaibhav.tyagi@soprasteria.com                                           |
| **Participants**  | Parisha Sethi, GURU PAVAN KALYAN Bandaru, VAN DER LINDE Angelique, SCOTT Daniel, Vaibhav Tyagi |
| **GitHub Users**  | Daniel-Scott-13, parishasethi2024, vaibhavTyagiSopra                    |

---

## 🎥 Submission Video

Provide a video walkthrough/demo of your project. You can upload it to YouTube, Google Drive, Loom, etc.  

- 📹 **Video Link**: [\[Paste link here\]](https://www.loom.com/share/c89419d6bdb3435abe0bb59227e75967?sid=9b690b2f-7f9a-4741-9a21-e8ae9792f477)
- 📹 **Video Link**: [\[Paste link here\]](https://drive.google.com/file/d/16o6EydlAruo3hiaELfTdoj3O0AD5X3u4/view?usp=sharing)


---

## 🌐 Hosted App / Solution URL

If your solution is deployed, share the live link here.  

- 🌍 **Deployed URL**: [feedback-zeta-silk.vercel.app/dashboard](https://feedback-zeta-silk.vercel.app/dashboard)

---

## Docker steps to run application

1) Clone main branch of repository.
2) Please make sure docker is running.
3) Run "docker-compose up --build" and wait as moodle tables take some time to get inserted in postgres.
4) Run "localhost:8080" for moodle & "localhost:3000/dashboard" for dashboard.
5) Please create .env.local at root. Refer env.defaults

## 📜 License

Copyright © 2025 FINOS  

Distributed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).  

SPDX-License-Identifier: [Apache-2.0](https://spdx.org/licenses/Apache-2.0)
