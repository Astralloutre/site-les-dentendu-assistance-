/* ==========================================================
   SCRIPT — Page Service Maintenance Les Détendus
   1. Smooth scroll (Lenis)
   2. En-tête + barre de progression
   3. Menu mobile
   4. Révélations au scroll
   5. Effet 3D / parallax du hero
   6. Marquee infini
   7. Google Maps + recherche d'adresse + repère
   8. Microsoft Forms (affichage ou message d'attente)
   ========================================================== */

// Active les animations CSS ".reveal" (si JS absent, tout reste visible)
document.documentElement.classList.add("js");

/* ---------- 1. SMOOTH SCROLL (Lenis) ---------- */
let lenis = null;
if (window.Lenis && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  lenis = new Lenis({ duration: 1.2, smoothWheel: true });
  // Boucle d'animation : Lenis met à jour le scroll à chaque frame
  const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}

// Liens d'ancre (#demande, #etapes...) : défilement doux
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    const href = link.getAttribute("href");
    if (!href || href === "#") return;
    const target = document.getElementById(href.slice(1));
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: -70 });
    else target.scrollIntoView({ behavior: "smooth" });
  });
});

/* ---------- 2. EN-TÊTE + BARRE DE PROGRESSION ---------- */
const header = document.getElementById("header");
const progress = document.getElementById("scrollProgress");

function onScroll() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  header.classList.toggle("is-scrolled", y > 40);       // fond flouté après 40px
  if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- 3. MENU MOBILE ---------- */
const burger = document.getElementById("burger");
const nav = document.getElementById("nav");

function closeMenu() {
  nav.classList.remove("is-open");
  burger.classList.remove("is-open");
  burger.setAttribute("aria-expanded", "false");
}
burger.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  burger.classList.toggle("is-open", open);
  burger.setAttribute("aria-expanded", String(open));
});

/* ---------- 4. RÉVÉLATIONS AU SCROLL ---------- */
// Chaque élément ".reveal" apparaît quand 15% de sa hauteur est visible
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target); // une seule fois
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

