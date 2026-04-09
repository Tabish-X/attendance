        // Import the functions you need from the SDKs you need

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDZJ9XseeGuBVkmhb5-HrcwRSVAChXs8WI",
    authDomain: "study-manager-f9333.firebaseapp.com",
    projectId: "study-manager-f9333",
    storageBucket: "study-manager-f9333.firebasestorage.app",
    messagingSenderId: "169786797073",
    appId: "1:169786797073:web:6254390c0d98f7f7f355b0",
    measurementId: "G-V802KRGFYM"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

function showMessage(message, divId) {
    const messageDiv = document.getElementById(divId);
    if (messageDiv) {
        messageDiv.style.display = "block";
        messageDiv.innerHTML = message;
        messageDiv.style.opacity = "1";
        setTimeout(function() {
            messageDiv.style.opacity = "0";
        }, 5000);
    }
}

// SIGNUP
const signUpBtn = document.getElementById("submitSignUp");
if (signUpBtn) {
    signUpBtn.addEventListener("click", function(event) {
        event.preventDefault();
        const fullName = document.getElementById("signup-name").value;
        const email = document.getElementById("signup-email").value;
        const password = document.getElementById("signup-password").value;

        if (!fullName || !email || !password) {
            showMessage('Please fill all fields', 'signUpMessage');
            return;
        }

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                const userData = {
                    fullName: fullName,
                    email: email
                };
                showMessage('Account created successfully! Redirecting...', 'signUpMessage');
                const docRef = doc(db, "users", user.uid);
                setDoc(docRef, userData)
                    .then(() => {
                        setTimeout(() => {
                            window.location.href = "index.html";
                        }, 2000);
                    })
                    .catch((error) => {
                        console.error("Error saving data: ", error);
                        showMessage('Error saving profile', 'signUpMessage');
                    });
            })
            .catch((error) => {
                const errorCode = error.code;
                if (errorCode === 'auth/email-already-in-use') {
                    showMessage('Email already exists', 'signUpMessage');
                } else if (errorCode === 'auth/weak-password') {
                    showMessage('Password too weak (min 6 characters)', 'signUpMessage');
                } else {
                    showMessage('Error: ' + error.message, 'signUpMessage');
                }
            });
    });
}

// LOGIN
const loginBtn = document.getElementById("submitLogin");
if (loginBtn) {
    loginBtn.addEventListener("click", function(event) {
        event.preventDefault();
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;

        if (!email || !password) {
            showMessage('Please fill all fields', 'signInMessage');
            return;
        }

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                showMessage('Login successful! Redirecting...', 'signInMessage');
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 2000);
            })
            .catch((error) => {
                const errorCode = error.code;
                if (errorCode === 'auth/user-not-found') {
                    showMessage('Email not found', 'signInMessage');
                } else if (errorCode === 'auth/wrong-password') {
                    showMessage('Wrong password', 'signInMessage');
                } else {
                    showMessage('Error: ' + error.message, 'signInMessage');
                }
            });
    });
}

// Check authentication status
onAuthStateChanged(auth, (user) => {
    if (user && window.location.pathname.includes('login.html')) {
        window.location.href = "index.html";
    } else if (!user && window.location.pathname.includes('index.html')) {
        window.location.href = "login.html";
    }
});
