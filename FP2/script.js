// script.js — Firestore-backed, per-user data
// All functions are called from index.html after Firebase is initialised
// and currentUser is set. This file must be loaded as a regular script
// (not a module) so its functions stay global for onclick handlers.

/* ── globals set by index.html before this script runs ──────────────── */
// window.firestoreDb  – Firestore instance
// window.currentUser  – Firebase user object
/* ─────────────────────────────────────────────────────────────────────── */

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// Wait for the app to expose db + user (set in index.html module script)
function waitForApp(cb) {
  if (window.firestoreDb && window.currentUser) {
    cb();
  } else {
    setTimeout(() => waitForApp(cb), 80);
  }
}

/* ── helpers ─────────────────────────────────────────────────────────── */
function userCol(colName) {
  // path: users/{uid}/{colName}
  return collection(window.firestoreDb, "users", window.currentUser.uid, colName);
}

async function addItem(colName, data) {
  await addDoc(userCol(colName), { ...data, createdAt: Date.now() });
}

async function getItems(colName) {
  const q = query(userCol(colName), orderBy("createdAt"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
}

async function removeItem(colName, firestoreId) {
  await deleteDoc(doc(window.firestoreDb, "users", window.currentUser.uid, colName, firestoreId));
}

/* ── nav ─────────────────────────────────────────────────────────────── */
document.querySelectorAll(".nav-btn").forEach(btn => {
  if (!btn.dataset.section) return;
  btn.onclick = () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
    document.getElementById(btn.dataset.section + "-section").classList.add("active");
  };
});

/* ── SUBJECTS ────────────────────────────────────────────────────────── */
document.getElementById("add-subject-btn").onclick = async () => {
  const name = document.getElementById("subject-name").value.trim();
  if (!name) return alert("Enter subject name");
  await addItem("subjects", { name });
  document.getElementById("subject-name").value = "";
  renderSubjects();
};

async function renderSubjects() {
  const box = document.getElementById("subjects-list");
  box.innerHTML = "<em style='color:#999'>Loading…</em>";
  const items = await getItems("subjects");
  box.innerHTML = "";
  items.forEach(s => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `<span>${s.name}</span>
      <button class="delete-file" onclick="deleteSubject('${s.firestoreId}')">Delete</button>`;
    box.appendChild(div);
  });
  updateSelector(items);
}

window.deleteSubject = async (firestoreId) => {
  await removeItem("subjects", firestoreId);
  renderSubjects();
};

/* ── TOPICS ──────────────────────────────────────────────────────────── */
document.getElementById("add-topic-btn").onclick = async () => {
  const name = document.getElementById("topic-name").value.trim();
  if (!name) return alert("Enter topic name");
  await addItem("topics", { name });
  document.getElementById("topic-name").value = "";
  renderTopics();
};

async function renderTopics() {
  const box = document.getElementById("topics-list");
  box.innerHTML = "<em style='color:#999'>Loading…</em>";
  const items = await getItems("topics");
  box.innerHTML = "";
  items.forEach(t => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `<span>${t.name}</span>
      <button class="delete-file" onclick="deleteTopic('${t.firestoreId}')">Delete</button>`;
    box.appendChild(div);
  });
}

window.deleteTopic = async (firestoreId) => {
  await removeItem("topics", firestoreId);
  renderTopics();
};

/* ── NOTES ───────────────────────────────────────────────────────────── */
document.getElementById("add-note-btn").onclick = async () => {
  const title   = document.getElementById("note-title").value.trim();
  const content = document.getElementById("note-content").value.trim();
  if (!title || !content) return alert("Fill both fields");
  await addItem("notes", { title, content });
  document.getElementById("note-title").value   = "";
  document.getElementById("note-content").value = "";
  renderNotes();
};

async function renderNotes() {
  const box = document.getElementById("notes-list");
  box.innerHTML = "<em style='color:#999'>Loading…</em>";
  const items = await getItems("notes");
  box.innerHTML = "";
  items.forEach(n => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div>
        <b>${n.title}</b>
        <p style="margin-top:5px;color:#555">${n.content}</p>
      </div>
      <button class="delete-file" onclick="deleteNote('${n.firestoreId}')">Delete</button>`;
    box.appendChild(div);
  });
}

window.deleteNote = async (firestoreId) => {
  await removeItem("notes", firestoreId);
  renderNotes();
};

/* ── SUBJECT SELECTOR (for file upload) ─────────────────────────────── */
function updateSelector(items) {
  const sel = document.getElementById("subject-selector");
  sel.innerHTML = '<option value="">-- Select Subject --</option>';
  items.forEach(s => {
    const opt = document.createElement("option");
    opt.value       = s.firestoreId;
    opt.textContent = s.name;
    sel.appendChild(opt);
  });
}

/* ── FILES (IndexedDB – keyed per user UID) ──────────────────────────── */
// We namespace the IndexedDB store by UID so files don't bleed across users.
let idb;

function openIDB() {
  return new Promise((resolve, reject) => {
    const uid  = window.currentUser.uid;
    const name = `StudyManagerFiles_${uid}`;   // unique DB per user
    const req  = indexedDB.open(name, 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore("files", { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function getIDB() {
  if (!idb) idb = await openIDB();
  return idb;
}

document.getElementById("upload-files-btn").onclick = async () => {
  const files     = document.getElementById("file-upload").files;
  const subjectId = document.getElementById("subject-selector").value;
  if (!files.length) return alert("Select files");
  if (!subjectId)    return alert("Select a subject");

  const db  = await getIDB();
  const tx  = db.transaction("files", "readwrite");
  const store = tx.objectStore("files");
  Array.from(files).forEach(file => store.add({ file, name: file.name, subjectId }));
  tx.oncomplete = renderFiles;
};

async function renderFiles() {
  const db    = await getIDB();
  const tx    = db.transaction("files", "readonly");
  const store = tx.objectStore("files");
  const req   = store.getAll();

  req.onsuccess = e => {
    const files = e.target.result;
    const box   = document.getElementById("uploaded-files-list");
    box.innerHTML = "";
    files.forEach(f => {
      const url = URL.createObjectURL(f.file);
      const div = document.createElement("div");
      div.className = "file-item";
      div.innerHTML = `
        <span>${f.name}</span>
        <div class="file-actions">
          <a href="${url}" download="${f.name}" class="download-file">Download</a>
          <button class="view-file" onclick="window.open('${url}','_blank')">View</button>
          <button class="delete-file" onclick="deleteFile(${f.id})">Delete</button>
        </div>`;
      box.appendChild(div);
    });
  };
}

window.deleteFile = async (id) => {
  const db    = await getIDB();
  const tx    = db.transaction("files", "readwrite");
  tx.objectStore("files").delete(id);
  tx.oncomplete = renderFiles;
};

/* ── BOOT ────────────────────────────────────────────────────────────── */
waitForApp(() => {
  renderSubjects();
  renderTopics();
  renderNotes();
  renderFiles();
});