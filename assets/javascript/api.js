// Constants
const HARDCODED_HOME = `<p>UNKNOWN DEFAULT TEXT</p>`;
const HOMEPAGE_CONTENT_DEFAULT = 'pages/api_home.html';

const PREFIX_FUNCTIONS_API = 'F_api_';
const PREFIX_FUNCTIONS_UTILS = 'F_utils_';

const contentElement = document.getElementById('replaceableContent');

function resolveFilePath(pageName) {
  if (pageName.startsWith(PREFIX_FUNCTIONS_API)) {
    return `pages/functions/api/${pageName.slice(6)}.html`;
  }
  if (pageName.startsWith(PREFIX_FUNCTIONS_UTILS)) {
    return `pages/functions/utils/${pageName.slice(8)}.html`;
  }
  return `${pageName}.html`;
}

function escapeHTML(e) {
  return e.replace(/[&<>"']/g, e => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[e])
}

function highlightCode() {
  "undefined" != typeof Prism && "function" == typeof Prism.highlightAll && Prism.highlightAll()
}

async function getFileNames() {
  const cachedFiles = sessionStorage.getItem('apiFileNamesGrouped');
  if (cachedFiles) {
    return JSON.parse(cachedFiles);
  }

  const baseUrl = '/pages/functions/api/';
  const grouped = await fetchFolderGrouped(baseUrl);
  sessionStorage.setItem('apiFileNamesGrouped', JSON.stringify(grouped));
  return grouped;
}

function getFriendlyName(fileName) {
  if (!fileName) return '';

  let spaced = fileName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/([0-9])([a-zA-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])([0-9])/g, '$1 $2');

  let words = spaced.split(' ');

  return words.map((word, index) => {
    if (index === 0) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    
    const acronyms = ['TTS'];
    if (acronyms.includes(word.toUpperCase())) {
      return word.toUpperCase();
    }
    return word.toLowerCase();
  }).join(' ');
}

function generateNavButtons(groupedFiles, containerSelector, prefix) {
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.error(`Container with selector "${containerSelector}" not found.`);
    return;
  }
  const folderOrder = Object.keys(groupedFiles).sort((a, b) => {
    if (a === 'root') return -1;
    if (b === 'root') return 1;
    return a.localeCompare(b);
  });

  const html = folderOrder.map(folderName => {
    const files = groupedFiles[folderName];
    if (!files || !files.length) return '';

    const buttonsHTML = files.map(filePath => {
      const displayName = filePath.includes('/') ? filePath.split('/').pop() : filePath;
      return `<button class="nav-btn" data-page="${prefix}${filePath}">${displayName}()</button>`;
    }).join('');

    if (folderName === 'root') {
      return buttonsHTML;
    }

    const folderHeader = `<h4>${escapeHTML(folderName)}</h4>`;
    return `${folderHeader}<div class="nav_folder_group">${buttonsHTML}</div>`;
  }).join('');

  container.innerHTML = html;
}

function updateFunctionTitle(pageName) {
  const titleElement = document.getElementById('func_title'); 
  if (!titleElement) return;
  if (!pageName) {
    titleElement.textContent = "TITLE ERROR";
    return;
  }

  let fileName = pageName;
  if (fileName.startsWith(PREFIX_FUNCTIONS_API)) {
    fileName = fileName.slice(PREFIX_FUNCTIONS_API.length);
  } else if (fileName.startsWith(PREFIX_FUNCTIONS_UTILS)) {
    fileName = fileName.slice(PREFIX_FUNCTIONS_UTILS.length);
  }

  if (fileName.includes('/')) {
    fileName = fileName.split('/').pop();
  }

  titleElement.textContent = getFriendlyName(fileName);
}

async function fetchFolderGrouped(folderUrl) {
  const grouped = {};

  try {
    const response = await fetch(folderUrl);
    const text = await response.text();

    const div = document.createElement('div');
    div.innerHTML = text;

    const links = div.querySelectorAll('a');
    const subfolders = [];

    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href === '../' || href === './' || href.startsWith('?') || href.startsWith('http')) {
        return;
      }

      if (href.endsWith('/')) {
        const folderName = decodeURIComponent(href.slice(0, -1).split('/').pop());
        subfolders.push(folderName);
      } else {
        const rawFileName = href.split('/').pop();
        const decodedName = decodeURIComponent(rawFileName);
        const fileName = decodedName.replace(/\.html$/i, '');
        if (!grouped['root']) grouped['root'] = [];
        grouped['root'].push(fileName);
      }
    });

    for (const folderName of subfolders) {
      const subfolderUrl = `${folderUrl}${encodeURIComponent(folderName)}/`;
      try {
        const subResponse = await fetch(subfolderUrl);
        const subText = await subResponse.text();

        const subDiv = document.createElement('div');
        subDiv.innerHTML = subText;

        const subLinks = subDiv.querySelectorAll('a');
        const files = [];

        subLinks.forEach(link => {
          const href = link.getAttribute('href');
          if (!href || href === '../' || href === './' || href.startsWith('?') || href.startsWith('http') || href.endsWith('/')) {
            return;
          }
          const rawFileName = href.split('/').pop();
          const decodedName = decodeURIComponent(rawFileName);
          const fileName = decodedName.replace(/\.html$/i, '');
          files.push(`${folderName}/${fileName}`);
        });

        if (files.length) {
          grouped[folderName] = files;
        }
      } catch (error) {
        console.error(`Could not fetch subfolder contents for ${folderName}:`, error);
      }
    }

    return grouped;
  } catch (error) {
    console.error("Could not fetch folder contents:", error);
    return grouped;
  }
}

async function fetchAndRender(e, t) {
  if (!contentElement) return !1;
  try {
    var n = await fetch(e);
    if (n.ok) {
    contentElement.innerHTML = await n.text();
    highlightCode();
    
    // on successfull load
    getFileNames().then(files => generateNavButtons(files, "#button_links_api", PREFIX_FUNCTIONS_API));

    return !0;
  }
    throw new Error("Failed to load " + e)
  } catch (e) {
    return console.error(e), t && (contentElement.innerHTML = t), !1
  }
}

async function loadContent(pageName, updateHistory = true) {
  if (!pageName) return;
  const success = await fetchAndRender(resolveFilePath(pageName));
  
  if (updateHistory) {
    const newUrl = window.location.pathname + "?page=" + pageName;
    history.pushState({ page: pageName }, "", newUrl);
  }

  if (success) {
    updateFunctionTitle(pageName);
  } else if (contentElement) {
    const escaped = escapeHTML(pageName);
    contentElement.innerHTML = `<h2>404 - Page Not Found</h2><p>The requested page "${escaped}" does not exist.</p>`;
  }
}

async function handleRouting(e) {
  e ? await loadContent(e, !1) : await fetchAndRender(HOMEPAGE_CONTENT_DEFAULT, HARDCODED_HOME)
}

document.addEventListener("click", e => {
  e = e.target.closest(".nav-btn");
  e && loadContent(e.getAttribute("data-page"))
}), window.addEventListener("popstate", e => {
  handleRouting(e.state ? e.state.page : new URLSearchParams(window.location.search).get("page"))
}), window.addEventListener("DOMContentLoaded", () => {
  var e = new URLSearchParams(window.location.search).get("page");
  history.replaceState({
    page: e
  }, "", window.location.search), handleRouting(e)
});