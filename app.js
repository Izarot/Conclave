let currentUser = null, activeModels = [], history = [], currentChatId = null, isSending = false;
let allAvailableModels = [];
let failedModels = JSON.parse(localStorage.getItem('conclave_failed_models') || '[]');
let blacklistedModels = JSON.parse(localStorage.getItem('conclave_blacklisted_models') || '[]');

// SAFE element getter (fixes the login bug)
const el = id => document.getElementById(id);
const getUsers = () => JSON.parse(localStorage.getItem('conclave_users') || '[]');
const saveUsers = u => localStorage.setItem('conclave_users', JSON.stringify(u));

function switchTab(tab) {
    document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sidebar-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`.sidebar-tab[onclick="switchTab('${tab}')"]`).classList.add('active');
    el(`tab-${tab}`).classList.add('active');
    if (tab === 'models') renderModelsList();
    if (tab === 'settings') el('settings-username').innerText = currentUser || '-';
}

function register() {
    const u = el('username').value.trim(), p = el('password').value.trim();
    if (!u || !p) return alert("Enter username and password");
    let users = getUsers();
    if (users.find(x => x.username === u)) return alert("User already exists");
    users.push({ username: u, password: p, chats: [] });
    saveUsers(users);
    doLogin(u, p);
}

function login() {
    const u = el('username').value.trim(), p = el('password').value.trim();
    if (!u || !p) return alert("Enter username and password");
    doLogin(u, p);
}

function doLogin(u, p) {
    let user = getUsers().find(x => x.username === u && x.password === p);
    if (!user) return alert("Invalid credentials. If you're new, tap 'Create Account'.");
    currentUser = user.username;
    el('auth-container').style.display = 'none';
    el('app-container').style.display = 'flex';
    el('logout-btn').style.display = 'block';
    renderChatList(user.chats);
    loadModels();
}

function logout() { currentUser = null; location.reload(); }

function newChat() {
    currentChatId = 'chat_' + Date.now(); history = []; activeModels = [];
    el('chat-box').innerHTML = ''; el('current-chat-title').innerText = 'New Chat';
    renderActiveModels();
    const user = getUsers().find(u => u.username === currentUser);
    renderChatList(user ? user.chats : []);
}

function saveChat() {
    if (!currentUser || !currentChatId) return;
    let users = getUsers(), user = users.find(x => x.username === currentUser);
    if (!user) return;
    let idx = user.chats.findIndex(c => c.id === currentChatId);
    let data = { id: currentChatId, name: el('current-chat-title').innerText, history, models: activeModels };
    if (idx >= 0) user.chats[idx] = data; else user.chats.push(data);
    saveUsers(users); renderChatList(user.chats);
}

function renderChatList(chats) {
    const list = el('chat-list'); list.innerHTML = '';
    chats.forEach(c => {
        const div = document.createElement('div');
        div.className = `chat-item ${c.id === currentChatId ? 'active' : ''}`;
        div.innerHTML = `<span onclick="loadChat('${c.id}')">${c.name}</span><div class="chat-actions"><button class="chat-action-btn" onclick="renameChat('${c.id}')">✏️</button><button class="chat-action-btn" onclick="deleteChat('${c.id}')">🗑️</button></div>`;
        list.appendChild(div);
    });
}

function loadChat(id) {
    let user = getUsers().find(u => u.username === currentUser);
    let chat = user.chats.find(c => c.id === id); if (!chat) return;
    currentChatId = chat.id; history = chat.history; activeModels = chat.models;
    el('chat-box').innerHTML = ''; el('current-chat-title').innerText = chat.name;
    renderActiveModels();
    history.forEach(msg => {
        if (msg.role === 'user') addMessage('user', msg.content);
        else msg.content.split('\n\n').forEach(p => { const m = p.match(/\[(.*?)\]: (.*)/s); if (m) addMessage('ai', m[2], m[1]); });
    });
    renderChatList(user.chats);
}

function renameChat(id) {
    let user = getUsers().find(u => u.username === currentUser);
    let chat = user.chats.find(c => c.id === id);
    let newName = prompt("New name:", chat.name);
    if (newName) { chat.name = newName; saveUsers(user); renderChatList(user.chats); if (id === currentChatId) el('current-chat-title').innerText = newName; }
}

function deleteChat(id) {
    if (!confirm("Delete this chat?")) return;
    let users = getUsers(), user = users.find(u => u.username === currentUser);
    user.chats = user.chats.filter(c => c.id !== id);
    saveUsers(users);
    if (id === currentChatId) newChat();
    renderChatList(user.chats);
}

function branchChat() {
    if (!currentChatId) return;
    let user = getUsers().find(u => u.username === currentUser);
    let chat = user.chats.find(c => c.id === currentChatId);
    currentChatId = 'chat_' + Date.now();
    history = [...chat.history]; activeModels = [...chat.models];
    el('current-chat-title').innerText = "Branch: " + chat.name;
    saveChat();
}

// --- MODELS ---
async function loadModels() {
    try {
        const res = await fetch('/api/models');
        allAvailableModels = await res.json();
        const select = el('model-select');
        select.innerHTML = '';
        allAvailableModels.filter(m => !blacklistedModels.includes(m.id) && !failedModels.includes(m.id)).forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id; opt.innerText = m.name;
            select.appendChild(opt);
        });
        renderModelsList();
    } catch (e) { alert("Error loading models: " + e.message); }
}

