// Configuration Configuration mapping out types, prefixes, home paths, and asset locations
const HARDCODED_HOME = `<p>UNKNOWN DEFAULT TEXT</p>`;
const ACRONYMS = ['TTS', 'API'];

const PAGE_CONFIG = {
  api: {
    prefix: 'F_api_',
    home: 'pages/api_home.html',
    dir: 'pages/functions/api/',
    fetchUrl: 'pages/functions/api/',
    postfix: '()'
  },
  utils: {
    prefix: 'F_utils_',
    home: 'pages/utils_home.html',
    dir: 'pages/functions/utils/',
    fetchUrl: 'pages/functions/utils/',
    postfix: '()'
  },
  parts: {
    prefix: 'P_parts_',
    home: 'pages/parts_home.html',
    dir: 'pages/parts/',
    fetchUrl: 'pages/parts/',
    postfix: ''
  },
  gettingstarted: {
    prefix: 'G_guide_',
    home: 'pages/getting_started_home.html',
    dir: 'pages/guide/',
    fetchUrl: 'pages/guide/',
    postfix: ''
  }
};

const variablesToCheckContent = [
  'networkObjectRefOfSpeaker', 
  'objectRefOfSpeaker', 
  'useGlobalAudioSource', 
  'audioSourceSettings', 
  'textsToSpeak', 
  'textToSpeak', 
  'voiceSettings'
];

const contentElement = document.getElementById('replaceableContent');
const wholeContentElement = document.getElementById('content');

const REPO_BASE = window.location.hostname.includes('github.io') ? `/${window.location.pathname.split('/')[1]}/` : '/';

function getCurrentPageKey() {
  const path = window.location.pathname.toLowerCase();
  return Object.keys(PAGE_CONFIG).find(key => path.includes(`${key}_docs`)) || null;
}

function getHomePageUrl() {
  const currentKey = getCurrentPageKey();
  return currentKey ? `${REPO_BASE}${PAGE_CONFIG[currentKey].home}` : HARDCODED_HOME;
}

function escapeHTML(str) {
  const entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  return str.replace(/[&<>"']/g, match => entityMap[match]);
}

function highlightCode() {
  if (typeof Prism !== "undefined" && typeof Prism.highlightAll === "function") {
    Prism.highlightAll();
  }
}

async function getFileNames(type) {
  const cacheKey = `${type}FileNamesGrouped`;
  const cachedFiles = sessionStorage.getItem(cacheKey);
  
  if (cachedFiles) {
    return JSON.parse(cachedFiles);
  }

  const config = PAGE_CONFIG[type];
  if (!config) return {};

  try {
    const response = await fetch(`${REPO_BASE}files.json`); 
    if (!response.ok) throw new Error('Failed to fetch files.json');
    
    const allFiles = await response.json();
    const filesList = allFiles[type] || [];
    const configDir = config.dir; 
    
    const grouped = {};

    filesList.forEach(fullPath => {
      let cleanedPath = fullPath.replace(/^\//, '').replace(/\.html$/i, '');
      
      if (cleanedPath.startsWith(configDir)) {
        cleanedPath = cleanedPath.slice(configDir.length);
      }
      
      if (cleanedPath.includes('/')) {
        const parts = cleanedPath.split('/');
        const immediateParent = parts[parts.length - 2]; 
        
        if (!grouped[immediateParent]) {
          grouped[immediateParent] = [];
        }
        grouped[immediateParent].push(cleanedPath);
      } else {
        if (!grouped['root']) {
          grouped['root'] = [];
        }
        grouped['root'].push(cleanedPath);
      }
    });

    sessionStorage.setItem(cacheKey, JSON.stringify(grouped));
    return grouped;
  } catch (error) {
    console.error("Could not load or process files.json:", error);
    return {};
  }
}

function getFriendlyName(fileName) {
  if (!fileName) return '';

  const spaced = fileName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/([0-9])([a-zA-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])([0-9])/g, '$1 $2');

  return spaced.split(' ').map((word, index) => {
    const upperWord = word.toUpperCase();
    if (ACRONYMS.includes(upperWord)) {
      return upperWord;
    }
    if (index === 0) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    return word.toLowerCase();
  }).join(' ');
}

function generateNavButtons(groupedFiles, containerSelector, prefix, postfix) {
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

  container.innerHTML = folderOrder.map(folderName => {
    const files = groupedFiles[folderName];
    if (!files || !files.length) return '';

    const buttonsHTML = files.map(filePath => {
      displayName = filePath.includes('/') ? filePath.split('/').pop() : filePath;
      if (prefix === PAGE_CONFIG.gettingstarted.prefix) displayName = getFriendlyName(displayName);
      return `<button class="nav-btn" data-page="${prefix}${filePath}">${displayName}${postfix}</button>`;
    }).join('');

    if (folderName === 'root') {
      return buttonsHTML;
    }

    const cleanFolderName = folderName.replace(/^(\d+)-/, '');

    return `<h4>${escapeHTML(cleanFolderName)}</h4><div class="nav_folder_group">${buttonsHTML}</div>`;
  }).join('');
}

function updateFunctionTitle(pageName) {
  const titleElement = document.getElementById('func_title'); 
  if (!titleElement) return;
  if (!pageName) {
    titleElement.textContent = "TITLE ERROR";
    return;
  }

  let fileName = pageName;
  for (const config of Object.values(PAGE_CONFIG)) {
    if (fileName.startsWith(config.prefix)) {
      fileName = fileName.slice(config.prefix.length);
      break;
    }
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
      } catch (subError) {
        console.error(`Could not fetch subfolder contents for ${folderName}:`, subError);
      }
    }

    return grouped;
  } catch (error) {
    console.error("Could not fetch folder contents:", error);
    return grouped;
  }
}

