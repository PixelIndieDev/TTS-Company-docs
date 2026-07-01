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

function escapeHTML(e){return e.replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function highlightCode(){"undefined"!=typeof Prism&&"function"==typeof Prism.highlightAll&&Prism.highlightAll()}async function fetchAndRender(e,t){if(!contentElement)return!1;try{var n=await fetch(e);if(n.ok)return contentElement.innerHTML=await n.text(),highlightCode(),!0;throw new Error("Failed to load "+e)}catch(e){return console.error(e),t&&(contentElement.innerHTML=t),!1}}async function loadContent(e,t=!0){var n;e&&(n=await fetchAndRender(resolveFilePath(e)),t&&(t=window.location.pathname+"?page="+e,history.pushState({page:e},"",t)),n?highlightCode():contentElement&&(t=escapeHTML(e),contentElement.innerHTML=`<h2>404 - Page Not Found</h2><p>The requested page "${t}" does not exist.</p>`))}async function handleRouting(e){e?await loadContent(e,!1):await fetchAndRender(HOMEPAGE_CONTENT_DEFAULT,HARDCODED_HOME)}document.addEventListener("click",e=>{e=e.target.closest(".nav-btn");e&&loadContent(e.getAttribute("data-page"))}),window.addEventListener("popstate",e=>{handleRouting(e.state?e.state.page:new URLSearchParams(window.location.search).get("page"))}),window.addEventListener("DOMContentLoaded",()=>{var e=new URLSearchParams(window.location.search).get("page");history.replaceState({page:e},"",window.location.search),handleRouting(e)});