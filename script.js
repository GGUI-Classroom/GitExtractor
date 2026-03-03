async function loadGithack(url) {
  const res = await fetch(url);
  const html = await res.text();

  // Create a DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Inject HTML body
  const content = document.getElementById("content");
  content.innerHTML = doc.body.innerHTML;

  // Execute scripts
  const scripts = doc.querySelectorAll("script");

  scripts.forEach(oldScript => {
    const newScript = document.createElement("script");

    if (oldScript.src) {
      // External script
      newScript.src = oldScript.src;
    } else {
      // Inline script
      newScript.textContent = oldScript.textContent;
    }

    document.body.appendChild(newScript);
  });
}
