# Cooperative Gathering Registration System

A comprehensive registration system for cooperative gatherings with member check-in/check-out, stub management, and admin dashboard.

## Features

### 🔐 Authentication & Authorization
- Role-based access (Admin/Staff)
- JWT token authentication
- Terminal-based logging

### 👥 Member Management
- Register Regular and Associate members
- Search and filter members
- Edit member information

### ✅ Check-In Module
- Member search and selection
- Issue Meal and Transportation stubs
- Generate unique control numbers
- Creates unified member journey record
- Terminal logging

### 🚪 Check-Out Module
- Control number validation
- Handle normal claims
- Lost stub handling with manual forms
- Incorrect stub override with reason logging
- Updates journey status to complete

### 📊 Admin Dashboard
- Real-time statistics
- Attendance and claims breakdown
- Terminal activity monitoring
- Recent activity feed

## Tech Stack

### Backend
- Node.js with Express
- PostgreSQL database
- JWT authentication
- Role-based authorization
- Audit logging

### Frontend
- React 19
- React Router for navigation
- Tailwind CSS for styling
- Axios for API calls
- React Hot Toast for notifications

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### 1. Database Setup

1. Install PostgreSQL and create a database:
```sql
CREATE DATABASE cooperative_gathering;
```

2. Run the database schema:
```bash
cd backend
psql -U postgres -d cooperative_gathering -f database/simplified_schema.sql
```

### 2. Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp env.example .env
```

4. Update `.env` with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cooperative_gathering
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-super-secret-jwt-key
PORT=8000
FRONTEND_URL=http://localhost:3000
```

5. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:8000`

### 3. Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Default Credentials

### Admin Account
- Username: `admin`
- Password: `admin123`

### Staff Account
- Username: `staff`
- Password: `staff123`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Members
- `GET /api/members` - Get all members
- `POST /api/members` - Create member
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member

### Simplified Attendance
- `POST /api/simplified-attendance/checkin` - Check-in member
- `POST /api/simplified-attendance/checkout` - Check-out member
- `GET /api/simplified-attendance` - Get member journey records
- `GET /api/simplified-attendance/summary` - Get attendance summary
- `GET /api/simplified-attendance/stats` - Get real-time statistics

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/audit-logs` - Get audit logs (Admin only)
- `GET /api/dashboard/export` - Export data (Admin only)

## System Workflow

### 1. Member Registration
- Admin/Staff can register new members
- Members are categorized as Regular or Associate

### 2. Check-In Process
- Search for member by name
- Select stub types (Meal, Transportation)
- System generates unique control number
- Creates member journey record with 'checked_in' status
- Logs terminal and staff information

### 3. Check-Out Process
- Enter control number for validation
- System validates against member journey record
- Updates journey status to 'complete'
- Handle different scenarios:
  - Normal claim (valid stub)
  - Lost stub (manual form required)
  - Incorrect stub (override with reason)

### 4. Admin Dashboard
- View real-time statistics
- Monitor attendance and claims
- Track terminal activity
- Export data for reporting

## Security Features

- JWT token authentication
- Role-based access control
- Audit logging for all actions
- Terminal-based activity tracking
- Manual override logging with reasons

## Database Schema

### Members Table
- `member_id` (UUID, Primary Key)
- `name` (Text)
- `member_type` (Enum: Regular, Associate)
- `registered_at` (Timestamp)

### Member Journey Table (Simplified Schema)
- `journey_id` (UUID, Primary Key)
- `member_id` (UUID, Foreign Key to members)
- `control_number` (VARCHAR(50), Unique)
- `check_in_time` (Timestamp)
- `check_in_terminal` (VARCHAR(100))
- `meal_stub_issued` (Boolean)
- `transportation_stub_issued` (Boolean)
- `check_out_time` (Timestamp)
- `check_out_terminal` (VARCHAR(100))
- `claimed` (Boolean)
- `lost_stub` (Boolean)
- `incorrect_stub` (Boolean)
- `manual_form_signed` (Boolean)
- `override_reason` (Text)
- `staff_id` (UUID, Foreign Key to staff)
- `status` (VARCHAR(20): 'checked_in' or 'complete')
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Staff Table
- `staff_id` (UUID, Primary Key)
- `username` (Text, Unique)
- `password_hash` (Text)
- `role` (Enum: Admin, Staff)
- `created_at` (Timestamp)

### Audit Logs Table
- `log_id` (UUID, Primary Key)
- `action` (Text)
- `table_name` (Text)
- `record_id` (UUID)
- `old_values` (JSONB)
- `new_values` (JSONB)
- `staff_id` (UUID, Foreign Key)
- `terminal_id` (Text)
- `created_at` (Timestamp)

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check PostgreSQL is running
   - Verify database credentials in `.env`
   - Ensure database exists

2. **Frontend Not Loading**
   - Check if backend is running on port 8000
   - Verify CORS settings
   - Check browser console for errors

3. **Authentication Issues**
   - Clear browser localStorage
   - Check JWT token expiration
   - Verify user credentials

### Development Tips

- Use browser dev tools to monitor API calls
- Check backend logs for error details
- Use PostgreSQL client to inspect database
- Monitor network tab for failed requests

## Production Deployment

### Environment Variables
- Set strong JWT_SECRET
- Use production database credentials
- Configure CORS for production domain
- Set NODE_ENV=production

### Security Considerations
- Use HTTPS in production
- Implement rate limiting
- Regular database backups
- Monitor audit logs
- Secure JWT token storage

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review error logs
3. Verify database connectivity
4. Test with default credentials
