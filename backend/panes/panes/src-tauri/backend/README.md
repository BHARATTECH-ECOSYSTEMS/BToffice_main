# Attendance System

A simple attendance system for check-in and check-out.

## Features
- Check-in and check-out functionality
- Daily attendance tracking
- Status management (present, absent, on-leave)

## Installation

1. Clone the repository
2. Install dependencies:
bash
npm install

3. Create a `.env` file with your MongoDB connection string
4. Start the server:
bash
npm start


## API Endpoints

- `POST /api/attendance/check-in` - Record check-in
- `POST /api/attendance/check-out` - Record check-out
- `GET /api/attendance/:date` - Get attendance for a specific date
- `GET /api/attendance` - Get all attendance records

## Technologies Used
- Node.js
- Express
- MongoDB
- Mongoose