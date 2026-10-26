const BACKEND_URL = "https://my-ai-website-4xnh.onrender.com/chat";

const chat = document.getElementById("chat");
const input = document.getElementById("input");

function addMessage(text, type) {
    const div = document.createElement("div");
    div.className = "message " + type;
    div.innerText = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    return div;
}

async function send() {
    const message = input.value;
    if (!message) return;

    addMessage(message, "user");
    input.value = "";

    // Keep a reference: with two quick sends, removing lastChild here
    // would delete the other request's indicator - or its reply.
    const typing = addMessage("Typing...", "bot");

    try {
        const res = await fetch(BACKEND_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message })
        });

        const data = await res.json();

        typing.remove();
        addMessage(data.reply || "No reply from AI", "bot");

    } catch (error) {
        typing.remove();
        addMessage("Could not reach the AI service. Please try again.", "bot");
        console.error(error);
    }
}
