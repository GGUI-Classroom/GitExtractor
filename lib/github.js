async function fetchRepoTree(owner, repo, path = "") {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error("Repo not found or API blocked");

    return await res.json();
}

async function fetchFileContent(file) {
    if (file.type !== "file") return null;

    const res = await fetch(file.download_url);
    return await res.text();
}
