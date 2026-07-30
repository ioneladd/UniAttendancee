import os
import requests
import random
import string

def generate_otp():
    """Generează un cod aleatoriu de 6 cifre."""
    return ''.join(random.choices(string.digits, k=6))

def send_otp_email(receiver_email: str, otp_code: str):
    """Trimite codul OTP via Brevo API pe HTTP, ocolind blocajul Render."""
    url = "https://api.brevo.com/v3/smtp/email"
    
    # Preluăm cheia din variabilele de mediu
    api_key = os.environ.get("BREVO_API_KEY")
    if not api_key:
        print("Eroare: Nu ai setat BREVO_API_KEY în variabilele de mediu!")
        return False
        
    payload = {
        "sender": {"name": "UniAttendance", "email": "uniattendancee@gmail.com"},
        "to": [{"email": receiver_email}],
        "subject": "Codul tău de conectare UniAttendance",
        "htmlContent": f"""
        <p>Salut,</p>
        <p>Codul tău de conectare pentru UniAttendance este: <strong>{otp_code}</strong></p>
        <p>Acest cod este valabil 10 minute. Dacă nu ai solicitat conectarea, te rugăm să ignori acest mesaj.</p>
        <p>O zi frumoasă,<br>UniAttendance</p>
        """
    }
    
    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json"
    }
    
    try:
        # Trimitem cererea ca trafic web normal, Render o va lăsa să treacă
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 201:
            return True
        else:
            print(f"Eroare la trimiterea API: {response.text}")
            return False
    except Exception as e:
        print(f"Eroare de rețea: {e}")
        return False