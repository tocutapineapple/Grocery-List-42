import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";

// ---------- FIREBASE SETUP ----------
const firebaseConfig = {
    apiKey: "AIzaSyB4YBWLnW1VzxPZ6nBPerjSk-fANf1rt9w",
    authDomain: "grocery-list-42-pui-pisi.firebaseapp.com",
    databaseURL: "https://grocery-list-42-pui-pisi-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "grocery-list-42-pui-pisi",
    storageBucket: "grocery-list-42-pui-pisi.firebasestorage.app",
    messagingSenderId: "330926980918",
    appId: "1:330926980918:web:193a5296301535523a7d97"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Your private list "address". Anyone who knows this exact name can see the list,
// so keep it secret. Change it to any long random text if you ever want a fresh list.
const LIST_ID = "pui-pisi-x7Kq2mP9vR4tZ8wB3nC6hY5d";
const listRef = ref(db, "lists/" + LIST_ID);

// ---------- PAGE ELEMENTS ----------
const itemInput = document.getElementById('item-input');
const familySelect = document.getElementById('family-select');
const addBtn = document.getElementById('add-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const puiList = document.getElementById('pui-list');
const pisiList = document.getElementById('pisi-list');
const columns = document.querySelectorAll('.list-column');
const statusEl = document.getElementById('status');

let lastJson = null;       // the last list state we saved or showed (stops echo loops)
let migrationChecked = false;

// ---------- LOADING & LIVE UPDATES ----------
onValue(listRef, (snapshot) => {
    const val = snapshot.val();

    // One-time: if the shared list is empty but this device has an old
    // saved list from before, upload it so nothing is lost.
    if (!migrationChecked) {
        migrationChecked = true;
        if (val === null) {
            const oldPui = JSON.parse(localStorage.getItem('puiShoppingList')) || [];
            const oldPisi = JSON.parse(localStorage.getItem('pisiShoppingList')) || [];
            if (oldPui.length || oldPisi.length) {
                renderLists(oldPui, oldPisi);
                saveAllListsToMemory();
                localStorage.removeItem('puiShoppingList');
                localStorage.removeItem('pisiShoppingList');
                statusEl.textContent = "Synced ✓ (your old list was uploaded)";
                return;
            }
        } else {
            localStorage.removeItem('puiShoppingList');
            localStorage.removeItem('pisiShoppingList');
        }
    }

    // Don't redraw while someone is mid-drag; our save will follow when they let go
    if (document.body.classList.contains('is-dragging')) return;

    const pui = toArray(val && val.pui);
    const pisi = toArray(val && val.pisi);
    const json = JSON.stringify({ pui, pisi });
    if (json === lastJson) {
        statusEl.textContent = "Synced ✓";
        return;
    }
    lastJson = json;
    renderLists(pui, pisi);
    statusEl.textContent = "Synced ✓";
}, (error) => {
    statusEl.textContent = "Can't connect to the shared list. Check your internet.";
    console.error(error);
});

function toArray(x) {
    if (!x) return [];
    return Array.isArray(x) ? x.filter(Boolean) : Object.values(x);
}

function renderLists(pui, pisi) {
    puiList.innerHTML = "";
    pisiList.innerHTML = "";
    pui.forEach(item => createItemElement(item.text, puiList, item.checked));
    pisi.forEach(item => createItemElement(item.text, pisiList, item.checked));
}

// ---------- BUTTONS ----------
function addItemFromInput() {
    const itemText = itemInput.value.trim();
    const chosenList = familySelect.value;

    if (itemText === "") {
        alert("Please type an item first!");
        return;
    }

    createItemElement(itemText, chosenList === "pui" ? puiList : pisiList, false);
    saveAllListsToMemory();
    itemInput.value = "";
}

addBtn.addEventListener('click', addItemFromInput);

// Pressing Enter (or "Go" on a phone keyboard) also adds the item
itemInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') addItemFromInput();
});

