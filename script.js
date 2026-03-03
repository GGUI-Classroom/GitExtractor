const input = document.getElementById("repoInput");
const button = document.getElementById("loadBtn");
const frame = document.getElementById("previewFrame");

let blobMap = {};      // path -> blob URL
let fileMap = {};      // path -> { content, isText }
let rootPath = "/";    // base for resolving

button.addEventListener("click", () => {
  const url = input.value.trim();
  loadRepo(url);
});

async function loadRepo(repoUrl) {
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/#]+)/i);
  if (!match) {
    alert("Invalid GitHub repo URL");
    return;
  }

  const owner = match[1];
  const repo = match[2];

  try {
    fileMap = await fetchRepoTree(owner, repo);
    blobMap = {};

    // Build blobs for all files (rewriting text ones later)
    for (const [path, { content, isText }] of Object.entries(fileMap)) {
      const mime = guessMime(path);
      const blob = new Blob([content], { type: mime });
      blobMap["/" + path] = URL.createObjectURL(blob);
    }

    // Find entry HTML (index.html at root or closest)
    const entry = findEntryHtml();
    if (!entry) {
      alert("No index.html or root HTML file found.");
      return;
    }

    navigateTo(entry);

  } catch (e) {
    console.error(e);
    alert("Error loading repo: " + e.message);
  }
}

function findEntryHtml() {
  if (fileMap["index.html"]) return "/index.html";
  const candidates = Object.keys(fileMap).filter(p => p.toLowerCase().endsWith(".html"));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.length - b.length);
  return "/" + candidates[0];
}

// Main router: load a path from virtual FS into iframe
function navigateTo(path) {
  if (!path.startsWith("/")) path = "/" + path;
  if (!fileMap[path.slice(1)]) {
    console.warn("Path not found in FS:", path);
    return;
  }

  const { content, isText } = fileMap[path.slice(1)];
  const mime = guessMime(path);

  if (!isText || !mime.startsWith("text/html")) {
    console.warn("navigateTo called on non-HTML:", path);
    return;
  }

  const html = rewriteHtml(path, content);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  frame.onload = () => {
    injectRouterScript(frame.contentWindow, frame.contentDocument);
  };

  frame.src = url;
}

// Rewrite HTML: links, scripts, images, etc.
function rewriteHtml(currentPath, htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");

  const baseDir = currentPath.substring(0, currentPath.lastIndexOf("/") + 1);

  // <link>, <script>, <img>, <a>, <iframe>, <source>, etc.
  const attrTargets = [
    ["link", "href"],
    ["script", "src"],
    ["img", "src"],
    ["a", "href"],
    ["iframe", "src"],
    ["source", "src"],
    ["video", "src"],
    ["audio", "src"]
  ];

  for (const [tag, attr] of attrTargets) {
    doc.querySelectorAll(tag + "[" + attr + "]").forEach(el => {
      const val = el.getAttribute(attr);
      if (!val || isExternalUrl(val) || val.startsWith("data:") || val.startsWith("blob:")) return;

      const resolved = resolvePath(baseDir, val);
      const blobUrl = blobMap[resolved];
      if (!blobUrl) return;

      // For <a>, we want to keep virtual routing, not direct blob nav
      if (tag === "a") {
        el.setAttribute("data-virtual-href", resolved);
        el.setAttribute("href", "#");
      } else {
        el.setAttribute(attr, blobUrl);
      }
    });
  }

  // Inline <style> and linked CSS (we only handle inline here; linked CSS is already blobbed)
  doc.querySelectorAll("style").forEach(styleEl => {
    const css = styleEl.textContent;
    styleEl.textContent = rewriteCss(baseDir, css);
  });

  // Simple inline JS import rewriting (very basic)
  doc.querySelectorAll("script").forEach(scriptEl => {
    if (!scriptEl.textContent) return;
    const js = scriptEl.textContent;
    scriptEl.textContent = rewriteJsImports(baseDir, js);
  });

  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}

// Rewrite CSS url(...)
function rewriteCss(baseDir, css) {
  return css.replace(/url\(([^)]+)\)/g, (match, raw) => {
    let url = raw.trim().replace(/^['"]|['"]$/g, "");
    if (!url || isExternalUrl(url) || url.startsWith("data:") || url.startsWith("blob:")) {
      return match;
    }
    const resolved = resolvePath(baseDir, url);
    const blobUrl = blobMap[resolved];
    if (!blobUrl) return match;
    return `url("${blobUrl}")`;
  });
}

// Very basic JS import rewriting
function rewriteJsImports(baseDir, js) {
  return js.replace(/import\s+([^'"]*)['"]([^'"]+)['"]/g, (match, what, spec) => {
    if (isExternalUrl(spec) || spec.startsWith("data:") || spec.startsWith("blob:")) return match;
    const resolved = resolvePath(baseDir, spec);
    const blobUrl = blobMap[resolved];
    if (!blobUrl) return match;
    return `import ${what}"${blobUrl}"`;
  });
}

// Inject router into iframe to handle <a data-virtual-href>
function injectRouterScript(win, doc) {
  doc.addEventListener("click", e => {
    const a = e.target.closest("a[data-virtual-href]");
    if (!a) return;
    e.preventDefault();
    const targetPath = a.getAttribute("data-virtual-href");
    navigateTo(targetPath);
  });
}

// Helpers

function isExternalUrl(url) {
  return /^https?:\/\//i.test(url) || url.startsWith("//");
}

function resolvePath(baseDir, relative) {
  if (relative.startsWith("/")) return relative;
  const stack = baseDir.split("/").filter(Boolean);
  const parts = relative.split("/");

  for (const part of parts) {
    if (part === "." || part === "") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return "/" + stack.join("/");
}
