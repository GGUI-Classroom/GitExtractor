// github.js — ZIP-based repo loader with auto branch detection

async function getDefaultBranch(owner, repo) {
  const metaUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const res = await fetch(metaUrl);

  if (!res.ok) {
    throw new Error(`Failed to fetch repo metadata: ${res.status}`);
  }

  const data = await res.json();
  return data.default_branch || "main";
}

async function downloadRepoZip(owner, repo, branch) {
  const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;
  const res = await fetch(zipUrl);

  if (!res.ok) {
    throw new Error(`Failed to download ZIP: ${res.status}`);
  }

  return await res.arrayBuffer();
}

async function unzipRepo(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const rootFolder = Object.keys(zip.files)[0]; // repo-main/

  const files = {};

  for (const path in zip.files) {
    const entry = zip.files[path];

    if (entry.dir) continue;

    const relativePath = path.replace(rootFolder, "");

    const isText = isTextLike(relativePath);
    const content = isText
      ? await entry.async("string")
      : new Uint8Array(await entry.async("uint8array"));

    files[relativePath] = { content, isText };
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
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  return "application/octet-stream";
}
