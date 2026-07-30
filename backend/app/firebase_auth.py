import firebase_admin
from firebase_admin import credentials, auth
from app.config import settings
import os

# Initialize Firebase Admin (o singură dată)
cred_path = os.path.join(os.path.dirname(__file__), '..', settings.firebase_credentials)
cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)

def verify_firebase_token(token: str):
    """
    Verifică token-ul Firebase primit de la frontend.
    
    Args:
        token (str): JWT token de la Firebase
        
    Returns:
        dict: Informații despre user (uid, email, name) sau None dacă invalid
    """
    try:
        # Verifică token-ul cu Firebase si adăugăm 10 secunde toleranță pentru ceasuri desincronizate
        decoded_token = auth.verify_id_token(token, clock_skew_seconds=10)
        
        # Extrage informații
        uid = decoded_token['uid']
        email = decoded_token.get('email')
        name = decoded_token.get('name')
        
        print(f"✅ Token valid pentru user: {email}")
        
        return {
            'uid': uid,
            'email': email,
            'name': name
        }
    
    except Exception as e:
        print(f"❌ Token invalid: {str(e)}")
        return None