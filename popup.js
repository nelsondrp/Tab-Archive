document.addEventListener('DOMContentLoaded', async () => {
    let appSettings = {};
    try {
        const data = await browser.storage.local.get("settings");
        appSettings = data.settings || {};
        if (appSettings.theme === 'dark' || appSettings.theme === 'light') {
            document.documentElement.setAttribute('data-theme', appSettings.theme);
        }
    } catch (e) {}

    document.getElementById('openOptions').addEventListener('click', () => browser.runtime.openOptionsPage());

    const toggleSelectionBtn = document.getElementById('toggleSelection');
    toggleSelectionBtn.addEventListener('click', () => {
        document.body.classList.toggle('selection-mode');
        updateBulkBar();
    });

    const contentDiv = document.getElementById('content');
    const bulkBar = document.getElementById('bulkBar');
    const selectedCountSpan = document.getElementById('selectedCount');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');

    let currentContexts = {};
    let contextOrder = [];
    let collapsedState = {};

    function updateBulkBar() {
        if (!document.body.classList.contains('selection-mode')) {
            bulkBar.style.display = 'none';
            document.querySelectorAll('.link-checkbox').forEach(cb => cb.checked = false);
            return;
        }
        const count = document.querySelectorAll('.link-checkbox:checked').length;
        if (count > 0) {
            bulkBar.style.display = 'block';
            selectedCountSpan.textContent = count;
        } else {
            bulkBar.style.display = 'none';
        }
    }

    deleteSelectedBtn.addEventListener('click', async () => {
        const checkedBoxes = document.querySelectorAll('.link-checkbox:checked');
        let toDelete = {};
        checkedBoxes.forEach(box => {
            const ctx = box.dataset.context;
            if (!toDelete[ctx]) toDelete[ctx] = [];
            toDelete[ctx].push(parseInt(box.dataset.index, 10));
        });

        for (const [ctx, indices] of Object.entries(toDelete)) {
            indices.sort((a, b) => b - a).forEach(idx => currentContexts[ctx].splice(idx, 1));
            if (currentContexts[ctx].length === 0) delete currentContexts[ctx];
        }

        await saveAndRender();
        document.body.classList.remove('selection-mode');
        updateBulkBar();
    });

    async function saveAndRender() {
        await browser.storage.local.set({ contexts: currentContexts, contextOrder, collapsedState });
        render();
    }

    render();

    async function render() {
        const data = await browser.storage.local.get(["contexts", "contextOrder", "collapsedState"]);
        currentContexts = data.contexts || {};
        contextOrder = data.contextOrder || [];
        collapsedState = data.collapsedState || {};

        contentDiv.innerHTML = '';

        contextOrder = contextOrder.filter(k => currentContexts[k]);
        Object.keys(currentContexts).forEach(k => { if (!contextOrder.includes(k)) contextOrder.push(k); });

        if (Object.keys(currentContexts).length === 0) {
            contentDiv.innerHTML = '<div class="empty">No captured links yet.</div>';
            return;
        }

        let draggedElement = null;

        contextOrder.forEach((contextName) => {
            const links = currentContexts[contextName];
            const groupDiv = document.createElement('div');
            groupDiv.className = `context-group ${collapsedState[contextName] ? 'collapsed' : ''}`;

            // Inicia desabilitado. Só vamos habilitar o arrastar quando clicar na alça.
            groupDiv.draggable = false;

            groupDiv.addEventListener('dragstart', (e) => {
                draggedElement = groupDiv;
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => groupDiv.classList.add('dragging'), 0);
            });
            groupDiv.addEventListener('dragend', async () => {
                groupDiv.classList.remove('dragging');
                groupDiv.draggable = false; // Desabilita novamente ao soltar
                draggedElement = null;
                const newOrder = Array.from(contentDiv.children).map(el => el.querySelector('.context-title').textContent);
                contextOrder = newOrder;
                await browser.storage.local.set({ contextOrder });
            });
            groupDiv.addEventListener('dragover', (e) => {
                e.preventDefault();
                const afterElement = getDragAfterElement(contentDiv, e.clientY);
                if (afterElement == null) {
                    contentDiv.appendChild(draggedElement);
                } else {
                    contentDiv.insertBefore(draggedElement, afterElement);
                }
            });

            const header = document.createElement('div');
            header.className = 'context-header';

            const headerLeft = document.createElement('div');
            headerLeft.className = 'header-left';

            // NOVO: A alça de arrastar (hamburger menu)
            const dragHandle = document.createElement('span');
            dragHandle.className = 'drag-handle';
            dragHandle.textContent = '≡';
            dragHandle.title = "Drag to reorder";

            // Ativa o arrastar apenas quando pressionar essa alça
            dragHandle.addEventListener('mousedown', () => { groupDiv.draggable = true; });
            dragHandle.addEventListener('mouseup', () => { groupDiv.draggable = false; });
            dragHandle.addEventListener('mouseleave', () => { if(!groupDiv.classList.contains('dragging')) groupDiv.draggable = false; });

            const collapseBtn = document.createElement('span');
            collapseBtn.className = 'collapse-btn';
            collapseBtn.textContent = '▶';
            collapseBtn.onclick = async () => {
                groupDiv.classList.toggle('collapsed');
                collapsedState[contextName] = groupDiv.classList.contains('collapsed');
                await browser.storage.local.set({ collapsedState });
            };

            const title = document.createElement('div');
            title.className = 'context-title';
            title.textContent = contextName;

            headerLeft.append(dragHandle, collapseBtn, title);

            const actions = document.createElement('div');
            actions.className = 'actions';

            const editBtn = document.createElement('span');
            editBtn.textContent = '✏️';
            editBtn.onclick = () => editContext(title, contextName, currentContexts);

            const delBtn = document.createElement('span');
            delBtn.className = 'del';
            delBtn.textContent = '🗑️';
            delBtn.onclick = async () => {
                delete currentContexts[contextName];
                await saveAndRender();
            };

            actions.append(editBtn, delBtn);
            header.append(headerLeft, actions);
            groupDiv.appendChild(header);

            const listDiv = document.createElement('div');
            listDiv.className = 'link-list';

            links.forEach((link, index) => {
                const item = document.createElement('div');
                item.className = 'link-item';

                const chk = document.createElement('input');
                chk.type = 'checkbox';
                chk.className = 'link-checkbox';
                chk.dataset.context = contextName;
                chk.dataset.index = index;
                chk.addEventListener('change', updateBulkBar);

                const fav = document.createElement('img');
                fav.className = 'favicon';
                try {
                    fav.src = `https://www.google.com/s2/favicons?domain=${new URL(link.url).hostname}&sz=32`;
                } catch (e) { fav.src = 'icon.svg'; }

                const a = document.createElement('a');
                a.href = link.url;
                a.textContent = link.title || link.url;
                a.title = link.url;

                a.onclick = async (e) => {
                    e.preventDefault();
                    browser.tabs.create({ url: link.url });
                    if (appSettings.autoRemove) {
                        currentContexts[contextName].splice(index, 1);
                        if (currentContexts[contextName].length === 0) delete currentContexts[contextName];
                        await saveAndRender();
                    }
                };

                const favBtn = document.createElement('span');
                favBtn.className = 'hover-action fav-link';
                favBtn.textContent = '⭐';
                favBtn.title = "Add to Bookmarks";
                favBtn.onclick = () => {
                    browser.bookmarks.create({ title: link.title || link.url, url: link.url });
                    favBtn.style.opacity = '1';
                };

                const delLink = document.createElement('span');
                delLink.className = 'hover-action del-link';
                delLink.textContent = '✕';
                delLink.title = "Remove";
                delLink.onclick = async () => {
                    currentContexts[contextName].splice(index, 1);
                    if (currentContexts[contextName].length === 0) delete currentContexts[contextName];
                    await saveAndRender();
                };

                item.append(chk, fav, a, favBtn, delLink);
                listDiv.appendChild(item);
            });

            groupDiv.appendChild(listDiv);
            contentDiv.appendChild(groupDiv);
        });
    }

    function editContext(titleEl, oldName, contexts) {
        titleEl.contentEditable = "true";
        titleEl.focus();
        document.execCommand('selectAll', false, null);

        const saveRename = async () => {
            titleEl.contentEditable = "false";
            const newName = titleEl.textContent.trim();
            if (newName && newName !== oldName && !contexts[newName]) {
                contexts[newName] = contexts[oldName];
                delete contexts[oldName];

                const idx = contextOrder.indexOf(oldName);
                if (idx > -1) contextOrder[idx] = newName;

                await saveAndRender();
            } else {
                titleEl.textContent = oldName;
            }
        };

        titleEl.onblur = saveRename;
        titleEl.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); } };
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.context-group:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
});
