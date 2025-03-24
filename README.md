# CMMS Prototype Backend

This repository contains the **backend** of the CMMS, it is responsible for handling data storage, authentication, task scheduling, and GraphQL API services, ensuring seamless communication between the frontend and database.

---

## 🛠️ Tech Stack

- **NestJS** (Progressive Node.js framework)
- **TypeScript** (Static type checking)
- **Apollo GraphQL** (API layer for structured queries & mutations)
- **Redis** (Caching & background job scheduling)
- **Prisma** (ORM for database interactions)
- **PostgreSQL** (Relational database for structured data storage)
- **JWT Authentication** (User authentication and authorization)
- **RBAC (Role-Based Access Control)** (Fine-grained access control)
- **Cron Jobs** (Automated scheduled tasks)

---

## 🚀 Features

### 📡 GraphQL API
- Query and mutate data efficiently using **Apollo GraphQL**
- Strongly typed schema for reliable API interactions

### 🔐 Authentication & Authorization
- **JWT-based authentication** for secure user sessions
- **RBAC (Role-Based Access Control)** with customizable permissions

### 📌 Asset & Task Management
- CRUD operations for **machinery, vessels, vehicles, and other assets**
- **Task scheduling and assignment** for maintenance workflows
- **Checklists and periodic maintenance tracking**
- **Issue reporting and breakdown logs**

### 🔄 Background Jobs & Notifications
- **Redis-powered cron jobs** for automated maintenance reminders
- **Real-time notifications** using **GraphQL subscriptions**

### 🛠️ API Key Management
- Generate and manage API keys with **expiration dates** and **scoped permissions**

### ⚙️ System Configuration
- Manage settings such as **zones, locations, brands, engines, and more**

---
## 🏆 My Role  

I developed the **backend** of this system using **NestJS + TypeScript**.  
Key contributions:
- Designed and implemented GraphQL API using NestJS & Apollo
- Developed role-based access control (RBAC) for secure data access
- Integrated Redis for background jobs and real-time notifications
- Created cron jobs for automated maintenance scheduling
- Built API key management with expiration and permissions
- Developed authentication system using JWT
- Optimized database queries using Prisma ORM
---

## 🛠 Setup & Installation

### **1️⃣ Clone the Repository**

```sh
git clone https://github.com/Usagi5677/cmms-prototype-backend.git
cd cmms-prototype-backend
```

### **2️⃣ Install Dependencies**
```sh
npm install
```

### **3️⃣ Set Up Environment Variables**

Create a .env file in the root directory with the following variables:
```sh
DATABASE_URL=postgresql://user:password@localhost:5432/cmms
REDIS_URL=redis://localhost:6379
PORT=4000
```
Replace user and password with your PostgreSQL credentials.

### **4️⃣ Apply Database Migrations**
```sh
npx prisma migrate deploy
```
### **5️⃣ Start the Development Server**
```sh
npm run start:dev
```
The server will run at http://localhost:4000.


## 📌 Notes

- Requires PostgreSQL running locally or on a cloud provider.
- Redis is needed for real-time notifications.
- The frontend is required for full functionality (available [here](https://github.com/Usagi5677/cmms-prototype-frontend)).

## 📄 License

This project is for portfolio purposes. Do not use it for commercial projects without permission.

