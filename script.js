document.getElementById("loadBtn").addEventListener("click", () => {
  const repoUrl = document.getElementById("repoInput").value.trim();
  loadRepoViaGithack(repoUrl);
});

function convertRepoToGithack(repoUrl) {
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/#]+)/i);
  if (!match) return null;

  const user = match[1];
  const repo = match[2];

  return `https://raw.githack.com/${user}/${repo}/main/index.html`;
}

async function loadRepoViaGithack(repoUrl) {
  const githackUrl = convertRepoToGithack(repoUrl);
  if (!githackUrl) {
    alert("Invalid GitHub repo URL");
    return;
  }

  try {
    const res = await fetch(githackUrl);
    const html = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const content = document.getElementById("content");
    content.innerHTML = doc.body.innerHTML;

    const scripts = doc.querySelectorAll("script");

    scripts.forEach(oldScript => {
      const newScript = document.createElement("script");

      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }

      document.body.appendChild(newScript);
    });

  } catch (err) {
    console.error(err);
    alert("Failed to load site.");
  }
}
