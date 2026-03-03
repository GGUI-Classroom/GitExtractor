
window.__GITHUB_TOKEN__ = "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";

async function fetchRepoTree(owner, repo, path = "") {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const headers = {};
  if (window.__GITHUB_TOKEN__) {
    headers["Authorization"] = `Bearer ${window.__GITHUB_TOKEN__}`;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const items = await res.json();
  const files = {};

  for (const item of items) {
    if (item.type === "file") {
      const fileHeaders = {};
      if (window.__GITHUB_TOKEN__) {
        fileHeaders["Authorization"] = `Bearer ${window.__GITHUB_TOKEN__}`;
      }

      const fileRes = await fetch(item.download_url, { headers: fileHeaders });

      const isText = isTextLike(item.name);
      const content = isText
        ? await fileRes.text()
        : new Uint8Array(await fileRes.arrayBuffer());

      files[item.path] = { content, isText };

    } else if (item.type === "dir") {
      const sub = await fetchRepoTree(owner, repo, item.path);
      Object.assign(files, sub);
    }
  }

  return files;
}

function isTextLike(name) {
  const lower = name.toLowerCase();
  return (
    lower.endsWith(".html") ||
    lower.endsWith(".htm") ||
    lower.endsWith(".css") ||
    lower.endsWith(".js") ||
    lower.endsWith(".json") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".svg")
  );
}

function guessMime(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
  if (lower.endsWith(".css")) return "text/css";
  if (lower.endsWith(".js")) return "application/javascript";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".woff")) return "font/woff";
  if (lower.endsWith(".woff2")) return "font/woff2";
  if (lower.endsWith(".ttf")) return "font/ttf";
  return "application/octet-stream";
}
