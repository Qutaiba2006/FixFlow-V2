# FixFlow — Campus Maintenance Reporting System

FixFlow is a web application designed to make reporting and managing maintenance issues on university campuses easier.

Students can report problems, support existing reports, and follow their progress. Administrators can manage maintenance requests and assign technicians, while technicians can track their assigned tasks and update their status.

I built this project to practice backend development, REST APIs, authentication, database integration, and building a system with different user roles.

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB & Mongoose
- JWT Authentication
- bcryptjs
- Cloudinary for image uploads
- Nodemailer for email notifications

### Frontend
- React
- TypeScript
- Vite
- Responsive UI
- Light and Dark Mode

## Features

### Student
- Register and log in
- Create and manage maintenance reports
- Browse the Campus Feed
- Search and filter reports
- Support reports and mark themselves as affected
- Follow maintenance status updates
- View their own reports

### Technician
- View assigned maintenance reports
- Track maintenance tasks
- Update report status
- Follow maintenance timelines

### Admin
- Manage campus maintenance reports
- Assign and reassign technicians
- Monitor report progress
- Access the Analytics Dashboard
- View report statistics and campus locations

### Smart Priority System

FixFlow includes a priority system that uses student interactions to help highlight maintenance issues affecting more people.

Students can support a report or indicate that they are experiencing the same problem. These interactions contribute to the report's priority score.

### Maintenance Timeline

Reports maintain a timeline of important events, such as creation, technician assignment, and status updates.

## Project Structure

```text
FixFlow/
├── Backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── services/
│
└── Frontend/
    ├── src/
    ├── public/
    └── package.json
```

The backend follows an MVC-style structure, separating routes, controllers, models, and middleware.

The frontend communicates with the Express REST API to retrieve and update application data.

## Running Locally

### Requirements

- Node.js and npm
- MongoDB or a configured test database
- The required backend environment variables

Clone the repository and install the project dependencies.

From the `Frontend` directory:

```bash
npm install
```

Start the configured local API:

```bash
npm run local-api
```

Then open another terminal in the same directory and start the frontend:

```bash
npm run dev
```

Open the local URL displayed by Vite, normally:

```text
http://localhost:5173
```

For the isolated local test environment, the available test-account script is:

```bash
npm run local-accounts
```

The local API setup and environment variables must be configured correctly before using database-dependent features. Never use production credentials or databases for testing.

## Development and Testing

During development, I tested the main application workflows, including authentication, report creation, student interactions, technician assignments, status changes, and database persistence.

The experimental frontend was also checked with build, lint, and automated browser tests.

Some external integrations, including Cloudinary uploads and email delivery, require additional verification in the target deployment environment.

## AI Usage

I developed the backend of FixFlow using Node.js, Express.js, and MongoDB.

For the frontend, I used **OpenAI Codex** to design and generate a new React and TypeScript interface based on my existing backend APIs.

This was also an opportunity for me to explore AI-assisted development and learn more about frontend architecture, TypeScript, and user interface design.

## Future Improvements

- Improve automated testing coverage
- Strengthen error handling and validation
- Improve concurrent database operations
- Refine the maintenance tracking experience
- Continue improving frontend accessibility and usability

## About the Project

FixFlow started as a university software development project.

My main focus was understanding how to design backend APIs, manage users and permissions, work with MongoDB, and connect the different parts of a full-stack application.

The project is still open to improvements as I continue learning software engineering.

---

Built as a learning project by a Software Engineering student.