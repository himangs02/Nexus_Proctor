# MongoDB to MySQL Migration Guide - Exam-Proctar

## Overview
This document provides a comprehensive guide to complete the migration from MongoDB (Mongoose) to MySQL (Sequelize) for the Exam-Proctar backend.

## Completed Changes

### 1. Core Controllers Fixed ✅
- **authController.js** - Converted all Mongoose queries to Sequelize
- **authMiddleware.js** - Updated to use Sequelize User model
- **adminController.js** - Fixed faculty management queries
- **examController.js** - Full Sequelize conversion with associations
- **submissionController.js** - Converted to Sequelize with nested answer handling
- **violationController.js** - Converted to Sequelize with restriction logic

### 2. Sequelize Models Created ✅
- **User.js** - Sequelize version with password hashing
- **Exam.js** - Main exam table
- **ExamQuestion.js** - Questions table
- **QuestionOption.js** - MCQ options table
- **TestCase.js** - Test cases for coding questions
- **Submission.js** - Student submissions
- **SubmissionAnswer.js** - Individual answers per question
- **Violation.js** - Proctoring violations
- **Restriction.js** - Student restrictions
- **index.js** - Model associations and exports

### 3. Database Configuration ✅
- **db.js** - Updated to use Sequelize instead of Mongoose
- **mysql.js** - Sequelize configuration already present
- **server.js** - Updated to initialize models and associations

### 4. Migration Utility ✅
- **migrate.js** - Data migration script from MongoDB to MySQL

## How to Complete the Migration

### Step 1: Verify Environment Variables
Ensure your `.env` file has:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=proctor
JWT_SECRET=your_jwt_secret
PORT=5001
```

### Step 2: Run Data Migration
Before switching to production, migrate existing MongoDB data to MySQL:

```bash
cd backend
node src/migrate.js
```

This script will:
- Connect to both MongoDB and MySQL
- Sync all Sequelize models
- Migrate users with all fields
- Migrate exams with all questions, options, and test cases
- Migrate submissions with answer details
- Migrate violations and restrictions

### Step 3: Start the Server
```bash
npm start
```

The server will:
- Connect to MySQL using Sequelize
- Validate all models and associations
- Initialize Socket.IO for real-time proctoring

### Step 4: Verify API Endpoints
Test the following endpoints to ensure the migration is successful:

#### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- PUT `/api/auth/change-password` - Change password

#### Exams (Faculty)
- POST `/api/exams` - Create exam
- GET `/api/exams` - List exams
- GET `/api/exams/:id` - Get exam details
- PUT `/api/exams/:id` - Update exam
- DELETE `/api/exams/:id` - Delete exam
- PATCH `/api/exams/:id/status` - Update exam status

#### Submissions (Students)
- POST `/api/submissions/start/:examId` - Start exam
- PUT `/api/submissions/:id/save` - Auto-save answers
- PUT `/api/submissions/:id/submit` - Submit exam
- GET `/api/submissions/my` - Get my submissions
- GET `/api/submissions/exam/:examId` - Get all submissions for exam

#### Violations & Restrictions
- POST `/api/violations` - Log violation
- GET `/api/violations/exam/:examId` - Get exam violations
- GET `/api/violations/student/:examId` - Get my violations
- GET `/api/violations/restrictions/:examId` - Get restrictions

#### Admin
- GET `/api/admin/faculty` - List faculty
- POST `/api/admin/faculty` - Create faculty
- PATCH `/api/admin/faculty/:id/status` - Toggle faculty status
- PUT `/api/admin/faculty/:id/password` - Reset faculty password
- DELETE `/api/admin/faculty/:id` - Delete faculty

## Key Differences from MongoDB to Sequelize

### Query Syntax Changes

**MongoDB (Mongoose):**
```javascript
await User.findOne({ email: 'test@example.com' })
await User.find({ role: { $in: ['teacher', 'faculty'] } })
```

**Sequelize:**
```javascript
await User.findOne({ where: { email: 'test@example.com' } })
await User.findAll({ where: { role: { [Op.in]: ['teacher', 'faculty'] } } })
```

### Population vs Associations

**MongoDB (Mongoose):**
```javascript
await Exam.find().populate('faculty', 'name email')
```

**Sequelize:**
```javascript
await Exam.findAll({
  include: [{
    model: User,
    as: 'faculty',
    attributes: ['name', 'email']
  }]
})
```

### Updates

**MongoDB (Mongoose):**
```javascript
await user.updateOne({ field: value })
```

**Sequelize:**
```javascript
await user.update({ field: value })
```

## Important Notes

### 1. Nested Data Handling
MongoDB allowed nested arrays (questions, answers, etc.). MySQL/Sequelize uses separate tables with foreign keys:

- Exam questions are now in `exam_questions` table
- Question options are in `question_options` table  
- Test cases are in `test_cases` table
- Submission answers are in `submission_answers` table

### 2. Unique Constraints
The `submissions` table has a unique constraint on `(exam_id, student_id)` to ensure one submission per student per exam.

### 3. Field Naming Conventions
- Sequelize automatically converts camelCase to snake_case in database
- `facultyId` → `faculty_id`
- `studentId` → `student_id`
- `createdAt` → `created_at`

### 4. Password Hashing
The User model includes a `beforeCreate` hook that automatically hashes passwords using bcrypt. No manual hashing is needed.

## Troubleshooting

### Connection Issues
```
Error: Cannot connect to MySQL
```
- Verify MySQL is running: `mysql -u root -p`
- Check credentials in `.env`
- Ensure database exists: `CREATE DATABASE proctor;`

### Model Sync Issues
```
SequelizeConnectionRefusedError
```
- Ensure all required tables exist (created during `sequelize.sync()`)
- Check `src/config/mysql.js` configuration

### Query Issues
```
Error: include is not a function
```
- Make sure to import models from `src/models_sql/`
- Use `.findAll()` instead of `.find()` for multiple records

### Token/Auth Issues
```
JWT_SECRET not found
```
- Add `JWT_SECRET` to `.env`
- Restart the server after adding environment variables

## Next Steps

1. ✅ All controllers migrated
2. ✅ All models created with associations
3. ✅ Database configuration updated
4. ✅ Migration script ready
5. **Run migration with production data**
6. **Test all API endpoints thoroughly**
7. **Update frontend if needed (should be unchanged)**
8. **Remove old MongoDB models from codebase**
9. **Remove mongoose dependency from package.json** (optional)
10. **Deploy to production**

## Files Modified/Created

**Modified:**
- `src/controllers/authController.js`
- `src/controllers/adminController.js`
- `src/controllers/examController.js`
- `src/controllers/submissionController.js`
- `src/controllers/violationController.js`
- `src/middleware/authMiddleware.js`
- `src/config/db.js`
- `src/server.js`

**Created:**
- `src/models_sql/Exam.js`
- `src/models_sql/ExamQuestion.js`
- `src/models_sql/QuestionOption.js`
- `src/models_sql/TestCase.js`
- `src/models_sql/Submission.js`
- `src/models_sql/SubmissionAnswer.js`
- `src/models_sql/Violation.js`
- `src/models_sql/Restriction.js`
- `src/models_sql/index.js` (associations)
- `src/migrate.js` (migration script)

## Support & Debugging

For issues during migration:
1. Check server logs: `npm start` output
2. Review migration logs from `migrate.js`
3. Verify database state: `SELECT * FROM users;` in MySQL
4. Check API response codes and error messages
5. Enable query logging in `src/config/mysql.js` if needed

---

**Last Updated:** 2024
**Status:** Ready for Testing
