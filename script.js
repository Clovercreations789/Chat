import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCD1W9VLWXdnR7PLKB5duIxLbgPDLkwNXo",
    authDomain: "chat-app-new-b17f5.firebaseapp.com",
    projectId: "chat-app-new-b17f5",
    storageBucket: "chat-app-new-b17f5.firebasestorage.app",
    messagingSenderId: "992687654736",
    appId: "1:992687654736:web:eb8793f8b731b1e49fce55",
    measurementId: "G-Y5794PLNLH"
};
// ==========================================

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
    let unsubscribe = null;
    console.log("Debug: unsubscribe initialized");

    // === Initialization ===

    // Apply theme immediately
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();

    // Check if user exists
    if (currentUser) {
        showChatScreen();
        initChatListener();
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
            initChatListener();
        }
    });

    // 2. Chat Logic
    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;

        try {
            await addDoc(collection(db, "messages"), {
                text: text,
                sender: currentUser,
                timestamp: serverTimestamp(), // Use server time
                type: 'text'
            });

            // Clear input
            messageInput.value = '';
            messageInput.style.height = 'auto'; // Reset height
            sendBtn.disabled = true;
            messageInput.focus();
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("メッセージの送信に失敗しました。Firebaseの設定を確認してください。");
        }
    }

    sendBtn.addEventListener('click', sendMessage);

    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    messageInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        sendBtn.disabled = this.value.trim().length === 0;
    });

    // 3. Image Handling
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImageUpload(file);
    });

    document.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.type.indexOf("image") === 0) {
                const itemFile = item.getAsFile();
                handleImageUpload(itemFile);
            }
        }
    });

    function handleImageUpload(file) {
        const reader = new FileReader();
        reader.onload = async function (e) {
            const base64Image = e.target.result;
            try {
                // Not efficient for large images in Firestore, but okay for MVP
                await addDoc(collection(db, "messages"), {
                    image: base64Image,
                    sender: currentUser,
                    timestamp: serverTimestamp(),
                    type: 'image'
                });
            } catch (error) {
                console.error("Error uploading image: ", error);
                alert("画像の送信に失敗しました。");
            }
        };
        reader.readAsDataURL(file);
    }

    // 4. Firestore Listener (Real-time updates)


    function initChatListener() {
        if (unsubscribe) return; // Already listening

        const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));

        unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    // Handle serverTimestamp possibly being null for local writes immediately
                    const timestamp = data.timestamp ? data.timestamp.toDate() : new Date();
                    const messageData = { ...data, timestamp: timestamp };
                    appendMessage(messageData, messageData.sender === currentUser);
                }
            });
        });
    }

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
            // Note: Old messages from this user won't update sender name unless we update DB documents
            // For MVP, we just change local sender name for new messages
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

        // Smooth scroll to bottom
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }
});
