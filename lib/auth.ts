"use client";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

export async function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  await signOut(auth);
}

export function observeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function isUserAdmin(uid: string) {
  const adminDoc = await getDoc(doc(db, 'admins', uid));
  return adminDoc.exists() && adminDoc.data()?.enabled === true;
}

export async function isUserShelter(uid: string) {
  const shelterDoc = await getDoc(doc(db, 'shelters', uid));
  return shelterDoc.exists() && shelterDoc.data()?.enabled === true;
}
