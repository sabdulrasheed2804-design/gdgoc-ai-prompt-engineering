export const PROGRAM = {
  name: 'AI Prompt Engineering Cluster',
  weekStart: '2026-11-12',
  timezone: 'Africa/Lagos',
};

// apiKey below is a Firebase *web* API key, not a secret: Firebase ships it
// in every client bundle by design (see
// https://firebase.google.com/docs/projects/api-keys), and it grants no
// access by itself -- that's what firestore.rules governs. GitHub's
// secret scanner still flags it as a "Google API Key" pattern match; see
// repo Security > Secret scanning alerts for that alert's resolution.
// Hardened anyway via HTTP-referrer + API restrictions in Google Cloud
// Console, as a precaution against unrelated quota/billing abuse.
export const FIREBASE = {
  projectId: 'gdgoc-prompt-eng',
  appId: '1:761427270056:web:a0458290a2d800ff80a59d',
  storageBucket: 'gdgoc-prompt-eng.firebasestorage.app',
  apiKey: 'AIzaSyAq6sEgfAe659YofdBXq0kOYeza0yptFGs',
  authDomain: 'gdgoc-prompt-eng.firebaseapp.com',
  messagingSenderId: '761427270056',
};
