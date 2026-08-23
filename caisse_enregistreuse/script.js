/**
 * NOZ POS - Logiciel de caisse réaliste
 */
const nozCatalogue = [
    { code: "3701234567890", nom: "LOT 300 CURE-DENTS", prix: 0.50 },
    { code: "8412345678901", nom: "SHAMPOING CHEVAL 5L", prix: 2.99 },
    { code: "5012345678902", nom: "DVD SNOOP DOGG", prix: 0.99 },
    { code: "4002345678903", nom: "MOUSTARDE PERIMEE", prix: 0.20 },
    { code: "3102345678904", nom: "PANTALON TARTAN", prix: 4.50 },
    { code: "3202345678905", nom: "BOITE TUPPERWARE", prix: 0.30 },
    { code: "3302345678906", nom: "COQUE IPHONE 3G", prix: 0.10 }
];

const GRADES = [
    { nom: "CAISSIER JUNIOR", xp: 0, sal: 50 },
    { nom: "CHEF DE CAISSE", xp: 150, sal: 80 },
    { nom: "RESPONSABLE MAGASIN", xp: 400, sal: 120 }
];

let PlayerData = {
    nom: "Employé",
    xp: 0,
    argent: 0,
    gradeIdx: 0,
    jour: 1,
    budgetMagasin: 2500,
    stockMagasin: 100,
    reputation: 100,
    staff: 0,
    salaireAttente: 0,
    clientsServisJour: 0
};

let AppState = {
    currentScreen: 'login',
    time: 8 * 60, // 08:00
    caisse: {
        active: false,
        ticket: [],
        total: 0,
        commande: [],
        input: "",
        modePaiement: false, // true = attente de sélection du paiement
        montantRendu: 0
    },
    clockInterval: null
};

// INITIALISATION
function init() {
    loadData();
    showScreen('login');
}

function loadData() {
    const s = localStorage.getItem('nozSaveReal');
    if(s) PlayerData = JSON.parse(s);
}
function saveData() {
    localStorage.setItem('nozSaveReal', JSON.stringify(PlayerData));
}

function getGrade() {
    let g = 0;
    for(let i=0; i<GRADES.length; i++) {
        if(PlayerData.xp >= GRADES[i].xp) g = i;
    }
    PlayerData.gradeIdx = g;
    return GRADES[g];
}

function updateHubUI() {
    const g = getGrade();
    document.getElementById('hub-nom').textContent = PlayerData.nom;
    document.getElementById('hub-grade').textContent = g.nom;
    document.getElementById('hub-salaire').textContent = PlayerData.salaireAttente;
    document.getElementById('hub-xp').textContent = PlayerData.xp;

    // Déblocage Manager
    if(PlayerData.gradeIdx >= 1) {
        document.getElementById('manager-panel').style.display = 'block';
        document.getElementById('hub-budget').textContent = PlayerData.budgetMagasin.toFixed(2);
        document.getElementById('hub-stock').textContent = PlayerData.stockMagasin;
    } else {
        document.getElementById('manager-panel').style.display = 'none';
    }
}

