# CampusConnect 🎓

A full-stack social media web application for college students — Instagram-style feed, posts, likes, comments, and profiles — powered by **React**, **Express.js**, and **Supabase**.

---

## 🖼️ Features

- 🔐 **College-only auth**: Only `@college.edu` emails can register (configurable)
- 👤 **User profiles**: Avatar, bio, followers/following count, post grid
- 📸 **Posts**: Upload images with captions, delete your own posts
- ❤️ **Likes**: Like/unlike with optimistic updates and animations
- 💬 **Comments**: Add comments, see threaded replies
- 🌊 **Infinite scroll feed**: Paginated, always fresh
- 🔔 **Toast notifications**: Real-time feedback
- 📱 **Responsive design**: Mobile-first dark theme

---

## 🏗️ Folder Structure

```
Antigravity Projects/
├── frontend/               # React + Vite app
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── PostCard.jsx
│   │   │   └── UploadPost.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── lib/
│   │   │   └── api.js
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Feed.jsx
│   │   │   └── Profile.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env
│   └── vite.config.js
│
├── backend/                # Express.js REST API
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── posts.js
│   │   └── users.js
│   ├── supabase.js
│   ├── index.js
│   └── .env
│
└── supabase_setup.sql      # Run this in Supabase SQL Editor
```

---

## 🚀 Setup Instructions

### Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **Service Role Key** (Settings > API)
3. Go to **SQL Editor** and run the entire `supabase_setup.sql` file

### Step 2: Configure Backend

Edit `backend/.env`:

```env
PORT=5000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ALLOWED_EMAIL_DOMAIN=college.edu
NODE_ENV=development
```

> ⚠️ Replace `college.edu` with your actual college domain (e.g., `mit.edu`, `stanford.edu`)

### Step 3: Configure Frontend

The frontend `.env` is pre-configured to proxy to localhost:5000.  
Edit `frontend/.env` if you want to point to a remote backend:

```env
VITE_API_URL=http://localhost:5000
```

### Step 4: Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### Step 5: Run the App

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with college email |
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/auth/me` | Get current user |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts?page=1&limit=10` | Get feed (paginated) |
| POST | `/api/posts` | Create post (multipart/form-data) |
| DELETE | `/api/posts/:id` | Delete own post |
| POST | `/api/posts/:id/like` | Toggle like |
| GET | `/api/posts/:id/comments` | Get comments |
| POST | `/api/posts/:id/comments` | Add comment |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:username` | Get profile + posts |
| PUT | `/api/users/profile/update` | Update profile + avatar |
| POST | `/api/users/:userId/follow` | Follow/unfollow |
| GET | `/api/users/:userId/is-following` | Check follow status |

---

## 🗄️ Database Schema

```sql
users        (id, email, username, password_hash, bio, profile_image, created_at)
posts        (id, user_id→users, image_url, caption, created_at)
likes        (id, post_id→posts, user_id→users, created_at) -- UNIQUE(post_id, user_id)
comments     (id, post_id→posts, user_id→users, comment_text, created_at)
follows      (id, follower_id→users, following_id→users, created_at) -- UNIQUE(follower_id, following_id)
```

---

## 🔒 Security

- **JWT Authentication**: 7-day expiry, verified on every protected request
- **College domain validation**: Enforced server-side on registration
- **Row Level Security**: Enabled on all Supabase tables
- **Service Role Key**: Used server-side only, never exposed to frontend
- **Password hashing**: bcryptjs with 12 salt rounds
- **Input validation**: Server-side validation on all endpoints

---

## 🚢 Deployment

### Backend (e.g. Railway, Render, Fly.io)
1. Set environment variables from `backend/.env`
2. Deploy with `npm start`

### Frontend (e.g. Vercel, Netlify)
1. Update `VITE_API_URL` to your backend URL
2. Remove the `proxy` from `vite.config.js`
3. Deploy the `frontend/` directory with `npm run build`

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 7 |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Backend | Express.js |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| Auth | JWT + bcryptjs |
| HTTP Client | Axios |
| Notifications | react-hot-toast |
