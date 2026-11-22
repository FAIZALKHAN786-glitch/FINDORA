Findora 🔎

Lost something? It might be here.

Findora is an AI-powered campus lost-and-found platform designed to make recovering misplaced belongings easier.

Instead of endlessly scrolling through listings or relying on exact keyword matches, users can describe what they've lost in natural language. Findora uses a locally executed sentence-embedding model to identify semantically similar listings and suggest possible matches.

Built around simplicity, accessibility, and practical AI implementation.

---

✨ Features

🔍 Intelligent AI Matching

- Describe a lost item using natural language.
- Find semantically similar listings.
- Rank potential matches using cosine similarity.
- Display similarity scores and understandable matching reasons.
- Powered by a locally executed MiniLM embedding model.
- No paid LLM API or external AI inference service required.

📦 Lost & Found Management

- Report lost or found belongings.
- Add item descriptions, categories, dates, and locations.
- Upload item photographs.
- Browse available listings.
- Filter by category and status.
- View individual item details.

👤 User Accounts

- User registration and authentication.
- Secure password hashing using bcrypt.
- HTTP-only cookie-based sessions.
- View and manage your own listings.
- Delete previously submitted listings.

📱 User Experience

- Responsive interface.
- Clean, minimal design.
- Interactive item cards.
- Loading, error, and empty states.
- Automatic listing refresh while the browser tab is visible.

---

🧠 How the AI Works

Findora doesn't use a conventional chatbot or an externally hosted LLM.

It uses semantic embeddings to understand the meaning of item descriptions.

The matching pipeline:

1. An item is submitted with its title, description, category, location, and date.
2. Findora combines these fields into a single text representation.
3. A locally executed embedding model converts the text into a numerical vector.
4. The vector is stored in PostgreSQL.
5. When someone describes a missing item, the same embedding model processes their query.
6. Findora calculates cosine similarity between the query vector and stored item vectors.
7. The highest-scoring candidates are returned with matching explanations.

AI Technology

- Model: "Xenova/all-MiniLM-L6-v2"
- Runtime: Transformers.js
- Similarity algorithm: Cosine Similarity
- Vector storage: PostgreSQL JSONB
- Maximum results: 5
- Minimum similarity threshold: 0.35

Example

User query:

"Black backpack left in the library on Tuesday."

Possible matching results:

- Black travel bag — Bags — Library
- Dark backpack — Bags — Main Block

Each result includes a similarity score and matching reasons.

These are suggestions, not guaranteed identifications. Users must confirm matches with the original poster.

---

🛠️ Technology Stack

Frontend

- React 18
- Vite
- Tailwind CSS
- JavaScript

Backend

- Node.js
- Express.js
- REST API
- Multer

Database

- PostgreSQL 16
- PostgreSQL JSONB for embedding storage

Artificial Intelligence

- Hugging Face Transformers.js
- MiniLM sentence embeddings
- Cosine similarity

Authentication & Security

- bcryptjs
- HTTP-only cookie sessions
- SHA-256 session token hashing
- Parameterized SQL queries
- API rate limiting
- File upload validation

Development & Infrastructure

- Docker
- Docker Compose
- Node.js Test Runner

---

🏗️ Architecture

Findora follows a client-server architecture.

                 USER
                   |
                   v
          REACT FRONTEND
             (Vite)
                   |
                   v
            EXPRESS API
                   |
          +--------+--------+
          |        |        |
          v        v        v
       AUTH     ITEM API   AI MATCH
          |        |        |
          |        |        v
          |        |   LOCAL EMBEDDER
          |        |        |
          |        |   COSINE SIMILARITY
          |        |        |
          +--------+--------+
                   |
                   v
              POSTGRESQL
                   |
          +--------+--------+
          |                 |
          v                 v
       USERS              ITEMS
          |                 |
       SESSIONS         EMBEDDINGS

The frontend communicates with the local Express API, which handles authentication, item management, and AI matching.

