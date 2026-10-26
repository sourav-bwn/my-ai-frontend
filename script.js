const BACKEND_URL = "https://my-ai-website-4xnh.onrender.com/chat";
const REQUEST_TIMEOUT_MS = 45000;

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
    const message = input.value.trim();
    if (!message) return;

    addMessage(message, "user");
    input.value = "";

    // Keep a reference: with two quick sends, removing lastChild here
    // would delete the other request's indicator - or its reply.
    const typing = addMessage("Typing...", "bot");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const res = await fetch(BACKEND_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message }),
            signal: controller.signal
        });

        const data = await res.json();

        typing.remove();
        addMessage(data.reply || "No reply from AI", "bot");

    } catch (error) {
        typing.remove();
        const note = error.name === "AbortError"
            ? "The AI took too long to answer. Please try again."
            : "Could not reach the AI service. Please try again.";
        addMessage(note, "bot");
        console.error(error);
    } finally {
        clearTimeout(timer);
    }
}

input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") send();
});
