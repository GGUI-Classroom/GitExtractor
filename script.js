const input = document.getElementById("repoInput");
const content = document.getElementById("content");

document.getElementById("loadBtn").addEventListener("click", () => {
  const url = input.value.trim();
  loadSite(url);
});

function convertToPagesUrl(repoUrl) {
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/#]+)/i);
  if (!match) return null;

  const user = match[1];
  const repo = match[2];

  return `https://${user}.github.io/${repo}/`;
}

async function loadSite(repoUrl) {
  const pagesUrl = convertToPagesUrl(repoUrl);
  if (!pagesUrl) {
    alert("Invalid GitHub repo URL");
    return;
  }

  try {
    const html = await fetch(pagesUrl).then(r => r.text());
    const rewritten = rewriteHtml(html, pagesUrl);
    content.innerHTML = rewritten;
  } catch (e) {
    console.error(e);
    alert("Failed to load site.");
  }
}

function rewriteHtml(html, baseUrl) {
  return html.replace(/(src|href)=["']([^"']+)["']/g, (match, attr, url) => {
    if (url.startsWith("http") || url.startsWith("//") || url.startsWith("#")) {
      return match;
    }
    const absolute = new URL(url, baseUrl).href;
    return `${attr}="${absolute}"`;
  });
}
