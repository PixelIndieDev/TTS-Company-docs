async function loadHeader() {
  const headerElement = document.getElementById('header_id');
  if (!headerElement) return;

  try {
    const response = await fetch('pages/header.html'); 
    if (response.ok) {
      headerElement.innerHTML = await response.text();
      headerElement.classList.add('is-loaded');
    } else {
      console.error("Failed to load header template");
    }
  } catch (error) {
    console.error("Error fetching header:", error);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  loadHeader();
});