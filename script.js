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

    // === Initialization ===
    
    // Apply theme immediately
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();

    // Check if user exists
    if (currentUser) {
        showChatScreen();
    } else {
        usernameInput.focus();
    }

    // === Event Listeners ===

    // 1. Welcome Screen
    usernameInput.addEventListener('input', (e) => {
        startBtn.disabled = e.target.value.trim().length === 0;
    });

    startBtn.addEventListener('click', () => {
        const name = usernameInput.value.trim();
        if (name) {
            setCurrentUser(name);
            showChatScreen();
        }
    });

    // 2. Chat Logic
    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;

        const messageData = {
            id: Date.now(),
            text: text,
            sender: currentUser,
            timestamp: new Date().toISOString(),
            type: 'text'
        };

        // Render locally (immediately)
        appendMessage(messageData, true);
        
        // Broadcast to other tabs
        broadcastMessage(messageData);

        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto'; // Reset height
        sendBtn.disabled = true;
        messageInput.focus();
    }

    sendBtn.addEventListener('click', sendMessage);

    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        sendBtn.disabled = this.value.trim().length === 0;
    });

    // 3. Image Handling
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImageUpload(file);
    });

    // Handle Paste (Images)
    document.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.type.indexOf("image") === 0) {
                const blob = item.getAsFile();
                handleImageUpload(blob);
            }
        }
    });

    function handleImageUpload(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Image = e.target.result;
            const messageData = {
                id: Date.now(),
                image: base64Image,
                sender: currentUser,
                timestamp: new Date().toISOString(),
                type: 'image'
            };
            appendMessage(messageData, true);
            broadcastMessage(messageData);
        };
        reader.readAsDataURL(file);
    }

    // 4. Cross-Tab Communication (The "Backend")
    function broadcastMessage(msgData) {
        // localStorage event only fires on OTHER tabs
        // We use a specific key that changes to trigger the event
        localStorage.setItem('chat_latest_message', JSON.stringify(msgData));
    }

    window.addEventListener('storage', (e) => {
        if (e.key === 'chat_latest_message' && e.newValue) {
            const msgData = JSON.parse(e.newValue);
            // Don't re-render if it's our own message (though storage event usually blocks this anyway)
            if (msgData.sender !== currentUser) {
                appendMessage(msgData, false);
            }
        }
    });

    // 5. Theme Toggling
    themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('chat_theme', currentTheme);
        updateThemeIcon();
    });

    function updateThemeIcon() {
        const iconSpan = themeToggleBtn.querySelector('span');
        iconSpan.textContent = currentTheme === 'light' ? 'dark_mode' : 'light_mode';
    }

    // 6. Name Changing
    currentUsernameSpan.addEventListener('click', () => {
        newUsernameInput.value = currentUser;
        nameModal.classList.add('active');
        newUsernameInput.focus();
    });

    cancelNameBtn.addEventListener('click', () => {
        nameModal.classList.remove('active');
    });

    saveNameBtn.addEventListener('click', () => {
        const newName = newUsernameInput.value.trim();
        if (newName) {
            setCurrentUser(newName);
            nameModal.classList.remove('active');
        }
    });

    // === Helpers ===
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
        // Scroll to bottom
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    function appendMessage(data, isOwn) {
        const row = document.createElement('div');
        row.className = `message-row ${isOwn ? 'own' : 'other'}`;

        const time = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let contentHtml = '';
        if (data.type === 'image') {
            contentHtml = `<img src="${data.image}" class="message-image" alt="User Image">`;
        } else {
            // Escape HTML to prevent XSS
            const safeText = data.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
        
        // Smooth scroll to bottom
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }
});
