const input = document.getElementById("repoInput");
const button = document.getElementById("loadBtn");
const frame = document.getElementById("previewFrame");

button.onclick = async () => {
    const url = input.value.trim();
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);

    if (!match) {
        alert("Invalid GitHub URL");
        return;
    }

    const owner = match[1];
    const repo = match[2];

    try {
        const files = await fetchRepoTree(owner, repo);
        const fileMap = {};

        // Download all files in root
        for (const file of files) {
            if (file.type === "file") {
                const content = await fetchFileContent(file);
                fileMap[file.name] = content;
            }
        }

        if (!fileMap["index.html"]) {
            alert("No index.html found in repo root.");
            return;
        }

        // Create blob URL for index.html
        const blob = new Blob([fileMap["index.html"]], { type: "text/html" });
        const blobURL = URL.createObjectURL(blob);

        frame.src = blobURL;

    } catch (err) {
        alert("Error loading repo: " + err.message);
    }
};
