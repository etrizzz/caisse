/**
 * NOZ OS - TYCOON EDITION - CORE LOGIC
 */

const nozCatalogue = [
    { code: "3701234567890", nom: "LOT 300 CURE-DENTS BAMBOU", prix: 0.50 },
    { code: "8412345678901", nom: "SHAMPOING CHEVAL 5L (ESP)", prix: 2.99 },
    { code: "5012345678902", nom: "DVD SNOOP DOGG MAC MAC", prix: 0.99 },
    { code: "4002345678903", nom: "MOUSTARDE ALLEMANDE PERIMEE", prix: 0.20 },
    { code: "3102345678904", nom: "PANTALON TARTAN T XXL", prix: 4.50 },
    { code: "3202345678905", nom: "BOITE TUPPERWARE SANS COUVERCLE", prix: 0.30 },
    { code: "3302345678906", nom: "COQUE IPHONE 3G ROSE", prix: 0.10 }
];

const GRADES = [
    { nom: "Caissier Débutant", xpRequise: 0 },
    { nom: "Chef de Rayon (WMS)", xpRequise: 150 },
    { nom: "Responsable RH (Embauche)", xpRequise: 400 },
    { nom: "Directeur Adjoint (Mails)", xpRequise: 800 },
    { nom: "PDG NOZ", xpRequise: 2000 }
];

// --- AUDIO SYSTEM ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const AudioSys = {
    play: function(type) {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        if (type === 'scan') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'error') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc.start(); osc.stop(audioCtx.currentTime + 0.4);
        } else if (type === 'caisse') {
            osc.type = 'square'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start(); osc.stop(audioCtx.currentTime + 0.3);
        }
    }
};

let AppState = {
    screen: 'init',
    caisse: {
        intervalId: null, time: 8*60, endTime: 19*60, fondTheorique: 150, caisseReelle: 0,
        queue: 0, isClientAtRegister: false, commandeClient: [], ticket: [], total: 0,
        input: "", mode: "scan", activeEvent: null, patience: 100, patienceInterval: null
    }
};

let PlayerData = {
    matricule: "",
    xp: 0,
    jour: 1,
    gradeId: 0,
    argentPerso: 0, // Le salaire du joueur
    budgetMagasin: 2500, // Le budget de l'entreprise NOZ
    reputation: 100,
    stockMagasin: 100, // Nombre d'articles physiques dispos en rayon
    staff: 0 // Nombre de caissiers automatisés embauchés
};

function saveGame() { localStorage.setItem('noz_tycoon_save', JSON.stringify(PlayerData)); }
function loadGame() {
    const data = localStorage.getItem('noz_tycoon_save');
    if (data) { PlayerData = JSON.parse(data); return true; }
    return false;
}
function updateGrade() {
    let newGradeId = 0;
    for (let i = 0; i < GRADES.length; i++) { if (PlayerData.xp >= GRADES[i].xpRequise) newGradeId = i; }
    PlayerData.gradeId = newGradeId;
}

// --- OS WINDOW MANAGEMENT ---
let timeGame = 8 * 60; // 08:00
let osInterval = null;

function initOS() {
    if (!loadGame()) {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('login-content').innerHTML = `
            <p>Nouveau profil utilisateur détecté.</p><br>
            <label>Appuyez sur ENTRÉE pour générer un matricule de session.</label>
            <input type="text" id="init-input" class="pro-input" autofocus>
        `;
        document.getElementById('init-input').onkeydown = (e) => {
            if (e.key === 'Enter') {
                PlayerData.matricule = Math.floor(1000 + Math.random() * 9000).toString();
                saveGame(); location.reload();
            }
        };
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('login-content').innerHTML = `
            <p>Connexion au domaine NOZ (Matricule requis)</p><br>
            <input type="password" id="login-input" class="pro-input" autofocus>
        `;
        document.getElementById('login-input').onkeydown = (e) => {
            if (e.key === 'Enter') {
                if (e.target.value === PlayerData.matricule) startDesktop();
                else alertOS("Erreur d'authentification.");
            }
        };
    }
}

function startDesktop() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('desktop').classList.remove('hidden');
    document.getElementById('taskbar').classList.remove('hidden');
    updateGrade(); refreshDesktopIcons();

    osInterval = setInterval(desktopTick, 1000); // Le temps passe toujours sur l'OS
}