/* ---------- 5. EFFET 3D DU HERO ---------- */
// Sur ordinateur : la scène s'incline selon la position de la souris
const heroVisual = document.getElementById("heroVisual");
const heroScene = document.getElementById("heroScene");
if (heroVisual && heroScene && window.matchMedia("(hover: hover)").matches) {
  heroVisual.addEventListener("mousemove", (e) => {
    const r = heroVisual.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;   // -0.5 → 0.5
    const y = (e.clientY - r.top) / r.height - 0.5;
    heroScene.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`;
  });
  heroVisual.addEventListener("mouseleave", () => { heroScene.style.transform = ""; });
}
// Sur tous les écrans : léger parallax vertical du visuel au scroll
window.addEventListener("scroll", () => {
  const y = Math.min(window.scrollY, 800);
  if (heroVisual) heroVisual.style.translate = `0 ${y * 0.12}px`;
}, { passive: true });

/* ---------- 6. MARQUEE INFINI ---------- */
// On duplique le groupe de mots : l'animation CSS translate de -50% boucle sans coupure
const track = document.querySelector(".marquee__track");
const group = track?.querySelector(".marquee__group");
if (track && group) {
 const clone = group.cloneNode(true);
 clone.setAttribute("aria-hidden", "true");
 track.appendChild(clone);
}

/* ---------- 7. GOOGLE MAPS ---------- */
// Clé navigateur : restreindre aux domaines du site dans Google Cloud.
// Activer Maps JavaScript API + Geocoding API et la facturation.
const GOOGLE_MAPS_API_KEY = "AIzaSyD5FeR02azdjwXCHoW8-IJW5eeXV7dWo9I";
const mapElement = document.getElementById("map");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const pinEmpty = document.getElementById("pinEmpty");
const pinData = document.getElementById("pinData");
const pinAddress = document.getElementById("pinAddress");
const pinCoords = document.getElementById("pinCoords");
const googleMapsLink = document.getElementById("googleMapsLink");
let map, geocoder, AdvancedMarkerElement, PinElement;
let marker = null, current = null;
let pinVersion = 0, searchVersion = 0;

function mapMessage(message) {
  mapElement.replaceChildren();
  const p = document.createElement("p");
  p.className = "map-message";
  p.setAttribute("role", "status");
  p.textContent = message;
  mapElement.appendChild(p);
}
function mapReady() {
  if (map && geocoder) return true;
  showToast("Carte indisponible : vérifiez la configuration Google Maps.");
  return false;
}
window.gm_authFailure = () => {
  map = null;
  mapMessage("Google Maps : clé refusée. Vérifiez la clé API, les domaines autorisés et la facturation.");
};
window.initGoogleMap = async () => {
  try {
    const mapsLibrary = await google.maps.importLibrary("maps");
    ({ AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker"));
    const { Geocoder } = await google.maps.importLibrary("geocoding");
    geocoder = new Geocoder();
    map = new mapsLibrary.Map(mapElement, {
      center: { lat: 49.1193, lng: 6.1757 }, zoom: 12,
      mapId: "DEMO_MAP_ID", // Remplacer par votre identifiant de carte en production.
      mapTypeControl: true, streetViewControl: true,
      fullscreenControl: true, gestureHandling: "cooperative"
    });
    map.addListener("click", (event) => {
      if (!event.latLng) return;
      if (event.stop) event.stop();
      setPin(event.latLng.lat(), event.latLng.lng());
    });
  } catch (error) {
    console.error("Initialisation Google Maps", error);
    map = null;
    mapMessage("Impossible de charger Google Maps. Vérifiez la configuration du projet Google Cloud.");
  }
};
function updateInfo() {
  pinEmpty.hidden = !!current;
  pinData.hidden = !current;
  if (!current) return;
  pinAddress.textContent = current.address;
  pinCoords.textContent = `${current.lat.toFixed(6)}, ${current.lng.toFixed(6)}`;
  googleMapsLink.href = `https://www.google.com/maps/search/?api=1&query=${current.lat},${current.lng}`;
}
async function setPin(lat, lng, address) {
  const version = ++pinVersion;
  if (marker) marker.map = null;
  const pin = new PinElement({ background: "#d9307d", borderColor: "#ffffff", glyphColor: "#c9d22a" });
  marker = new AdvancedMarkerElement({
    map, position: { lat, lng }, gmpDraggable: true,
    title: "Position de la cabine — déplacer pour ajuster", content: pin.element
  });
  marker.addListener("dragend", (event) => {
    if (event.latLng) setPin(event.latLng.lat(), event.latLng.lng());
  });
  current = { lat, lng, address: address || "Recherche de l’adresse…" };
  updateInfo();
  if (address) return;
  try {
    const { results } = await geocoder.geocode({ location: { lat, lng } });
    if (version !== pinVersion || !current) return;
    current.address = results[0]?.formatted_address || "Adresse introuvable (position GPS conservée)";
  } catch {
    if (version !== pinVersion || !current) return;
    current.address = "Adresse indisponible (position GPS conservée)";
  }
  updateInfo();
}
function resultMessage(message) {
  searchResults.replaceChildren();
  const li = document.createElement("li");
  li.className = "is-empty";
  li.textContent = message;
  searchResults.appendChild(li);
  searchResults.classList.add("is-open");
}
searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!mapReady()) return;
  const query = searchInput.value.trim();
  if (query.length < 3) return showToast("Saisissez au moins 3 caractères");
  const version = ++searchVersion;
  resultMessage("Recherche en cours…");
  try {
    const { results } = await geocoder.geocode({ address: query, componentRestrictions: { country: "FR" } });
    if (version !== searchVersion) return;
    searchResults.replaceChildren();
    if (!results.length) return resultMessage("Aucune adresse trouvée");
    results.slice(0, 5).forEach((result, index) => {
      const li = document.createElement("li");
      li.textContent = result.formatted_address;
      li.tabIndex = 0;
      li.dataset.testid = `address-result-${index}`;
      const choose = () => {
        ++searchVersion;
        const position = result.geometry.location;
        map.panTo(position);
        map.setZoom(17);
        setPin(position.lat(), position.lng(), result.formatted_address);
        searchInput.value = result.formatted_address;
        searchResults.classList.remove("is-open");
      };
      li.addEventListener("click", choose);
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(); }
      });
      searchResults.appendChild(li);
    });
  } catch (error) {
    if (version !== searchVersion) return;
    resultMessage(String(error.code || error.message || error).includes("ZERO_RESULTS")
        ? "Aucune adresse trouvée" : "Recherche indisponible. Vérifiez que Geocoding API est activée.");
  }
});
document.addEventListener("click", (e) => {
  if (!searchForm.contains(e.target)) { ++searchVersion; searchResults.classList.remove("is-open"); }
});
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { ++searchVersion; searchResults.classList.remove("is-open"); }
});
document.getElementById("locateBtn").addEventListener("click", () => {
  if (!mapReady()) return;
  if (!navigator.geolocation) return showToast("Géolocalisation non disponible");
  navigator.geolocation.getCurrentPosition(({ coords }) => {
        if (!map) return;
        map.panTo({ lat: coords.latitude, lng: coords.longitude });
        map.setZoom(17);
        setPin(coords.latitude, coords.longitude);
      }, () => showToast("Position refusée ou introuvable. Autorisez la localisation et utilisez HTTPS."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
});
document.getElementById("copyBtn").addEventListener("click", async () => {
  if (!current) return;
  const text = `${current.address} — GPS : ${current.lat.toFixed(6)}, ${current.lng.toFixed(6)}`;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Position copiée. Collez-la dans le formulaire.");
  } catch { showToast("Copie impossible : sélectionnez les coordonnées manuellement."); }
});
document.getElementById("clearBtn").addEventListener("click", () => {
  ++pinVersion;
  if (marker) marker.map = null;
  marker = null;
  current = null;
  updateInfo();
});
// Chargement après l'initialisation du reste de la page.
setTimeout(() => {
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "VOTRE_CLE_API_GOOGLE_MAPS") {
    mapMessage("Pour afficher Google Maps, renseignez GOOGLE_MAPS_API_KEY dans script.js.");
    return;
  }
  mapMessage("Chargement de Google Maps…");
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&loading=async&callback=initGoogleMap&v=weekly&language=fr&region=FR`;
  script.onerror = () => mapMessage("Google Maps ne se charge pas. Vérifiez votre connexion ou votre bloqueur de contenu.");
  document.head.appendChild(script);
}, 0);

/* ---------- 8. MICROSOFT FORMS ---------- */
// Si aucune URL n'est renseignée dans l'iframe (index.html), on affiche le message d'attente
const msForm = document.getElementById("msForm");
const formPlaceholder = document.getElementById("formPlaceholder");
const formUrl = (msForm.getAttribute("src") || "").trim();
msForm.classList.toggle("is-hidden", !formUrl);
formPlaceholder.hidden = !!formUrl;

/* ---------- PETIT MESSAGE (toast) ---------- */
const toast = document.getElementById("toast");
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-show"), 2600);
}