function renderModelsList() {
    const search = (el('models-tab-search').value || '').toLowerCase();
    const list = el('models-list'); list.innerHTML = '';
    const visible = allAvailableModels.filter(m => m.name.toLowerCase().includes(search));
    el('model-count').innerText = `${visible.length} models • ${blacklistedModels.length} blacklisted`;
    visible.forEach(m => {
        const isBlack = blacklistedModels.includes(m.id);
        const div = document.createElement('div');
        div.className = 'model-item';
        div.innerHTML = `<span class="name" title="${m.id}">${m.name}</span><button class="${isBlack ? 'blacklisted' : ''}" onclick="toggleBlacklist('${m.id}')">${isBlack ? 'Un-blacklist' : 'Blacklist'}</button>`;
        list.appendChild(div);
    });
}

function toggleBlacklist(id) {
    if (blacklistedModels.includes(id)) blacklistedModels = blacklistedModels.filter(x => x !== id);
    else blacklistedModels.push(id);
    localStorage.setItem('conclave_blacklisted_models', JSON.stringify(blacklistedModels));
    loadModels();
}

function resetFailedModels() {
    failedModels = [];
    localStorage.setItem('conclave_failed_models', '[]');
    loadModels();
    addMessage('system', 'Blocked models reset.', 'success');
}

function clearAllData() {
    if (!confirm("This deletes ALL accounts and chats on this device. Continue?")) return;
    localStorage.clear(); location.reload();
}

function addModel() {
    const id = el('model-select').value;
    const nickname = el('nickname-input').value.trim();
    if (!id) return;
    activeModels.push({ id, nickname });
    el('nickname-input').value = '';
    renderActiveModels(); saveChat();
}

function removeModel(index) { activeModels.splice(index, 1); renderActiveModels(); saveChat(); }

function renderActiveModels() {
    const c = el('active-models'); c.innerHTML = '';
    activeModels.forEach((m, i) => {
        const chip = document.createElement('div');
        chip.className = 'model-chip';
        chip.innerHTML = `${m.nickname || m.id.split(':').pop()} <span class="remove" onclick="removeModel(${i})">✕</span>`;
        c.appendChild(chip);
    });
}

const escapeHtml = u => u.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
const formatMentions = h => h.replace(/@([a-zA-Z0-9_\-]+)/g, '<span class="mention">@$1</span>');

function addMessage(sender, text, name = '', type = '') {
    const chatBox = el('chat-box');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}-message ${type}`;
    if (sender === 'ai') {
        const n = document.createElement('div'); n.className = 'ai-name'; n.innerText = name; msgDiv.appendChild(n);
    }
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = sender === 'ai' ? formatMentions(marked.parse(text)) : formatMentions(escapeHtml(text));
    msgDiv.appendChild(contentDiv);
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function toggleSendButton(state) {
    isSending = state;
    el('send-btn').disabled = state;
    el('send-text').style.display = state ? 'none' : 'block';
    el('send-loader').style.display = state ? 'block' : 'none';
}

async function sendToBackend(messageText, targetModels) {
    const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, history: history, models: targetModels })
    });
    const data = await res.json();
    if (data.responses) { history = data.history; return data.responses; }
    throw new Error(data.error || "Backend error");
}

async function sendMessage() {
    if (isSending) return;
    if (activeModels.length === 0) return alert("Add at least one model first!");
    const input = el('user-input');
    const text = input.value.trim(); if (!text) return;

    addMessage('user', text); input.value = ''; autoResize(input); toggleSendButton(true);

    try {
        const mentioned = activeModels.filter(m => text.toLowerCase().includes(`@${(m.nickname || m.id.split(':').pop()).toLowerCase()}`));
        const targets = mentioned.length > 0 ? mentioned : activeModels;
        let responses = await sendToBackend(text, targets);
        let depth = 0;
        while (responses.length > 0 && depth < 3) {
            let nextText = "", nextTargets = [];
            for (const res of responses) {
                if (res.text.startsWith("Error:")) {
                    addMessage('system', `${res.name} failed and was blocked.`, 'error');
                    let fm = activeModels.find(m => (m.nickname || m.id.split(':').pop()) === res.name);
                    if (fm) {
                        activeModels = activeModels.filter(m => m.id !== fm.id);
                        failedModels.push(fm.id);
                        localStorage.setItem('conclave_failed_models', JSON.stringify(failedModels));
                        renderActiveModels(); loadModels();
                    }
                    continue;
                }
                addMessage('ai', res.text, res.name);
                history.push({ role: "assistant", content: `[${res.name}]: ${res.text}` });
                const aiMentions = activeModels.filter(m => res.text.toLowerCase().includes(`@${(m.nickname || m.id.split(':').pop()).toLowerCase()}`));
                if (aiMentions.length > 0) { nextText = res.text; nextTargets = aiMentions; }
            }
            if (nextText && nextTargets.length > 0) { depth++; responses = await sendToBackend(nextText, nextTargets); }
            else break;
        }
        saveChat();
    } catch (e) {
        addMessage('system', 'Network Error: Backend timed out.', 'error');
    } finally { toggleSendButton(false); }
}

function autoResize(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
el('user-input').addEventListener('keypress', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

function toggleSidebar() {
    el('sidebar').classList.toggle('open');
    el('overlay').classList.toggle('show');
}