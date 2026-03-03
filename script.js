const input = document.getElementById("repoInput");
const button = document.getElementById("loadBtn");
const frame = document.getElementById("previewFrame");

button.onclick = async () => {
    const url = input.value.trim();
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return alert("Invalid GitHub URL");

    const owner = match[1];
    const repo = match[2];

    const files = await fetchTree(owner, repo);

    // Convert all files to Blob URLs
    const blobs = {};
    for (const [path, content] of Object.entries(files)) {
        const type = guessMime(path);
        const blob = new Blob([content], { type });
        blobs[path] = URL.createObjectURL(blob);
    }

    // Load index.html
    if (!blobs["index.html"]) {
        alert("No index.html found");
        return;
    }

    // Fetch index.html content and rewrite paths
    let html = files["index.html"];
    html = rewritePaths(html, blobs);

    const blob = new Blob([html], { type: "text/html" });
    frame.src = URL.createObjectURL(blob);
};

// Guess MIME type
function guessMime(path) {
    if (path.endsWith(".html")) return "text/html";
    if (path.endsWith(".css")) return "text/css";
    if (path.endsWith(".js")) return "application/javascript";
    if (path.endsWith(".png")) return "image/png";
    if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
    if (path.endsWith(".svg")) return "image/svg+xml";
    return "text/plain";
}

// Rewrite relative paths to Blob URLs
function rewritePaths(html, blobs) {
    return html.replace(/(src|href)="([^"]+)"/g, (match, attr, path) => {
        if (blobs[path]) {
            return `${attr}="${blobs[path]}"`;
        }
        return match;
    });
}