PostgreSQL stores application data and embedding vectors.

The AI embedding model runs locally through Transformers.js.

---

📁 Project Structure

campus-lost-found/
│
├── db/
│   ├── schema.sql
│   └── seed.sql
│
├── docs/
│   └── superpowers/
│
├── scripts/
│   ├── ai-backfill.mjs
│   └── db-init.mjs
│
├── server/
│   ├── app.js
│   ├── embedder.js
│   ├── index.js
│   ├── match.js
│   └── store.js
│
├── src/
│   ├── components/
│   ├── lib/
│   ├── pages/
│   ├── App.jsx
│   └── index.css
│
├── test/
│   ├── ai-match.test.mjs
│   ├── api.test.mjs
│   ├── cleanup.test.mjs
│   ├── db-files.test.mjs
│   ├── frontend-contract.test.mjs
│   ├── pages.test.mjs
│   └── security.test.mjs
│
├── docker-compose.yml
├── package.json
├── SETUP.md
└── vite.config.js

---

⚙️ Installation & Setup

Prerequisites

Make sure you have:

- Node.js 20 or later
- npm
- Docker Desktop
- Docker running with Linux containers

1. Clone the repository

git clone https://github.com/FAIZALKHAN786-glitch/campus-lost-found.git

cd campus-lost-found

2. Install dependencies

npm install

3. Configure environment variables

Copy the example environment file:

Windows PowerShell:

copy .env.example .env

The default configuration is already compatible with the provided Docker Compose setup.

4. Start PostgreSQL

docker compose up -d

5. Initialize the database

npm run db:init

This creates the database schema and inserts demonstration listings.

6. Generate AI embeddings

npm run ai:index

The first execution downloads the embedding model into the local cache.

Subsequent executions reuse the cached model and index missing or outdated embeddings.

7. Start the application

npm run dev

The application will be available at:

Service| Address
Frontend| http://localhost:3000
Backend API| http://localhost:3001
PostgreSQL| localhost:5432

---

🧪 Testing

Findora includes automated tests covering application functionality and important backend contracts.

Run the test suite:

npm test

Build the frontend:

npm run build

The tests cover areas including:

- AI matching and similarity ranking.
- API behavior and validation.
- Authentication and security.
- File handling.
- Frontend contracts.
- Database-related functionality.

---

🔐 Security Considerations

Findora incorporates several security measures:

- Password hashing with bcrypt.
- SHA-256 hashing of stored session tokens.
- HTTP-only authentication cookies.
- SameSite cookie protection.
- Parameterized database queries.
- Authentication rate limiting.
- Independent AI matching rate limiting.
- File type and file size restrictions.
- Security-related HTTP response headers.

Important: This project is currently designed as a localhost-only MVP. It is not configured as a production-ready public deployment.

---

🚧 Current Limitations

- No administrator dashboard.
- No automated email notifications.
- No real-time WebSocket communication.
- No public deployment configuration.
- AI matching provides candidate suggestions rather than confirmed identifications.
- The embedding model requires an initial download.
- The application currently uses a local PostgreSQL instance.

---

🔮 Future Possibilities

Potential directions for future development include:

- Institution-wide deployment.
- QR-based item identification.
- Image-based similarity matching.
- Advanced duplicate detection.
- Administrative moderation.
- Notifications when potential matches appear.
- Campus-specific analytics.
- Improved semantic retrieval at larger scales.

---

🎯 Project Philosophy

Findora explores a simple idea:

Finding something you've lost shouldn't be harder than losing it.

Rather than introducing AI just for the sake of using AI, Findora applies semantic understanding to a practical problem where conventional keyword searching can fall short.

The objective is to make technology useful, accessible, and meaningful.

---

👨‍💻 Developer

Faizal Khan

First-year student exploring Artificial Intelligence, Machine Learning, software engineering, and practical applications of intelligent systems.

---

Findora — Bringing lost things closer to being found.