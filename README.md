# Question Answer Web Application (MERN Stack)

A full-stack question-answer application built with MongoDB, Express, React, and Node.js. Features include user authentication, question management, analytics, and real-time user tracking.

## Features

### User Features
- User registration and login
- Question dashboard with 4 options per question
- Answer submission with instant feedback
- Progress tracking
- Question navigation

### Admin Features
- Admin dashboard with comprehensive analytics
- Question management (Add, Edit, Delete)
- Real-time logged-in users count
- Detailed analytics per question showing:
  - Total answers
  - Correct/Incorrect answers
  - Accuracy percentage
  - Option-wise distribution
- Results view with all user submissions
- User management view

## Tech Stack

- **Frontend**: React, Tailwind CSS, React Router, Axios
- **Backend**: Node.js, Express, MongoDB, Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory (or update the existing one):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/qa-app
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
```

4. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory (optional, defaults to localhost:5000):
```env
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the frontend development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

### Environment Configuration

- Copy `backend/env.example` to `backend/.env` and fill in your MongoDB connection string, JWT secret, and allowed CORS origin(s). Multiple origins can be comma-separated.
- Copy `frontend/env.example` to `frontend/.env` and update `REACT_APP_API_URL` to point at your deployed backend (for local dev it can stay `http://localhost:5000/api`).

Keeping sample env files in source control ensures Render and other hosting providers can be configured quickly without guessing the required keys.

## Deploying on Render

The repository includes a `render.yaml` blueprint so you can spin up matching backend and frontend services with one click.

1. Commit your latest changes and push them to GitHub.
2. In Render, choose **New + → Blueprint** and point it at your repo. Render will read `render.yaml` and create:
   - `qa-app-backend`: Node web service that runs `npm start` from the `backend` folder.
   - `qa-app-frontend`: Static site that builds the React app from the `frontend` folder.
3. In the backend service settings add the required environment variables (listed in `backend/env.example`):
   - `MONGODB_URI` (Atlas or other connection string)
   - `JWT_SECRET`
   - `JWT_EXPIRE` (optional, defaults to `7d`)
   - `CORS_ORIGIN` (comma-separated list that must include the final frontend URL)
4. Once the backend deploys, grab its public URL (e.g. `https://qa-app-backend.onrender.com`) and set `REACT_APP_API_URL` for the frontend service to `https://qa-app-backend.onrender.com/api`.
5. Trigger a redeploy of the frontend so the build picks up the updated API URL.

> Tip: Render automatically injects the `PORT` environment variable for the backend. The server now waits for MongoDB to connect before listening, which avoids the “MongoNetworkError” issues seen previously.

## Creating an Admin User

To create an admin user, you can use any of the following methods:

1. **Using the provided script (Recommended):**
   ```bash
   cd backend
   node scripts/createAdmin.js <username> <email> <password>
   ```
   Example:
   ```bash
   node scripts/createAdmin.js admin admin@example.com admin123
   ```

2. **Using MongoDB Compass or mongo shell:**
   - Connect to your MongoDB database
   - Navigate to the `users` collection
   - Find a user document and update the `role` field to `"admin"`

3. **Using the registration API:**
   - Register a user normally through the frontend
   - Then update the role in the database to `"admin"`

## Usage

1. **For Regular Users:**
   - Register a new account or login
   - Navigate to the dashboard
   - Answer questions by selecting an option and clicking "Submit Answer"
   - View your progress and navigate between questions

2. **For Admins:**
   - Login with an admin account
   - Access the admin dashboard
   - Manage questions (add, edit, delete)
   - View analytics and user performance
   - Monitor logged-in users count
   - View all results and user data

## Project Structure

```
qa-app/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Question.js
│   │   └── Answer.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── questions.js
│   │   ├── answers.js
│   │   └── admin.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Questions (User)
- `GET /api/questions` - Get all questions (without correct answers)
- `GET /api/questions/:id` - Get single question

### Answers
- `POST /api/answers` - Submit an answer
- `GET /api/answers/my-answers` - Get user's answers

### Admin
- `GET /api/admin/logged-in-users` - Get logged-in users count
- `GET /api/admin/users` - Get all users
- `GET /api/admin/questions` - Get all questions (with correct answers)
- `POST /api/admin/questions` - Create a question
- `PUT /api/admin/questions/:id` - Update a question
- `DELETE /api/admin/questions/:id` - Delete a question
- `GET /api/admin/analytics` - Get analytics for all questions
- `GET /api/admin/analytics/:questionId` - Get analytics for a specific question
- `GET /api/admin/results` - Get all results

## Security Features

- Password hashing with bcryptjs
- JWT-based authentication
- Protected routes (both frontend and backend)
- Admin-only routes for sensitive operations
- Input validation and sanitization

## Notes

- Make sure MongoDB is running before starting the backend
- The logged-in users count updates every 5 seconds in the admin dashboard
- Users can only answer each question once
- Questions must have exactly 4 options
- The correct answer is specified by index (0-3)

## License

This project is open source and available under the MIT License.