// CLEAR ALL BUTTON FUNCTIONALITY
clearAllBtn.addEventListener('click', function() {
    if (confirm("Are you sure you want to clear all items from both lists?")) {
        puiList.innerHTML = "";
        pisiList.innerHTML = "";
        saveAllListsToMemory();
    }
});

// ---------- ITEMS ----------
function createItemElement(text, targetListElement, isChecked) {
    const li = document.createElement('li');
    if (isChecked) li.classList.add('checked');

    // Drag handle (the only part you grab to move an item)
    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.textContent = '⋮⋮';
    handle.title = 'Drag to move';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = !!isChecked;

    // textContent (not innerHTML) so typed text can never be read as code
    const textSpan = document.createElement('span');
    textSpan.className = 'item-text';
    textSpan.textContent = text;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '🗑️';

    li.append(handle, checkbox, textSpan, deleteBtn);

    checkbox.addEventListener('change', function() {
        li.classList.toggle('checked', checkbox.checked);
        saveAllListsToMemory();
    });

    deleteBtn.addEventListener('click', function() {
        li.remove();
        saveAllListsToMemory();
    });

    setUpDragHandle(li, handle);

    targetListElement.appendChild(li);
}

// ---------- DRAGGING (mouse AND touch, using the handle) ----------
function setUpDragHandle(li, handle) {
    let scrollSpeed = 0;
    let scrollFrame = null;

    function autoScrollLoop() {
        if (scrollSpeed !== 0) {
            window.scrollBy(0, scrollSpeed);
            scrollFrame = requestAnimationFrame(autoScrollLoop);
        } else {
            scrollFrame = null;
        }
    }

    function moveItem(x, y) {
        // Which column is the finger/mouse over?
        const el = document.elementFromPoint(x, y);
        const column = el ? el.closest('.list-column') : null;

        columns.forEach(c => c.classList.toggle('drag-over', c === column));
        if (!column) return;

        const list = column.querySelector('ul');

        // Place the item among the others based on finger height
        const others = [...list.querySelectorAll('li:not(.dragging)')];
        const before = others.find(other => {
            const r = other.getBoundingClientRect();
            return y < r.top + r.height / 2;
        });

        if (before) {
            if (li.nextElementSibling !== before) list.insertBefore(li, before);
        } else if (li.parentElement !== list || list.lastElementChild !== li) {
            list.appendChild(li);
        }
    }

    handle.addEventListener('pointerdown', function(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        handle.setPointerCapture(e.pointerId);
        li.classList.add('dragging');
        document.body.classList.add('is-dragging');
    });

    handle.addEventListener('pointermove', function(e) {
        if (!li.classList.contains('dragging')) return;
        moveItem(e.clientX, e.clientY);

        // Scroll the page when dragging near the top/bottom edge (phone layout is stacked)
        const edge = 70;
        if (e.clientY < edge) scrollSpeed = -10;
        else if (e.clientY > window.innerHeight - edge) scrollSpeed = 10;
        else scrollSpeed = 0;
        if (scrollSpeed !== 0 && !scrollFrame) {
            scrollFrame = requestAnimationFrame(autoScrollLoop);
        }
    });

    function endDrag() {
        if (!li.classList.contains('dragging')) return;
        li.classList.remove('dragging');
        document.body.classList.remove('is-dragging');
        columns.forEach(c => c.classList.remove('drag-over'));
        scrollSpeed = 0;
        saveAllListsToMemory();
    }

    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
}

// ---------- SAVING (to the shared online list) ----------
function saveAllListsToMemory() {
    const readList = listEl => [...listEl.querySelectorAll('li')].map(li => ({
        text: li.querySelector('.item-text').textContent,
        checked: li.querySelector('.todo-checkbox').checked
    }));

    const data = { pui: readList(puiList), pisi: readList(pisiList) };
    lastJson = JSON.stringify(data);

    statusEl.textContent = "Saving...";
    set(listRef, data)
        .then(() => { statusEl.textContent = "Synced ✓"; })
        .catch((err) => {
            statusEl.textContent = "Couldn't save. Check your internet.";
            console.error(err);
        });
}