// NAVIGATION
function showScreen(id) {
    if(id === 'caisse' && PlayerData.stockMagasin <= 0) {
        alert("Attention : Stock magasin épuisé ! Vous ne pouvez pas ouvrir la caisse.");
        return;
    }

    if (AppState.currentScreen !== id) {
        // Stop timer si on quitte la caisse
        if(AppState.currentScreen === 'caisse' && AppState.clockInterval) {
            clearInterval(AppState.clockInterval);
            AppState.clockInterval = null;
        }
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    // Check if it's a modal over hub
    if(['wms','hr','mail'].includes(id)) {
        document.getElementById('hub-screen').classList.add('active');
        openModal(id);
        AppState.currentScreen = 'hub'; // on reste sur le hub logiquement
        return;
    }

    const screenEl = document.getElementById(id + '-screen');
    if (screenEl) {
        screenEl.classList.add('active');
        AppState.currentScreen = id;
    }

    if(id === 'hub') updateHubUI();
    if(id === 'caisse') initCaisse();
}

function login() {
    const val = document.getElementById('login-input-field').value;
    if(val) {
        if(PlayerData.nom === "Employé") PlayerData.nom = "OP-" + val;
        saveData();
        showScreen('hub');
    }
}

// HORLOGE & JOURNEE
function formatTime(mins) {
    let h = Math.floor(mins / 60);
    let m = Math.floor(mins % 60);
    return (h<10?'0':'')+h + ":" + (m<10?'0':'')+m;
}

function updateClock() {
    AppState.time += 1;
    let t = formatTime(AppState.time);
    if(document.getElementById('hub-time-display')) document.getElementById('hub-time-display').textContent = t;
    if(document.getElementById('pos-time')) document.getElementById('pos-time').textContent = t;

    if(AppState.time >= 20 * 60) { // 20:00 Fin de journée
        finDeJournee();
    }
}

function finDeJournee() {
    clearInterval(AppState.clockInterval);
    AppState.clockInterval = null;
    alert(`FIN DE SERVICE\nJour ${PlayerData.jour} terminé.\nClients servis : ${PlayerData.clientsServisJour}\nSalaire gagné : ${PlayerData.salaireAttente} €`);

    PlayerData.jour++;
    PlayerData.argent += PlayerData.salaireAttente;
    PlayerData.salaireAttente = 0;
    PlayerData.clientsServisJour = 0;
    AppState.time = 8 * 60;
    saveData();
    showScreen('hub');
}

// LOGIQUE CAISSE
function initCaisse() {
    AppState.caisse.active = true;
    AppState.caisse.ticket = [];
    AppState.caisse.total = 0;
    AppState.caisse.commande = [];
    AppState.caisse.input = "";
    AppState.caisse.modePaiement = false;

    document.getElementById('pos-op-name').textContent = PlayerData.nom;

    if(!AppState.clockInterval) {
        AppState.clockInterval = setInterval(updateClock, 1000); // 1 min in-game = 1 sec irl
    }
    updateCaisseUI();
}

function appelClient() {
    if(AppState.caisse.commande.length > 0 || AppState.caisse.ticket.length > 0) return; // Déjà en cours
    if(PlayerData.stockMagasin <= 0) { alert("Stock vide !"); return; }

    let nbArticles = Math.floor(Math.random() * 5) + 1;
    if (nbArticles > PlayerData.stockMagasin) nbArticles = PlayerData.stockMagasin;

    AppState.caisse.commande = [];
    for(let i=0; i<nbArticles; i++) {
        let p = nozCatalogue[Math.floor(Math.random() * nozCatalogue.length)];
        AppState.caisse.commande.push(p);
    }
    showNextItem();
}

function showNextItem() {
    if(AppState.caisse.commande.length === 0) {
        document.getElementById('caisse-desc').textContent = "TOTAL À RÉGLER";
        document.getElementById('caisse-ean').textContent = "Appuyez sur TOTAL";
        return;
    }
    const p = AppState.caisse.commande[0];
    document.getElementById('caisse-desc').textContent = p.nom;

    // Simulation code illisible
    const isIllisible = Math.random() < 0.2;
    if(isIllisible) {
        document.getElementById('caisse-ean').textContent = "ILLISIBLE";
        document.getElementById('caisse-ean').style.color = "#aa0000";
    } else {
        document.getElementById('caisse-ean').textContent = p.code;
        document.getElementById('caisse-ean').style.color = "#666";
    }
}

// SAISIE CLAVIER / TACTILE
function typeNum(n) {
    if(AppState.caisse.modePaiement) {
        // En mode paiement on tape le montant donné par le client
        AppState.caisse.input += n;
    } else {
        // Saisie code barre
        AppState.caisse.input += n;
    }
    updateCaisseUI();
}
function clearInput() { AppState.caisse.input = ""; updateCaisseUI(); }

function scanAction() {
    if(AppState.caisse.commande.length === 0) return;
    const p = AppState.caisse.commande[0];
    const eanUI = document.getElementById('caisse-ean').textContent;

    // Si lisible et pas d'input manuel OU si input manuel correct
    if((eanUI !== "ILLISIBLE" && !AppState.caisse.input) || (AppState.caisse.input === p.code)) {
        // Succès
        PlayerData.stockMagasin--;
        AppState.caisse.ticket.push(p);
        AppState.caisse.total += p.prix;
        AppState.caisse.commande.shift();
        AppState.caisse.input = "";

        // Bruitage beep basique
        let actx = new (window.AudioContext || window.webkitAudioContext)();
        let osc = actx.createOscillator(); osc.type="square"; osc.frequency.value = 800;
        osc.connect(actx.destination); osc.start(); osc.stop(actx.currentTime + 0.1);

        updateCaisseUI();
        showNextItem();
    } else {
        // Erreur
        alert("Code erroné !");
        AppState.caisse.input = "";
        updateCaisseUI();
    }
}

function processTotal() {
    if(AppState.caisse.ticket.length > 0 && AppState.caisse.commande.length === 0) {
        AppState.caisse.modePaiement = true;
        document.getElementById('caisse-desc').textContent = "CHOIX DU PAIEMENT";
        document.getElementById('caisse-ean').textContent = "Saisissez montant reçu (Espèce) ou validez CB";
        updateCaisseUI();
    }
}

function payCB() {
    if(!AppState.caisse.modePaiement) return;
    terminerTransaction();
}

function payEsp() {
    if(!AppState.caisse.modePaiement) return;
    let montantRecu = parseFloat(AppState.caisse.input);
    if(isNaN(montantRecu) || montantRecu < AppState.caisse.total) {
        alert("Montant insuffisant ou invalide.");
        AppState.caisse.input = ""; updateCaisseUI();
        return;
    }
    let aRendre = montantRecu - AppState.caisse.total;
    alert(`À RENDRE : ${aRendre.toFixed(2)} €\nOuvrez le tiroir-caisse.`);
    terminerTransaction();
}

function terminerTransaction() {
    PlayerData.clientsServisJour++;
    PlayerData.xp += 10;
    let g = getGrade();
    PlayerData.salaireAttente += g.sal / 10; // Fraction de salaire par client
    PlayerData.budgetMagasin += AppState.caisse.total;

    AppState.caisse.ticket = [];
    AppState.caisse.total = 0;
    AppState.caisse.modePaiement = false;
    AppState.caisse.input = "";
    document.getElementById('caisse-desc').textContent = "EN ATTENTE DE CLIENT";
    document.getElementById('caisse-ean').textContent = "Appuyez sur APPEL CLIENT";

    saveData();
    updateCaisseUI();
}

function fermerCaisse() {
    showScreen('hub');
}

function updateCaisseUI() {
    // Ticket
    const tl = document.getElementById('ticket-lines');
    tl.innerHTML = "";
    AppState.caisse.ticket.forEach(item => {
        tl.innerHTML += `<div class="pos-ticket-line"><span>${item.nom}</span><span>${item.prix.toFixed(2)}</span></div>`;
    });

    document.getElementById('caisse-total').textContent = AppState.caisse.total.toFixed(2);
    document.getElementById('caisse-input').textContent = AppState.caisse.input + "_";

    // Boutons
    const btnCb = document.getElementById('btn-cb');
    const btnEsp = document.getElementById('btn-esp');
    if(AppState.caisse.modePaiement) {
        btnCb.disabled = false; btnEsp.disabled = false;
    } else {
        btnCb.disabled = true; btnEsp.disabled = true;
    }
}

// EVENTS CLAVIER GLOBAUX CAISSE
window.addEventListener('keydown', (e) => {
    if(AppState.currentScreen === 'caisse' && document.getElementById('modal-app').style.display !== 'flex') {
        if(e.key === 'Escape') fermerCaisse();
        else if(e.key === ' ') { e.preventDefault(); appelClient(); }
        else if(e.key === 'Enter') scanAction();
        else if(e.key === 'F1') { e.preventDefault(); openCatalogue(); }
        else if(e.key === 'Backspace' || e.key === 'Delete' || e.key.toLowerCase() === 'c') clearInput();
        else if(e.key.match(/^[0-9.]$/)) typeNum(e.key);
    }
});

// MANAGER MODALS (Minimaliste)
function openModal(type) {
    const m = document.getElementById('modal-app');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    if(type === 'wms') {
        title.textContent = "WMS - Commandes Fournisseur";
        body.innerHTML = `
            <p>Budget dispo : ${PlayerData.budgetMagasin.toFixed(2)} €</p>
            <table style="margin-top:10px;">
                <tr><th>Palette</th><th>Prix</th><th>Action</th></tr>
                <tr><td>Palette Mixte (50 art.)</td><td>50.00 €</td><td><button onclick="buyStock(50, 50)">Commander</button></td></tr>
                <tr><td>Palette Bazar (200 art.)</td><td>180.00 €</td><td><button onclick="buyStock(200, 180)">Commander</button></td></tr>
            </table>
        `;
    } else if (type === 'hr') {
        title.textContent = "Ressources Humaines";
        body.innerHTML = "<p>Recrutement indisponible dans cette version du logiciel.</p>";
    } else if (type === 'mail') {
        title.textContent = "Messagerie Interne";
        body.innerHTML = "<p>Aucun nouveau message.</p>";
    }

    m.classList.add('active');
}

function closeModal() {
    document.getElementById('modal-app').classList.remove('active');
    if(AppState.currentScreen === 'hub') updateHubUI();
}

function openCatalogue() {
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    title.textContent = "CLASSEUR CODES BARRES";
    let html = "<ul class='catalogue-list'>";
    nozCatalogue.forEach(p => {
        html += `<li><span>${p.nom}</span> <strong>${p.code}</strong></li>`;
    });
    html += "</ul>";
    body.innerHTML = html;
    document.getElementById('modal-app').classList.add('active');
}

function buyStock(qty, cost) {
    if(PlayerData.budgetMagasin >= cost) {
        PlayerData.budgetMagasin -= cost;
        PlayerData.stockMagasin += qty;
        saveData();
        alert(`Livraison validée : +${qty} articles.`);
        openModal('wms'); // refresh
    } else {
        alert("Fonds magasin insuffisants !");
    }
}

// START
window.onload = init;
