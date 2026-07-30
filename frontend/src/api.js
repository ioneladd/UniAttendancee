// src/api.js
import { auth } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Când ești pe laptop, folosești localhost. 
// Când vrei să testezi pe telefon, schimbi doar AICI cu IP-ul tău.
// const API_BASE_URL = "http://localhost:8000/api"; 
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
//console.log("🕵️‍♂️ URL-ul pe care îl vede React este:", API_BASE_URL);
const getFirebaseUser = async () => {
  if (auth.currentUser) return auth.currentUser;

  return new Promise(resolve => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe();
      resolve(user);
    });
  });
};

export async function getWebsocketToken() {
  const localToken = localStorage.getItem('token');
  if (localToken?.startsWith('otp_')) {
    return localToken;
  }

  const firebaseUser = await getFirebaseUser();
  if (!firebaseUser) {
    throw new Error('User not authenticated');
  }

  return await firebaseUser.getIdToken(true);
}

export async function getWebSocketUrl(path) {
  const token = await getWebsocketToken();
  const wsApiBase = API_BASE_URL.replace(/^http/, 'ws');
  const wsRootBase = wsApiBase.replace(/\/api$/, '');
  const baseUrl = path.startsWith('/ws/') ? wsRootBase : wsApiBase;
  const separator = path.includes('?') ? '&' : '?';
  return `${baseUrl}${path}${separator}token=${encodeURIComponent(token)}`;
}

/**
 * Helper function pentru a face fetch calls cu Authorization header automat
 * @param {string} endpoint - Endpoint path (e.g., "/courses/my-courses")
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise} - Fetch response
 */

export async function apiCall(endpoint, options = {}) {
  try {
    let token = null;

    // 1. Verificăm mai întâi dacă utilizatorul este logat cu OTP (din localStorage)
    const localToken = localStorage.getItem('token');
    
    if (localToken?.startsWith('otp_')) {
      token = localToken; // Am găsit legitimația de OTP!
    } else {
      // 2. Pentru Google, așteptăm Firebase să încarce utilizatorul și obținem token proaspăt
      const firebaseUser = await getFirebaseUser();
      if (firebaseUser) {
        token = await firebaseUser.getIdToken(); // obținem token proaspăt, chiar dacă precedentul a expirat
      }
    }

    // Dacă nu avem absolut niciun token, abia atunci blocăm accesul
    if (!token) {
      throw new Error('User not authenticated');
    }

    // Atașăm token-ul găsit la cererea către Backend
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    // Facem cererea finală
    const response = await fetch(API_BASE_URL + endpoint, {
      ...options,
      headers
    });

    return response;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
}

export default API_BASE_URL;