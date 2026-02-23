# OKR-360 API Reference

**Base URL:** `http://localhost:3000`  
**Auth:** Cookie-based session (set automatically after sign-in)  
**Content-Type:** `application/json` on all requests

---

## Table of Contents

- [Auth](#-auth)
- [Employees](#-employees)
- [Cycles](#-cycles)
- [Assignments](#-assignments)
- [Reviewers](#-reviewers)
- [Questions](#-questions)
- [Self Feedback](#-self-feedback)
- [Responses (Surveys)](#-responses-surveys)
- [Competencies](#-competencies)
- [Scores](#-scores)
- [Reports](#-reports)
- [Admin](#-admin)
- [Health](#-health)

---

## 🔐 Auth

### Sign Up
```
POST /api/auth/sign-up/email
```
```json
{
  "email": "devarsh@motadata.com",
  "password": "Motadata@123",
  "name": "Devarsh Mehta"
}
```

### Sign In
```
POST /api/auth/sign-in/email
```
```json
{
  "email": "devarsh@motadata.com",
  "password": "Motadata@123"
}
```

### Sign Out
```
POST /api/auth/sign-out
```
> No body required.

### Get Session
```
GET /api/auth/get-session
```

### Get Current User
```
GET /api/v1/auth/me
```

---

## 👥 Employees

### List All Employees
```
GET /api/v1/employees
```

### Get Employee by ID
```
GET /api/v1/employees/:id
```

### Create Employee
```
POST /api/v1/employees
```
```json
{
  "name": "Rahul Patel",
  "email": "rahul@motadata.com",
  "department": "Engineering",
  "designation": "Software Engineer",
  "role": "employee",
  "managerId": null
}
```

### Update Employee
```
PUT /api/v1/employees/:id
```
```json
{
  "name": "Rahul Patel",
  "department": "Product",
  "designation": "Senior Engineer"
}
```

### Delete Employee
```
DELETE /api/v1/employees/:id
```

---

## 🔄 Cycles

### List All Cycles
```
GET /api/v1/cycles
```

### Get Cycle by ID
```
GET /api/v1/cycles/:id
```

### Create Cycle
```
POST /api/v1/cycles
```
```json
{
  "name": "Q1 2026",
  "startDate": "2026-01-01",
  "endDate": "2026-03-31",
  "status": "active"
}
```

### Update Cycle
```
PUT /api/v1/cycles/:id
```
```json
{
  "name": "Q1 2026 Updated",
  "status": "closed"
}
```

### Delete Cycle
```
DELETE /api/v1/cycles/:id
```

---

## 📋 Assignments

### List All Assignments
```
GET /api/v1/assignments
```

### Get Assignment by ID
```
GET /api/v1/assignments/:id
```

### Create Assignment
```
POST /api/v1/assignments
```
```json
{
  "cycleId": "<cycle-uuid>",
  "revieweeId": "<employee-uuid>",
  "reviewerId": "<employee-uuid>",
  "type": "peer"
}
```

### Delete Assignment
```
DELETE /api/v1/assignments/:id
```

---

## 👤 Reviewers

### List Reviewers
```
GET /api/v1/reviewers
```

### Assign Reviewer
```
POST /api/v1/reviewers
```
```json
{
  "revieweeId": "<employee-uuid>",
  "reviewerId": "<employee-uuid>",
  "cycleId": "<cycle-uuid>"
}
```

### Remove Reviewer
```
DELETE /api/v1/reviewers/:id
```

---

## ❓ Questions

### List All Questions
```
GET /api/v1/questions
```

### Get Question by ID
```
GET /api/v1/questions/:id
```

### Create Question
```
POST /api/v1/questions
```
```json
{
  "text": "How well does this person collaborate with the team?",
  "type": "rating",
  "category": "teamwork",
  "isActive": true
}
```

### Update Question
```
PUT /api/v1/questions/:id
```
```json
{
  "text": "Updated question text",
  "isActive": false
}
```

### Delete Question
```
DELETE /api/v1/questions/:id
```

---

## 🪞 Self Feedback

### Get My Self Feedback
```
GET /api/v1/self-feedback
```

### Submit Self Feedback
```
POST /api/v1/self-feedback
```
```json
{
  "cycleId": "<cycle-uuid>",
  "questionId": "<question-uuid>",
  "rating": 4,
  "comment": "I believe I performed well this quarter."
}
```

### Update Self Feedback
```
PUT /api/v1/self-feedback/:id
```
```json
{
  "rating": 5,
  "comment": "Revised assessment."
}
```

---

## 💬 Responses (Surveys)

### List Responses
```
GET /api/v1/surveys
```

### Submit Response
```
POST /api/v1/surveys
```
```json
{
  "assignmentId": "<assignment-uuid>",
  "questionId": "<question-uuid>",
  "rating": 4,
  "comment": "Great collaborator, always helpful."
}
```

### Update Response
```
PUT /api/v1/surveys/:id
```
```json
{
  "rating": 5,
  "comment": "Updated feedback."
}
```

---

## 🧠 Competencies

### List All Competencies
```
GET /api/v1/competencies
```

### Get Competency by ID
```
GET /api/v1/competencies/:id
```

### Create Competency
```
POST /api/v1/competencies
```
```json
{
  "name": "Communication",
  "description": "Ability to communicate clearly and effectively",
  "category": "soft-skills"
}
```

### Update Competency
```
PUT /api/v1/competencies/:id
```
```json
{
  "name": "Communication",
  "description": "Updated description"
}
```

### Delete Competency
```
DELETE /api/v1/competencies/:id
```

---

## 📊 Scores

### List All Scores
```
GET /api/v1/scores
```

### Get Scores by Employee
```
GET /api/v1/scores/employee/:employeeId
```

### Get Scores by Cycle
```
GET /api/v1/scores/cycle/:cycleId
```

### Trigger Score Calculation
```
POST /api/v1/scores/calculate
```
```json
{
  "cycleId": "<cycle-uuid>"
}
```

---

## 📈 Reports

### Get Results Dashboard
```
GET /api/v1/results
```

### Get Results by Cycle
```
GET /api/v1/results/:cycleId
```

### Get Employee Report
```
GET /api/v1/reports/employee/:employeeId
```

### Get Cycle Report
```
GET /api/v1/reports/cycle/:cycleId
```

---

## 🛡️ Admin

### List All Users
```
GET /api/v1/admin/users
```

### Update User Role
```
PUT /api/v1/admin/users/:id/role
```
```json
{
  "role": "admin"
}
```

### Get Audit Log
```
GET /api/v1/admin/audit-log
```

### Seed Admin User
```
POST /api/v1/admin/seed
```

---

## 🩺 Health

### Health Check
```
GET /health
```

### API Index (lists all routes)
```
GET /
```

---

## Recommended Test Order

```
1.  POST /api/auth/sign-up/email          ← create account
2.  POST /api/auth/sign-in/email          ← get session cookie
3.  GET  /api/v1/auth/me                  ← verify session
4.  POST /api/v1/employees                ← create employees
5.  POST /api/v1/cycles                   ← create a review cycle
6.  POST /api/v1/questions                ← add questions
7.  POST /api/v1/assignments              ← assign reviewers
8.  POST /api/v1/surveys                  ← submit responses
9.  POST /api/v1/self-feedback            ← submit self assessment
10. POST /api/v1/scores/calculate         ← calculate scores
11. GET  /api/v1/results/:cycleId         ← view results
12. GET  /api/v1/reports/cycle/:cycleId   ← download report
```

---

## Postman Tips

- Import the collection from `postman/360-Feedback-API.postman_collection.json`
- Import the environment from `postman/360-Feedback-Local.postman_environment.json`
- After sign-in, Postman auto-stores the `okr360.*` session cookie for all subsequent requests
- Set `{{baseUrl}}` variable to `http://localhost:3000` in your environment
