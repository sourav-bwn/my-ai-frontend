# my-ai-frontend

Static chat UI for the AI Assistant. Talks to the Flask backend in
[my-ai-website](https://github.com/sourav-bwn/my-ai-website), deployed at the
URL in `BACKEND_URL` (script.js).

## Run

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Tests

Node 18+ only, no dependencies - the suite stubs the DOM and `fetch`:

```bash
node --test
```

Covered: concurrent sends keep both replies, the typing indicator lifecycle,
whitespace-only input, Enter-to-send, request timeout (45s), and network
failure messages.
