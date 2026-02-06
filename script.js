

document.addEventListener('DOMContentLoaded', () => {
    // === DOM Elements ===
    const welcomeScreen = document.getElementById('welcome-screen');
    const chatScreen = document.getElementById('chat-screen');
    const usernameInput = document.getElementById('username-input');
    const startBtn = document.getElementById('start-btn');
    const currentUsernameSpan = document.getElementById('current-username');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesArea = document.getElementById('messages-area');
    const imageUpload = document.getElementById('image-upload');
    const nameModal = document.getElementById('name-modal');
    const newUsernameInput = document.getElementById('new-username-input');
    const saveNameBtn = document.getElementById('save-name-btn');
    const cancelNameBtn = document.getElementById('cancel-name-btn');

    // === State ===
    let currentUser = localStorage.getItem('chat_username') || '';
    let currentTheme = localStorage.getItem('chat_theme') || 'light';
    let lastMessageId = 0; // 重複表示を防ぐためのID管理

    // === Initialization ===
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();

    if (currentUser) {
        showChatScreen();
        startPolling(); // 定期取得開始
    } else {
        usernameInput.focus();
    }

    // === API Functions (The Core Logic) ===

    // 1. メッセージを取得する (GET)
    async function fetchMessages() {
        try {
            const res = await fetch('/api/messages');
            if (!res.ok) throw new Error('Fetch failed');
            const data = await res.json();

            // 新しいメッセージがある場合のみ追加
            const newMessages = data.filter(msg => msg.id > lastMessageId);
            if (newMessages.length > 0) {
                newMessages.forEach(msg => {
                    appendMessage(msg, msg.sender === currentUser);
                    lastMessageId = Math.max(lastMessageId, msg.id);
                });
                messagesArea.scrollTop = messagesArea.scrollHeight;
            }
        } catch (e) {
            console.error("データ取得エラー:", e);
        }
    }

    // 2. メッセージを送信する (POST)
    async function sendMessage(payload) {
        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender: currentUser,
                    ...payload
                })
            });
            if (!res.ok) throw new Error('Send failed');
            
            // 送信成功したら即座に更新をかける
            await fetchMessages();
        } catch (e) {
            console.error("送信エラー:", e);
            alert("メッセージの送信に失敗しました。");
        }
    }

    // === Event Listeners ===

    usernameInput.addEventListener('input', (e) => {
        startBtn.disabled = e.target.value.trim().length === 0;
    });

    startBtn.addEventListener('click', () => {
        const name = usernameInput.value.trim();
        if (name) {
            setCurrentUser(name);
            showChatScreen();
            startPolling();
        }
    });

    const handleTextSend = async () => {
        const text = messageInput.value.trim();
        if (!text) return;

        messageInput.value = '';
        messageInput.style.height = 'auto';
        sendBtn.disabled = true;

        await sendMessage({ text: text, type: 'text' });
        messageInput.focus();
    };

    sendBtn.addEventListener('click', handleTextSend);

    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleTextSend();
        }
    });

    messageInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        sendBtn.disabled = this.value.trim().length === 0;
    });

    // 画像処理
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImageUpload(file);
    });

    function handleImageUpload(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Image = e.target.result;
            await sendMessage({ image: base64Image, type: 'image' });
        };
        reader.readAsDataURL(file);
    }

    // 3秒おきに新着チェック (ポーリング)
    function startPolling() {
        fetchMessages(); // 初回
        setInterval(fetchMessages, 3000);
    }

    // === UI Helpers (Firebase版から流用・最適化) ===

    function setCurrentUser(name) {
        currentUser = name;
        currentUsernameSpan.textContent = currentUser;
        localStorage.setItem('chat_username', currentUser);
    }

    function showChatScreen() {
        welcomeScreen.classList.remove('active');
        setTimeout(() => welcomeScreen.style.display = 'none', 300);
        chatScreen.style.display = 'flex';
        setTimeout(() => chatScreen.classList.add('active'), 10);
        setCurrentUser(currentUser);
    }

    function updateThemeIcon() {
        const iconSpan = themeToggleBtn.querySelector('span');
        iconSpan.textContent = currentTheme === 'light' ? 'dark_mode' : 'light_mode';
    }

    themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('chat_theme', currentTheme);
        updateThemeIcon();
    });

    function appendMessage(data, isOwn) {
        const row = document.createElement('div');
        row.className = `message-row ${isOwn ? 'own' : 'other'}`;

        // D1(SQL)から返ってくるtimestampをパース
        const dateObj = data.timestamp ? new Date(data.timestamp) : new Date();
        const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let contentHtml = '';
        if (data.type === 'image') {
            contentHtml = `<img src="${data.image}" class="message-image" alt="User Image">`;
        } else {
            const safeText = (data.text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            contentHtml = safeText.replace(/\n/g, '<br>');
        }

        row.innerHTML = `
            ${!isOwn ? `<span class="sender-name">${data.sender}</span>` : ''}
            <div class="message-bubble">
                ${contentHtml}
                <span class="message-time">${time}</span>
            </div>
        `;
        messagesArea.appendChild(row);
    }

    // モーダル処理
    currentUsernameSpan.addEventListener('click', () => {
        newUsernameInput.value = currentUser;
        nameModal.classList.add('active');
    });
    cancelNameBtn.addEventListener('click', () => nameModal.classList.remove('active'));
    saveNameBtn.addEventListener('click', () => {
        const newName = newUsernameInput.value.trim();
        if (newName) {
            setCurrentUser(newName);
            nameModal.classList.remove('active');
        }
    });
});
