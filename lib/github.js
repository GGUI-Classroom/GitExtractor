async function fetchTree(owner, repo, path = "") {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch repo");

    const items = await res.json();
    const files = {};

    for (const item of items) {
        if (item.type === "file") {
            const content = await fetch(item.download_url).then(r => r.text());
            files[item.path] = content;
        } else if (item.type === "dir") {
            const sub = await fetchTree(owner, repo, item.path);
            Object.assign(files, sub);
        }
    }

    return files;
}