function refreshDesktopIcons() {
    if (PlayerData.gradeId >= 1) document.getElementById('icon-wms').classList.remove('locked');
    if (PlayerData.gradeId >= 2) document.getElementById('icon-hr').classList.remove('locked');
    if (PlayerData.gradeId >= 3) document.getElementById('icon-mail').classList.remove('locked');
}

function openApp(appId) {
    if (document.getElementById(`icon-${appId}`).classList.contains('locked')) return;
    document.getElementById(`app-${appId}`).classList.add('active');

    // Ajout barre des taches
    if (!document.getElementById(`task-${appId}`)) {
        document.getElementById('taskbar-items').innerHTML += `<div class="taskbar-item" id="task-${appId}">${appId.toUpperCase()}</div>`;
    }

    // Init spécifique
    if (appId === 'caisse') initCaisseApp();
    if (appId === 'wms') { document.getElementById('wms-budget').textContent = PlayerData.budgetMagasin.toFixed(2); document.getElementById('wms-stock-count').textContent = PlayerData.stockMagasin; }
    if (appId === 'hr') { document.getElementById('hr-staff-count').textContent = PlayerData.staff; }
    if (appId === 'mail') { genererLitige(); }
}

function closeApp(appId) {
    document.getElementById(`app-${appId}`).classList.remove('active');
    const task = document.getElementById(`task-${appId}`);
    if(task) task.remove();
}

function alertOS(msg) {
    document.getElementById('alert-msg').textContent = msg;
    document.getElementById('alert-modal').classList.add('active');
}

function desktopTick() {
    timeGame += 2; // 2 minutes in-game par seconde réelle

    // MàJ Heure & Argent
    const h = Math.floor(timeGame/60).toString().padStart(2,'0');
    const m = (timeGame%60).toString().padStart(2,'0');
    document.getElementById('tray-time').textContent = `${h}:${m}`;
    document.getElementById('tray-money').textContent = `${PlayerData.argentPerso.toFixed(2)} €`;

    // Si on a du staff, le stock baisse automatiquement et le budget augmente
    if (PlayerData.staff > 0 && timeGame % 10 === 0 && PlayerData.stockMagasin > 0) {
        let ventes = Math.min(PlayerData.staff, PlayerData.stockMagasin);
        PlayerData.stockMagasin -= ventes;
        PlayerData.budgetMagasin += ventes * 2; // Chaque article rapporte ~2e moy au magasin
        saveGame();
    }

    if (timeGame >= 19*60) {
        endOfDay();
    }
}

// --- WMS (STOCKS) & RH ---
const wmsCatalogue = [
    { ref: "PAL-ALI", nom: "Palette Alimentaire", qty: 200, prix: 150 },
    { ref: "PAL-TEX", nom: "Palette Vêtements", qty: 100, prix: 250 },
    { ref: "PAL-MYS", nom: "Palette Mystère", qty: 50, prix: 400 }
];

// Injecter dynamiquement les lignes WMS
function renderWMS() {
    const tbody = document.getElementById('wms-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    wmsCatalogue.forEach(p => {
        tbody.innerHTML += `<tr>
            <td>${p.ref}</td><td>${p.nom} (+${p.qty} unités en rayon)</td><td>${p.prix.toFixed(2)} €</td>
            <td><button class="pro-btn" onclick="commanderPalette('${p.ref}')">Acheter</button></td>
        </tr>`;
    });
}
setTimeout(renderWMS, 500);

function commanderPalette(ref) {
    const pal = wmsCatalogue.find(p => p.ref === ref);
    if (PlayerData.budgetMagasin >= pal.prix) {
        PlayerData.budgetMagasin -= pal.prix;
        PlayerData.stockMagasin += pal.qty; // Livraison instantanée pour simplifier le gameplay
        PlayerData.xp += 10;
        saveGame();
        document.getElementById('wms-budget').textContent = PlayerData.budgetMagasin.toFixed(2);
        document.getElementById('wms-stock-count').textContent = PlayerData.stockMagasin;
        alertOS(`Commande validée. ${pal.qty} articles ajoutés au stock magasin.`);
    } else {
        alertOS("Refus comptabilité : Budget NOZ insuffisant !");
    }
}

// RH Embauche
function embaucher(type) {
    let cout = type === 'junior' ? 45 : 80;
    // Les salaires des employés sont payés par le budget magasin NOZ
    if (PlayerData.budgetMagasin >= cout) {
        PlayerData.budgetMagasin -= cout;
        PlayerData.staff += (type === 'junior' ? 1 : 2); // Le pro vaut 2 juniors
        saveGame();
        document.getElementById('hr-staff-count').textContent = PlayerData.staff;
        alertOS(`Contrat signé. Salaire de ${cout}€ prélevé sur le budget magasin.`);
    } else {
        alertOS("Refus RH : Budget magasin insuffisant.");
    }
}

