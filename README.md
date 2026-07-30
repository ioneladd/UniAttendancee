# UniAttendance

UniAttendance este o aplicație web pentru gestionarea și monitorizarea prezenței studenților la cursuri și evenimente universitare.

Profesorii pot crea cursuri și sesiuni de prezență, iar studenții își pot marca prezența prin scanarea unui cod QR dinamic. Codul QR se regenerează la fiecare trei secunde, pentru a reduce posibilitatea distribuirii acestuia către persoanele care nu se află în sală.

Proiectul a fost realizat ca proiect de diplomă în cadrul specializării Calculatoare.

## Funcționalități

### Cadru didactic

- autentificare în aplicație;
- creare, editare și ștergere a cursurilor;
- generarea codurilor de înscriere pentru cursuri;
- pornirea și închiderea sesiunilor de prezență;
- generarea unui cod QR dinamic pentru fiecare sesiune;
- vizualizarea prezențelor în timp real;
- adăugarea manuală a unui student la sesiune;
- anularea unei prezențe;
- adăugarea de observații și puncte bonus.

### Student

- autentificare în aplicație;
- înscrierea la cursuri prin introducerea unui cod primit de la profesor;
- scanarea codului QR pentru înregistrarea prezenței;
- vizualizarea cursurilor la care este înscris;
- vizualizarea participărilor la evenimente și activități suplimentare;
- primirea unui mesaj de confirmare după înregistrarea prezenței.

### Vizitator

- scanarea codului QR și completarea propriului nume pentru înregistrarea prezenței.

### Admin

- gestionează conturile personale înregistrate pe platformă, care nu aparțin universității.

## Tehnologii utilizate

### Frontend

- React
- Vite
- Tailwind CSS

### Backend

- Python
- FastAPI
- WebSockets
- Firebase Authentication

### Bază de date

- PostgreSQL
- Supabase
- Docker pentru rularea locală

### Găzduire

- Vercel pentru frontend
- Render pentru backend
- Supabase pentru baza de date

## Demo

Aplicația este disponibilă online:

- [UniAttendance](https://uniattendance.vercel.app/)
- [Backend API](https://uniattendance.onrender.com/api)

### Demo video

- [Vizualizează demonstrația aplicației](<LINK_VIDEO>)

## Cum funcționează

Profesorul creează un curs și generează un cod de înscriere pe care îl oferă studenților.

Pentru înregistrarea prezenței, profesorul pornește o sesiune. Aplicația afișează un cod QR care se regenerează automat la fiecare trei secunde.

Studentul deschide aplicația, pornește camera și scanează codul QR afișat. După validarea codului, prezența este înregistrată și apare în timp real în pagina profesorului.

La finalul cursului, profesorul închide sesiunea, iar codul QR nu mai poate fi utilizat.

## Rulare locală

### Cerințe

Pentru rularea proiectului sunt necesare:

- Python
- Node.js
- npm
- Docker
- Git

### 1. Clonarea repository-ului

```bash
git clone <URL_REPOSITORY>
cd uniattendance
```

### 2. Configurarea variabilelor de mediu

Creează fișierele `.env` necesare în directoarele `frontend` și `backend`.

Acestea trebuie să conțină datele de configurare pentru:

- Firebase;
- baza de date PostgreSQL;
- serviciile externe utilizate de aplicație.

Fișierele `.env` nu trebuie încărcate în repository.

### 3. Pornirea bazei de date

Pentru rularea locală a bazei de date:

```bash
docker compose up -d
```

### 4. Pornirea backend-ului

Deschide un terminal și accesează directorul backend:

```bash
cd backend
python -m venv venv
```

Activarea mediului virtual pe Windows:

```bash
venv\Scripts\activate
```

Activarea mediului virtual pe Linux sau macOS:

```bash
source venv/bin/activate
```

Instalează dependențele:

```bash
pip install -r requirements.txt
```

Pornește serverul:

```bash
uvicorn app.main:app --reload
```

Backend-ul va fi disponibil, în mod normal, la adresa:

```text
http://localhost:8000
```

Documentația API poate fi accesată la:

```text
http://localhost:8000/docs
```

### 5. Pornirea frontend-ului

Deschide un alt terminal și accesează directorul frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend-ul va fi disponibil, în mod normal, la adresa:

```text
http://localhost:5173
```

## Structura proiectului

```text
uniattendance/
├── backend/
├── frontend/
├── docker-compose.yml
└── README.md
```

## Securitatea codurilor QR

Fiecare cod QR conține un token temporar asociat unei sesiuni active.

Token-ul se schimbă la fiecare trei secunde. În cazul în care un cod expiră înainte de scanare, studentul poate menține camera îndreptată spre ecran pentru a scana următorul cod valid.

După închiderea sesiunii, codurile generate nu mai pot fi utilizate pentru înregistrarea unei prezențe.

## Autor

**Ionela-Valentina Dică**

Proiect de diplomă realizat în cadrul specializării Calculatoare.
