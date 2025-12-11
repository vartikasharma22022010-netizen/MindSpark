const API = "http://localhost:5000";   // change when hosting

// ---------------------- SIGNUP -----------------------
async function signup() {
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    let res = await fetch(`${API}/signup`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email, password })
    });

    let data = await res.json();

    if (data.token) {
        localStorage.setItem("token", data.token);
        window.location.href = "chat.html";
    } else {
        alert(data.msg);
    }
}

// ---------------------- LOGIN -----------------------
async function login() {
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    let res = await fetch(`${API}/login`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email, password })
    });

    let data = await res.json();

    if (data.token) {
        localStorage.setItem("token", data.token);
        window.location.href = "chat.html";
    } else {
        alert(data.msg);
    }
}

// ---------------------- LOAD CHAT COUNT -----------------------
async function updateChatCount() {
    let token = localStorage.getItem("token");
    if (!token) return;

    let res = await fetch(`${API}/count`, {
        headers: { "Authorization": token }
    });

    let data = await res.json();
    document.getElementById("chatCount").innerText =
        `Chats used today: ${data.count}/200`;
}

// ---------------------- CHAT -----------------------
async function sendMessage() {
    let token = localStorage.getItem("token");
    let msg = document.getElementById("userInput").value;

    if (!msg) return;

    let res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: {
            "Authorization": token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: msg })
    });

    let data = await res.json();

    if (data.error === "LIMIT_REACHED") {
        alert("Your daily limit is over. Upgrade to Premium.");
        return;
    }

    addToChat("You: " + msg);
    addToChat("Mindspark: " + data.reply);

    document.getElementById("userInput").value = "";
    updateChatCount();
}

// ---------------------- CHAT UI HELPER -----------------------
function addToChat(text) {
    let box = document.getElementById("chatBox");
    let p = document.createElement("p");
    p.innerText = text;
    box.appendChild(p);
    box.scrollTop = box.scrollHeight;
}

// ---------------------- LOAD SAVED CHATS -----------------------
async function loadHistory() {
    let token = localStorage.getItem("token");

    let res = await fetch(`${API}/history`, {
        headers: { "Authorization": token }
    });

    let data = await res.json();

    document.getElementById("chatBox").innerHTML = "";

    data.forEach(msg => {
        addToChat(msg);
    });
}

// ---------------------- RAZORPAY PAYMENT -----------------------
async function subscribe() {
    let token = localStorage.getItem("token");

    let orderReq = await fetch(`${API}/create-order`, {
        method: "POST",
        headers: {
            "Authorization": token,
            "Content-Type": "application/json"
        }
    });

    let order = await orderReq.json();

    var options = {
        key: "YOUR_RAZORPAY_KEY_ID",
        amount: order.amount,
        currency: "INR",
        order_id: order.id,
        handler: async function (response) {
            let verify = await fetch(`${API}/verify-payment`, {
                method: "POST",
                headers: {
                    "Authorization": token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(response)
            });

            let data = await verify.json();
            alert(data.msg);
        }
    };

    var rzp = new Razorpay(options);
    rzp.open();
}