// BUREAU MAIL
let litigesFaits = 0;
function genererLitige() {
    if (litigesFaits >= 3) { document.getElementById('litige-text').innerHTML = "Aucun nouveau message."; return; }
    document.getElementById('litige-text').innerHTML = "Client très mécontent. Il a glissé sur une palette de l'entrepôt.<br><br>Gérez le litige urgemment.";
    document.getElementById('mail-reputation').textContent = PlayerData.reputation + "%";
}
function resoudreLitige(action) {
    if (litigesFaits >= 3) return;
    if (action === 'rembourser') { PlayerData.budgetMagasin -= 50; PlayerData.reputation = Math.min(100, PlayerData.reputation+10); PlayerData.xp += 20; }
    else { PlayerData.reputation -= 20; }
    litigesFaits++; saveGame(); genererLitige();
}

// --- CAISSE APP LOGIC ---
function initCaisseApp() {
    document.getElementById('op-id').textContent = PlayerData.matricule;
    AppState.caisse.isClientAtRegister = false;
    AppState.caisse.queue = 0;
    AppState.caisse.ticket = [];
    AppState.caisse.total = 0;
    AppState.caisse.mode = 'scan';
    AppState.caisse.input = "";
    updateInputDisplay();
    updateCaisseUI();
}

function updateCaisseUI() {
    document.getElementById('queue-count').textContent = AppState.caisse.queue;
    if (AppState.caisse.commandeClient.length === 0) {
        document.getElementById('grid-ean').textContent = "-";
        document.getElementById('grid-desc').textContent = "Attente nouveau client [Espace]";
        document.getElementById('grid-status').textContent = "OK";
    }
}

function updateTicketDisplay() {
    const ul = document.getElementById('ticket-lines'); ul.innerHTML = '';
    AppState.caisse.ticket.forEach(p => { ul.innerHTML += `<li><span>${p.nom.substring(0,18)}</span><span>${p.prix.toFixed(2)}</span></li>`; });
    ul.scrollTop = ul.scrollHeight;
    document.getElementById('ticket-total-val').textContent = AppState.caisse.total.toFixed(2);
}

function updateInputDisplay() { document.getElementById('main-input-display').textContent = AppState.caisse.input + "_"; }

// Appel Client
function appelerClient() {
    if (AppState.caisse.isClientAtRegister) return;

    // Le magasin attire des clients selon sa réputation et son stock
    if (PlayerData.stockMagasin <= 0) {
        alertOS("Rayons vides ! Les clients font demi-tour. Achetez des stocks via NOZ WMS.");
        return;
    }

    AppState.caisse.isClientAtRegister = true;
    AppState.caisse.mode = 'scan';
    AppState.caisse.ticket = []; AppState.caisse.total = 0; updateTicketDisplay();

    const nb = Math.floor(Math.random()*4)+2; AppState.caisse.commandeClient = [];
    for(let i=0; i<nb; i++) AppState.caisse.commandeClient.push(nozCatalogue[Math.floor(Math.random()*nozCatalogue.length)]);

    nextArticle();
}

function nextArticle() {
    if (AppState.caisse.commandeClient.length === 0) {
        document.getElementById('grid-ean').textContent = "-";
        document.getElementById('grid-desc').textContent = "Tapis vide. Paiement requis [+]";
        return;
    }
    const p = AppState.caisse.commandeClient[0];
    document.getElementById('grid-ean').textContent = p.code;
    document.getElementById('grid-desc').textContent = p.nom;
}

// Touches Caisse
document.addEventListener('keydown', (e) => {
    // Ne gérer que si l'app caisse est ouverte et au premier plan (simplifié)
    if (!document.getElementById('app-caisse').classList.contains('active')) return;

    const c = AppState.caisse;
    if (c.mode === 'scan') {
        if (e.key === ' ' && !c.isClientAtRegister) appelerClient();
        else if (e.key >= '0' && e.key <= '9') { c.input += e.key; updateInputDisplay(); }
        else if (e.key === 'Backspace') { c.input = c.input.slice(0, -1); updateInputDisplay(); }
        else if (e.key === 'Enter') validerScan();
        else if (e.key === '+') {
            if (c.ticket.length > 0 && c.commandeClient.length === 0) demarrerPaiement();
        }
    } else if (c.mode === 'payment') {
        if (e.key >= '0' && e.key <= '9' || e.key === '.') { c.input += e.key; updateInputDisplay(); }
        else if (e.key === 'Backspace') { c.input = c.input.slice(0, -1); updateInputDisplay(); }
        else if (e.key === 'Enter') validerPaiement();
    }
});

