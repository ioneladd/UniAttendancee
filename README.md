# UniAttendance

UniAttendance is a web application for managing and monitoring student attendance at university courses and events.

Teachers can create courses and attendance sessions, while students can mark their attendance by scanning a dynamic QR code. The QR code is regenerated every three seconds to reduce the possibility of sharing it with people who are not physically present in the classroom.

The project was developed as a bachelor's thesis within the Computer Engineering degree program.

## Features

### Teacher

- authentication;
- create, edit, and delete courses;
- generate course enrollment codes;
- start and close attendance sessions;
- generate a dynamic QR code for each attendance session;
- view attendance records in real time;
- manually add a student to an attendance session;
- cancel an attendance record;
- add notes and bonus points.

### Student

- authentication;
- enroll in courses using a code provided by the teacher;
- scan the QR code to register attendance;
- view enrolled courses;
- view participation in events and additional activities;
- receive a confirmation message after attendance is registered.

### Visitor

- scan the QR code and enter their name to register attendance.

### Admin

- manage personal accounts registered on the platform that are not affiliated with the university.

## Technologies Used

### Frontend

- React
- Vite
- Tailwind CSS

### Backend

- Python
- FastAPI
- WebSockets
- Firebase Authentication

### Database

- PostgreSQL
- Supabase
- Docker for local development

### Hosting

- Vercel for the frontend
- Render for the backend
- Supabase for the database

## Demo

The application is available online:

- [UniAttendance](https://uniattendance.vercel.app/)
- [Backend API](https://uniattendance.onrender.com/api)

### Demo Video

- [Watch the application demo](<https://youtu.be/QbEBdEzagX0>)

## How It Works

The teacher creates a course and generates an enrollment code, which is then shared with the students.

To register attendance, the teacher starts an attendance session. The application displays a QR code that is automatically regenerated every three seconds.

The student opens the application, activates the camera, and scans the displayed QR code. After the code is validated, the attendance record is created and appears in real time on the teacher's page.

At the end of the course, the teacher closes the attendance session, and the generated QR codes can no longer be used.

## Local Setup

### Requirements

The following tools are required to run the project locally:

- Python
- Node.js
- npm
- Docker
- Git

### 1. Clone the Repository

```bash
git clone <REPOSITORY_URL>
cd uniattendance
```

### 2. Configure Environment Variables

Create the required `.env` files in the `frontend` and `backend` directories.

These files must contain the configuration data for:

- Firebase;
- the PostgreSQL database;
- the external services used by the application.

The `.env` files must not be committed to the repository.

### 3. Start the Database

To run the database locally:

```bash
docker compose up -d
```

### 4. Start the Backend

Open a terminal and navigate to the backend directory:

```bash
cd backend
python -m venv venv
```

Activate the virtual environment on Windows:

```bash
venv\Scripts\activate
```

Activate the virtual environment on Linux or macOS:

```bash
source venv/bin/activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Start the server:

```bash
uvicorn app.main:app --reload
```

The backend will normally be available at:

```text
http://localhost:8000
```

The API documentation can be accessed at:

```text
http://localhost:8000/docs
```

### 5. Start the Frontend

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

## Project Structure

```text
uniattendance/
├── backend/
├── frontend/
├── docker-compose.yml
└── README.md
```

## QR Code Security

Each QR code contains a temporary token associated with an active attendance session.

The token changes every three seconds. If a code expires before it can be scanned, the student can keep the camera pointed at the screen to scan the next valid code.

After the attendance session is closed, the generated codes can no longer be used to register attendance.

## Author

**Ionela-Valentina Dică**

Bachelor's thesis project developed within the Computer Engineering degree program.
