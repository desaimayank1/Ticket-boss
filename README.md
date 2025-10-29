# 🎟️ TicketBoss – Event Reservation System

A backend system built using **Node.js**, **Express**, and **Prisma ORM**, designed to manage **event seat reservations** with **optimistic concurrency control**.  
This ensures multiple users can reserve or update seat counts **safely without data conflicts**.

---

## 🚀 Features

- **Prisma ORM** with SQLite database  
- **Optimistic concurrency control** using versioning to prevent race conditions  
- **RESTful APIs** for event and reservation management  
- **Atomic seat update transactions** for consistency  
- **Clean modular structure** using controllers and routes  
- **Error handling** for common and edge cases  

---

## 🏗️ Project Structure
```bash
Ticket-boss/
├── prisma/
├── src/
│   ├── controllers/
│   │   ├── event.controller.ts
│   │   └── reservation.controller.ts
│   ├── routes/
│   │   ├── event.route.ts
│   │   └── reservation.route.ts
│   ├── middlewares/
│   │   └── validate.ts
│   ├── validators/
│   │   └── reservationSchema.ts
│   ├── prismaClient.ts
│   └── index.ts
│   └── ConcurrencyTest.ts
├── package.json
└── README.md
```

## ⚙️ Setup Instructions
```bash
# 1️⃣ Clone the repository
git clone https://github.com/desaimayank1/Ticket-boss.git .
cd Ticket-boss

# 2️⃣ Install dependencies
npm install

# 3️⃣ Setup Prisma
npx prisma generate
npx prisma migrate dev --name new

# 4️⃣ Run the application
npm run dev

# Server runs on http://localhost:3000

# 4️⃣ Run test for concurrency
npx ts-node ConcurrencyTest.ts
```

## 📚 API Documentation
###  1. Event Bootstrap (Auto-Seeded)
On first server startup, the application automatically seeds the database with a default event.

```json
{
  "eventId": "node-meetup-2025",
  "name": "Node.js Meetup 2025",
  "totalSeats": 500,
  "availableSeats": 500,
  "version": 0
}
```
###  2. Reserve Seats
Creates a new seat reservation for a partner.  


POST /reservations

## Request Body
```json
{
 "partnerId": "abc-corp1",
 "seats":4
}
```

## Responses

#### ✅ 201 Created 
```json
{
    "reservationId": "9304565f-3f51-4dd1-8f8e-efb0cfaa6956",
    "seats": 4,
    "status": "confirmed"
}
```

#### ❌ 409 Conflict
```json
{
    "error": "Not enough seats left",
    "remainingSeats": 9
}
```

#### ❌ 400 Bad Request 
```json
{
    "errors": ["seats must be 1–10"]
}
```

###  3. Delete Seats
Deletes an existing reservation and releases the reserved seats back to the event.

DELETE /reservations/${reservationId}
```bash
Ex-http://localhost:3000/reservations/ee051cc8-f0db-44ef-a241-5c2137c7ddf9
```

Request Body:
_None_

## Responses

#### ✅ 201 Created 
_None_


#### ❌ 404 Not Found
```json
{
    "error": "Reservation not found or already cancelled"
}
```
---
###  4. Update Seats
Updates the number of seats in an existing reservation.

PATCH /reservations/${reservationId}
```bash
Ex-http://localhost:3000/reservations/336ab2f7-a7be-4257-a3a0-3bc68013044a
```

## Request Body
```json
{
  "seats": 10
}
```
## Responses

#### ✅ 200 OK 
```json
{
    "reservationId": "8ff8dfbc-b0bb-4535-8195-3498f690e171",
    "newSeats": 2,
    "status": "updated"
}
```

#### ❌ 404 Not Found
```json
{
    "error": "Reservation not found or already cancelled"
}
```
---
###  5. Get Reservations
Fetches all existing reservations for the event.

GET /reservations

Request Body:
_None_

## Responses
#### ✅ 200 OK
```json
[
    {
        "reservationId": "8ff8dfbc-b0bb-4535-8195-3498f690e171",
        "partnerId": "abc-corp12",
        "seats": 2,
        "status": "confirmed",
        "createdAt": "2025-10-29T11:37:47.204Z",
        "eventId": "node-meetup-2025"
    }
]

```
---
###  6. Get Event Summary
Fetches event details, including total and available seats.

GET /event

Request Body:
_None_

## Responses
#### ✅ 200 OK
```json
{
  "eventId": "node-meetup-2025",
  "name": "Node.js Meet-up",
  "totalSeats": 10,
  "availableSeats": 10,
  "reservationCount": 0,
  "version": 0
}
```
## 🧠 Technical Decisions
```bash
Aspect           | Choice                     | Reason
-----------------|----------------------------|----------------------------------------------
ORM              | Prisma ORM                 | Type-safe schema modeling, easy migrations
Database         | SQLite                     | Lightweight, portable, easy to migrate later ,
                 |                            | also simplfy installation and testing without env variables
Concurrency      | Optimistic concurrency     | Prevents data overwrite on simultaneous edits
Architecture     | MVC (routes → controllers) | Clean separation of concerns
Validation       | Zod + Middleware           | Ensures safe, typed input before DB operations

```
### Edge Cases Considered
- Reserving or updating more seats than available
- Updating with outdated version → triggers concurrency conflict
- Event not found (invalid eventId)
- Reservation not found (invalid reservationId)
- Invalid seat count (<1 or >10)
- Partner trying to book multiple active reservations
- Database or transaction errors handled gracefully

## Assumptions
- Event ID is stored as a constant in the backend (`"eventId": "node-meetup-2025"`)
  → chosen to stay consistent with the assignment documentation’s request format.

- In a real-world app, the event ID would be passed dynamically in each request.

- SQLite is used for simplicity and quick setup
  → suitable for testing and local development.

- Due to SQLite's file-based write locking, concurrent writes are limited
  → around 10–15 users can comfortably perform simultaneous reservations.

- Migration to PostgreSQL or MySQL would resolve concurrency scaling limits.

- Each partner can hold only one active (confirmed) reservation at a time
  → ensures fairness and data consistency.