function validerScan() {
    const c = AppState.caisse;
    if (c.commandeClient.length === 0) return;
    const p = c.commandeClient[0];

    // Scan auto ou manuel
    if (!c.input || c.input === p.code) {
        AudioSys.play('scan');
        document.body.classList.add('flash'); setTimeout(()=>document.body.classList.remove('flash'),50);
        c.ticket.push(p); c.total += p.prix; updateTicketDisplay();
        c.commandeClient.shift();
        PlayerData.stockMagasin--; // Deduire du vrai stock
        c.input = ""; updateInputDisplay();
        nextArticle();
    } else {
        AudioSys.play('error'); c.input = ""; updateInputDisplay();
    }
}

// TPE Paiement CB ou Especes
let aRendreEnCours = 0;
let modePaiement = "ESPECES";
function demarrerPaiement() {
    const c = AppState.caisse; c.mode = 'payment'; c.input = ""; updateInputDisplay();
    document.getElementById('main-input-container').classList.add('payment');

    modePaiement = Math.random() > 0.5 ? "CB" : "ESPECES";

    if (modePaiement === "CB") {
        document.getElementById('grid-desc').innerHTML = `<strong>TPE : CLIENT PAYE PAR CARTE</strong><br>Saisir montant exact : ${c.total.toFixed(2)}`;
    } else {
        const donne = [5, 10, 20, 50, 100].find(x => x >= c.total) || (Math.ceil(c.total/50)*50);
        aRendreEnCours = donne - c.total;
        document.getElementById('grid-desc').innerHTML = `<strong>ESPECES : CLIENT DONNE ${donne.toFixed(2)}</strong><br>Saisir rendu monnaie exact.`;
    }
}

function validerPaiement() {
    const s = parseFloat(AppState.caisse.input); if (isNaN(s)) return;
    const c = AppState.caisse;

    AudioSys.play('caisse');
    document.getElementById('main-input-container').classList.remove('payment');

    if (modePaiement === "CB") {
        // En CB, il faut taper le montant EXACT de la facture sur le TPE virtuel
        if (Math.round(s * 100) === Math.round(c.total * 100)) {
            PlayerData.budgetMagasin += c.total; PlayerData.xp += 10;
        } else {
            alertOS("Erreur TPE ! Le client a été mal débité.");
            PlayerData.reputation -= 5;
        }
    } else {
        // En ESPECES, il faut rendre la monnaie
        const att = Math.round(aRendreEnCours * 100); const res = Math.round(s * 100);
        PlayerData.budgetMagasin += c.total + ((att===res) ? 0 : (att-res)/100);
        PlayerData.xp += 10;
    }

    c.isClientAtRegister = false; c.ticket = []; c.total = 0; updateTicketDisplay();
    c.input = ""; updateInputDisplay(); c.mode = 'scan';
    updateCaisseUI();
}

// FIN DE JOURNEE
function endOfDay() {
    clearInterval(osInterval);

    // Le joueur reçoit un salaire !
    let salaire = 50; // Base
    if (PlayerData.gradeId >= 1) salaire = 80;
    if (PlayerData.gradeId >= 2) salaire = 120;
    if (PlayerData.gradeId >= 3) salaire = 200;

    PlayerData.argentPerso += salaire;
    PlayerData.jour++;
    saveGame();

    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('desktop').classList.add('hidden');
    document.getElementById('taskbar').classList.add('hidden');

    document.getElementById('login-content').innerHTML = `
        <h3>Fin de la journée ${PlayerData.jour - 1}</h3>
        <hr style="margin:10px 0;">
        <p>Salaire versé sur votre compte personnel : <strong>+${salaire} €</strong></p>
        <p>Bilan Trésorerie Magasin NOZ : <strong>${PlayerData.budgetMagasin.toFixed(2)} €</strong></p>
        <p>Stock restant en réserve : <strong>${PlayerData.stockMagasin} articles</strong></p>
        <br><br>
        <button class="pro-btn" onclick="location.reload()">Prendre son poste (Jour ${PlayerData.jour})</button>
    `;
}
window.onload = initOS;
