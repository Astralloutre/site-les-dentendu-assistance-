/* ==========================================================
   SCRIPT — Page Service Maintenance Les Détendus
   1. Smooth scroll (Lenis)
   2. En-tête + barre de progression
   3. Menu mobile
   4. Révélations au scroll
   5. Effet 3D / parallax du hero
   6. Marquee infini
   7. Carte Leaflet + recherche d'adresse + repère
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
    const target = document.querySelector(link.getAttribute("href"));
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
  progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
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
if (window.matchMedia("(hover: hover)").matches) {
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
  heroVisual.style.translate = `0 ${y * 0.12}px`;
}, { passive: true });

/* ---------- 6. MARQUEE INFINI ---------- */
// On duplique le groupe de mots : l'animation CSS translate de -50% boucle sans coupure
const track = document.querySelector(".marquee__track");
const group = track.querySelector(".marquee__group");
const clone = group .cloneNode(true);
clone.setAttribute("aria-hidden", "true");
track.appendChild(clone);

/* ---------- 7. CARTE LEAFLET / OPENSTREETMAP ---------- */
const METZ = [49.1193, 6.1757];                       // centre par défaut : Metz
const NOMINATIM = "https://nominatim.openstreetmap.org"; // service gratuit de géocodage OSM

const map = L.map("map", { zoomControl: true, scrollWheelZoom: true }).setView(METZ, 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Icône personnalisée du repère (le style est dans style.css → .pin)
const pinIcon = L.divIcon({
  className: "",
  html: '<div class="pin"><span class="pin__shadow"></span><span class="pin__drop"></span></div>',
  iconSize: [40, 52],
  iconAnchor: [20, 50],
  popupAnchor: [0, -46]
});

let marker = null;                    // repère actuel
let current = null;                   // { lat, lng, address }

// Éléments de la zone d'infos
const pinEmpty = document.getElementById("pinEmpty");
const pinData = document.getElementById("pinData");
const pinAddress = document.getElementById("pinAddress");
const pinCoords = document.getElementById("pinCoords");
const osmLink = document.getElementById("osmLink");

// Pose (ou déplace) le repère et met à jour les infos
function setPin(lat, lng, address) {
  if (marker) marker.remove();
  marker = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);
  // Le repère peut être déplacé à la souris / au doigt
  marker.on("dragend", () => {
    const p = marker.getLatLng();
    setPin(p.lat, p.lng);
  });

  current = { lat, lng, address: address || "Recherche de l'adresse…" };
  updateInfo();
  if (!address) reverseGeocode(lat, lng);
}

// Affiche l'adresse et les coordonnées sous la carte
function updateInfo() {
  pinEmpty.hidden = !!current;
  pinData.hidden = !current;
  if (!current) return;
  pinAddress.textContent = current.address;
  pinCoords.textContent = `${current.lat.toFixed(6)}, ${current.lng.toFixed(6)}`;
  osmLink.href = `https://www.openstreetmap.org/?mlat=${current.lat}&mlon=${current.lng}#map=18/${current.lat}/${current.lng}`;
  marker.bindPopup(current.address).openPopup();
}

// Coordonnées → adresse (géocodage inverse)
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`${NOMINATIM}/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`);
    const data = await res.json();
    if (current && current.lat === lat) {
      current.address = data?.display_name || "Adresse introuvable (position GPS conservée)";
      updateInfo();
    }
  } catch {
    current.address = "Adresse indisponible (position GPS conservée)";
    updateInfo();
  }
}

// Clic sur la carte → pose d'un repère
map.on("click", (e) => setPin(e.latlng.lat, e.latlng.lng));

/* --- Recherche d'adresse --- */
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (q.length < 3) return showToast("Saisissez au moins 3 caractères");

  searchResults.innerHTML = '<li class="is-empty">Recherche en cours…</li>';
  searchResults.classList.add("is-open");
  try {
    const res = await fetch(`${NOMINATIM}/search?format=json&limit=5&countrycodes=fr&accept-language=fr&q=${encodeURIComponent(q)}`);
    const results = await res.json();
    // Supprime les doublons (même libellé d'adresse)
    const list = Array.isArray(results) ? results : [];
    renderResults(list.filter((r, i) => list.findIndex((o) => o.display_name === r.display_name) === i));
  } catch {
    searchResults.innerHTML = '<li class="is-empty">Service de recherche indisponible, réessayez.</li>';
  }
});

// Affiche la liste des adresses trouvées
function renderResults(results) {
  searchResults.innerHTML = "";
  if (!results.length) {
    searchResults.innerHTML = '<li class="is-empty">Aucune adresse trouvée</li>';
    return;
  }
  results.forEach((r, i) => {
    const li = document.createElement("li");
    li.textContent = r.display_name;
    li.tabIndex = 0;
    li.dataset.testid = `address-result-${i}`;
    const choose = () => {
      const lat = parseFloat(r.lat), lng = parseFloat(r.lon);
      map.flyTo([lat, lng], 17, { duration: 1.2 });
      setPin(lat, lng, r.display_name);
      searchResults.classList.remove("is-open");
      searchInput.value = r.display_name;
    };
    li.addEventListener("click", choose);
    li.addEventListener("keydown", (ev) => { if (ev.key === "Enter") choose(); });
    searchResults.appendChild(li);
  });
}

// Ferme la liste si on clique ailleurs
document.addEventListener("click", (e) => {
  if (!searchForm.contains(e.target)) searchResults.classList.remove("is-open");
});

/* --- Géolocalisation "Ma position" --- */
document.getElementById("locateBtn").addEventListener("click", () => {
  if (!navigator.geolocation) return showToast("Géolocalisation non disponible");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      map.flyTo([latitude, longitude], 17, { duration: 1.2 });
      setPin(latitude, longitude);
    },
    () => showToast("Position refusée ou introuvable")
  );
});

/* --- Copier la position (à coller dans le formulaire) --- */
document.getElementById("copyBtn").addEventListener("click", async () => {
  if (!current) return;
  const text = `${current.address} — GPS : ${current.lat.toFixed(6)}, ${current.lng.toFixed(6)}`;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Position copiée ✓ Collez-la dans le formulaire");
  } catch {
    showToast("Copie impossible, sélectionnez le texte manuellement");
  }
});

/* --- Effacer le repère --- */
document.getElementById("clearBtn").addEventListener("click", () => {
  if (marker) marker.remove();
  marker = null;
  current = null;
  updateInfo();
});

// Leaflet recalcule sa taille quand la box apparaît (animation reveal)
setTimeout(() => map.invalidateSize(), 600);
window.addEventListener("resize", () => map.invalidateSize());

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
