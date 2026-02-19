"use client";

import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

export async function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
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