async function fetchAndRender(url, fallbackHtml = null) {
  if (!contentElement) return false;
  if (!wholeContentElement) return false;
  wholeContentElement.classList.remove('is-loaded');

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load URL asset target: ${url}`);
    }

    contentElement.innerHTML = await response.text();
    highlightCode();
    
    const currentKey = getCurrentPageKey();
    if (currentKey && PAGE_CONFIG[currentKey]) {
      const config = PAGE_CONFIG[currentKey];
      const selector = `#button_links_${currentKey}`;
      
      getFileNames(currentKey).then(files => {
        generateNavButtons(files, selector, config.prefix, config.postfix);
      });
    }

    await loadContentVariables();
    requestAnimationFrame(() => wholeContentElement.classList.add('is-loaded'));
    return true;

  } catch (error) {
    console.error(error);
    if (fallbackHtml) {
      contentElement.innerHTML = fallbackHtml;
      requestAnimationFrame(() => wholeContentElement.classList.add('is-loaded'));
    }
    return false;
  }
}

async function loadContentVariables() {
  const fetchPromises = variablesToCheckContent.map(async (variable) => {
    try {
      const response = await fetch(`${REPO_BASE}pages/variables/${variable}.html`);
      if (response.ok) {
        const fileContent = await response.text();
        document.querySelectorAll(`.variable_${variable}`).forEach(element => {
          element.innerHTML = fileContent;
        });
      }
    } catch (error) {
      console.error(`Failed to load content variable: ${variable}`, error);
    }
  });

  await Promise.all(fetchPromises);
}

async function loadContent(pageName, updateHistory = true) {
  if (!pageName) return;
  
  const success = await fetchAndRender(resolveFilePath(pageName));
  
  if (updateHistory) {
    const newUrl = `${window.location.pathname}?page=${pageName}`;
    history.pushState({ page: pageName }, "", newUrl);
  }

  if (success) {
    updateFunctionTitle(pageName);
  } else if (contentElement) {
    const escaped = escapeHTML(pageName);
    contentElement.innerHTML = `<h2>404 - Page Not Found</h2><p>The requested page "${escaped}" does not exist.</p>`;
    requestAnimationFrame(() => wholeContentElement.classList.add('is-loaded'));
  }
}

async function handleRouting(pageName) {
  if (pageName) {
    await loadContent(pageName, false);
  } else {
    await fetchAndRender(getHomePageUrl(), HARDCODED_HOME);
  }
}

document.addEventListener("click", event => {
  const targetBtn = event.target.closest(".nav-btn");
  if (targetBtn) {
    loadContent(targetBtn.getAttribute("data-page"));
  }
});

window.addEventListener("popstate", event => {
  const fallbackPage = new URLSearchParams(window.location.search).get("page");
  handleRouting(event.state ? event.state.page : fallbackPage);
});

window.addEventListener("DOMContentLoaded", () => {
  const initialPage = new URLSearchParams(window.location.search).get("page");
  history.replaceState({ page: initialPage }, "", window.location.search);
  handleRouting(initialPage);
});