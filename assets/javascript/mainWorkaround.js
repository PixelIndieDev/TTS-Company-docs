const wholeContentElement = document.getElementById('content');

function doLoad() {
  if (!wholeContentElement) return false;
  wholeContentElement.classList.remove('is-loaded');

  requestAnimationFrame(() => wholeContentElement.classList.add('is-loaded'));
}

doLoad();