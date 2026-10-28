const itemInput = document.getElementById('item-input');
const familySelect = document.getElementById('family-select');
const addBtn = document.getElementById('add-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const puiList = document.getElementById('pui-list');
const pisiList = document.getElementById('pisi-list');
const columns = document.querySelectorAll('.list-column');

// LOAD LISTS: Fetch saved logs matching the profile keys
let savedPui = JSON.parse(localStorage.getItem('puiShoppingList')) || [];
let savedPisi = JSON.parse(localStorage.getItem('pisiShoppingList')) || [];

savedPui.forEach(item => createItemElement(item.text, puiList, item.checked));
savedPisi.forEach(item => createItemElement(item.text, pisiList, item.checked));

addBtn.addEventListener('click', function() {
    const itemText = itemInput.value.trim();
    const chosenList = familySelect.value;

    if (itemText === "") {
        alert("Please type an item first!");
        return;
    }

    if (chosenList === "pui") {
        createItemElement(itemText, puiList, false);
    } else {
        createItemElement(itemText, pisiList, false);
    }

    saveAllListsToMemory();
    itemInput.value = ""; 
});

// CLEAR ALL BUTTON FUNCTIONALITY
clearAllBtn.addEventListener('click', function() {
    if (confirm("Are you sure you want to clear all items from both lists?")) {
        puiList.innerHTML = "";
        pisiList.innerHTML = "";
        saveAllListsToMemory();
    }
});

function createItemElement(text, targetListElement, isChecked) {
    const li = document.createElement('li');
    li.setAttribute('draggable', 'true');
    if (isChecked) li.classList.add('checked');

    li.innerHTML = `
        <input type="checkbox" class="todo-checkbox" ${isChecked ? 'checked' : ''}>
        <span class="item-text">${text}</span>
        <button class="delete-btn">🗑️</button>
    `;

    const checkbox = li.querySelector('.todo-checkbox');
    checkbox.addEventListener('change', function() {
        if (checkbox.checked) {
            li.classList.add('checked');
        } else {
            li.classList.remove('checked');
        }
        saveAllListsToMemory();
    });

    const deleteBtn = li.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', function() {
        li.remove();
        saveAllListsToMemory();
    });

    // MOUSE DRAG EVENTS (DESKTOP)
    li.addEventListener('dragstart', () => li.classList.add('dragging'));
    li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        saveAllListsToMemory();
    });

    // MOBILE TOUCH DRAG SUPPORT
    li.addEventListener('touchstart', function(e) {
        // Prevent accidental drags when checking boxes or tapping the delete button
        if (e.target.tagName === 'INPUT' || e.target.classList.contains('delete-btn')) {
            return;
        }
        li.classList.add('dragging');
    }, { passive: true });

    li.addEventListener('touchmove', function(e) {
        if (!li.classList.contains('dragging')) return;
        
        const touch = e.touches[0];
        // Check which list column the user's finger is currently hovering over
        columns.forEach(column => {
            const rect = column.getBoundingClientRect();
            if (
                touch.clientX >= rect.left &&
                touch.clientX <= rect.right &&
                touch.clientY >= rect.top &&
                touch.clientY <= rect.bottom
            ) {
                const list = column.querySelector('ul');
                if (list && li.parentElement !== list) {
                    list.appendChild(li);
                }
            }
        });
    }, { passive: true });

    li.addEventListener('touchend', function() {
        if (li.classList.contains('dragging')) {
            li.classList.remove('dragging');
            saveAllListsToMemory();
        }
    });

    targetListElement.appendChild(li);
}

// DRAG OVER COLUMNS LOGIC (DESKTOP MOUSE)
columns.forEach(column => {
    column.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingItem = document.querySelector('.dragging');
        const list = column.querySelector('ul');
        if (draggingItem && list) {
            list.appendChild(draggingItem);
            column.classList.add('drag-over');
        }
    });

    column.addEventListener('dragleave', () => {
        column.classList.remove('drag-over');
    });

    column.addEventListener('drop', () => {
        column.classList.remove('drag-over');
        saveAllListsToMemory();
    });
});

function saveAllListsToMemory() {
    const puiItems = [];
    puiList.querySelectorAll('li').forEach(li => {
        puiItems.push({
            text: li.querySelector('.item-text').innerText,
            checked: li.querySelector('.todo-checkbox').checked
        });
    });

    const pisiItems = [];
    pisiList.querySelectorAll('li').forEach(li => {
        pisiItems.push({
            text: li.querySelector('.item-text').innerText,
            checked: li.querySelector('.todo-checkbox').checked
        });
    });

    localStorage.setItem('puiShoppingList', JSON.stringify(puiItems));
    localStorage.setItem('pisiShoppingList', JSON.stringify(pisiItems));
}
