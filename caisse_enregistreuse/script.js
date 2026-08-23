/**
 * NOZ OS - Simulateur de Caisse et de Carrière (Version Pro/Métier)
 */

const nozCatalogue = [
    { code: "3701234567890", nom: "LOT 300 CURE-DENTS BAMBOU", prix: 0.50 },
    { code: "8412345678901", nom: "SHAMPOING CHEVAL 5L (ESP)", prix: 2.99 },
    { code: "5012345678902", nom: "DVD SNOOP DOGG MAC MAC", prix: 0.99 },
    { code: "4002345678903", nom: "MOUSTARDE ALLEMANDE PERIMEE", prix: 0.20 },
    { code: "3102345678904", nom: "PANTALON TARTAN T XXL", prix: 4.50 },
    { code: "3202345678905", nom: "BOITE TUPPERWARE SANS COUVERCLE", prix: 0.30 },
    { code: "3302345678906", nom: "COQUE IPHONE 3G ROSE", prix: 0.10 },
    { code: "3402345678907", nom: "LIVRE 'APPRENDRE LE POLONAIS'", prix: 1.50 },
    { code: "3502345678908", nom: "SAUCISSE MYSTERE SOUS VIDE", prix: 1.20 },
    { code: "3602345678909", nom: "LOT 5 CHAUSSETTES (PAS DE PAIRE)", prix: 2.00 }
];

const GRADES = [
    { nom: "Niveau 1 (Débutant)", xpRequise: 0 },
    { nom: "Niveau 2 (Hôte Confirmé)", xpRequise: 100 },
    { nom: "Niveau 3 (Chef de Rayon)", xpRequise: 300 },
    { nom: "Niveau 4 (Gérant Magasin)", xpRequise: 600 }
];

// --- AUDIO (Optionnel et silencieux) ---
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

// --- DATA PERSISTANTE ---
let PlayerData = {
    nom: "", matricule: "", xp: 0, jour: 1, gradeId: 0,
    budgetMagasin: 2500, reputation: 100
};

function saveGame() { localStorage.setItem('noz_save_pro', JSON.stringify(PlayerData)); }
function loadGame() {
    const data = localStorage.getItem('noz_save_pro');
    if (data) { PlayerData = JSON.parse(data); return true; }
    return false;
}
function updateGrade() {
    let newGradeId = 0;
    for (let i = 0; i < GRADES.length; i++) {
        if (PlayerData.xp >= GRADES[i].xpRequise) newGradeId = i;
    }
    PlayerData.gradeId = newGradeId;
}

// --- APP STATE ---
let AppState = {
    screen: 'init',
    caisse: {
        intervalId: null, time: 8*60, endTime: 19*60, fondTheorique: 150, caisseReelle: 0,
        queue: 0, isClientAtRegister: false, commandeClient: [], ticket: [], total: 0,
        input: "", mode: "scan", activeEvent: null, patience: 100, patienceInterval: null
    }
};

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id + '-screen').classList.add('active');
    AppState.screen = id;
}

// --- INIT & RH ---
function initGame() {
    if (loadGame()) { showScreen('login'); document.getElementById('login-input').focus(); }
    else { showScreen('register'); document.getElementById('register-input').focus(); }
}

function handleRegister(e) {
    if (e.key === 'Enter') {
        const val = document.getElementById('register-input').value.trim();
        if (val) {
            PlayerData.nom = val; PlayerData.matricule = Math.floor(1000 + Math.random() * 9000).toString();
            saveGame(); updateGrade(); showScreen('login'); document.getElementById('login-input').focus();
            alert(`Dossier créé.\nMatricule : ${PlayerData.matricule}`);
        }
    }
}

function handleLogin(e) {
    if (e.key === 'Enter') {
        if (document.getElementById('login-input').value === PlayerData.matricule) { goToHub(); }
        else { alert("Erreur d'authentification."); document.getElementById('login-input').value = ""; }
    }
}

// --- HUB INTRANET ---
function goToHub() {
    updateGrade();
    document.getElementById('hub-nom').textContent = PlayerData.nom;
    document.getElementById('hub-grade').textContent = GRADES[PlayerData.gradeId].nom;

    document.getElementById('btn-go-caisse').onclick = () => { showScreen('fond'); document.getElementById('fond-input').focus(); };

    const bStock = document.getElementById('btn-go-stock');
    if (PlayerData.gradeId >= 2) {
        bStock.classList.remove('locked');
        bStock.onclick = () => {
            showScreen('stock');
            document.getElementById('stock-budget').textContent = PlayerData.budgetMagasin;
        };
    }

    const bManager = document.getElementById('btn-go-manager');
    if (PlayerData.gradeId >= 3) {
        bManager.classList.remove('locked');
        bManager.onclick = () => { showScreen('bureau'); genererLitige(); };
    }
    showScreen('hub');
}

// --- STOCKS & BUREAU ---
function acheterPalette(type) {
    let p = 0; if(type==='ALIMENTAIRE') p=450; if(type==='TEXTILE') p=800; if(type==='MYSTERE') p=1200;
    if (PlayerData.budgetMagasin >= p) {
        PlayerData.budgetMagasin -= p; PlayerData.xp += 50; saveGame(); updateGrade();
        document.getElementById('stock-budget').textContent = PlayerData.budgetMagasin;
        alert("Bon de commande validé.");
    } else { alert("Fonds insuffisants."); }
}

let litigesRestants = 3;
function genererLitige() {
    document.getElementById('rep-score').textContent = PlayerData.reputation + "%";
    if (litigesRestants <= 0) { document.getElementById('litige-text').innerHTML = "<i>Aucun message non lu.</i>"; return; }
    const m = ["Client se plaint d'un produit périmé (Moutarde).", "Demande de remboursement pour lot incomplet.", "Client mécontent de l'attente en caisse."];
    document.getElementById('litige-text').innerHTML = "Bonjour,<br><br>" + m[Math.floor(Math.random()*m.length)] + "<br><br>Cordialement.";
}

function resoudreLitige(action) {
    if (litigesRestants <= 0) return;
    if (action === 'rembourser') { PlayerData.budgetMagasin -= 10; PlayerData.reputation = Math.min(100, PlayerData.reputation+5); PlayerData.xp += 20; }
    else { PlayerData.reputation -= 15; }
    litigesRestants--; saveGame(); genererLitige();
    if(PlayerData.reputation < 50) alert("Avertissement de la direction : qualité de service critique.");
}

// --- CAISSE MAIN ---
function handleFond(e) {
    if (e.key === 'Enter') {
        const v = parseFloat(document.getElementById('fond-input').value.replace(',','.'));
        if (!isNaN(v)) {
            AppState.caisse.fondTheorique = v; AppState.caisse.caisseReelle = v;
            startCaisseSession();
        }
    }
}

function startCaisseSession() {
    showScreen('main'); document.getElementById('op-id').textContent = PlayerData.matricule;
    updateClockDisplay(); updateQueueDisplay();
    AppState.caisse.intervalId = setInterval(gameTick, 1000);
}

function gameTick() {
    AppState.caisse.time += 2; updateClockDisplay();
    if (AppState.caisse.time >= AppState.caisse.endTime) { endCaisseSession(); return; }
    if (Math.random() < 0.15) { AppState.caisse.queue += Math.floor(Math.random()*2)+1; updateQueueDisplay(); }

    // Annonces Vocales Pro (Plus rares)
    if (Math.random() < 0.01 && 'speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance(["Personnel demandé en rayon 4", "Ouverture caisse 2 immédiate"].sort(()=>0.5-Math.random())[0]);
        msg.lang='fr-FR'; msg.rate=1.1; window.speechSynthesis.speak(msg);
    }
}

function updateClockDisplay() {
    const h = Math.floor(AppState.caisse.time/60).toString().padStart(2,'0');
    const m = (AppState.caisse.time%60).toString().padStart(2,'0');
    document.getElementById('clock-main').textContent = `${h}:${m}`;
}
function updateQueueDisplay() { document.getElementById('queue-count').textContent = AppState.caisse.queue; }

// LOGIQUE D'APPEL ET PATIENCE
function appelerClient() {
    if (AppState.caisse.isClientAtRegister || AppState.caisse.queue <= 0) return;
    AppState.caisse.queue--; updateQueueDisplay(); AppState.caisse.isClientAtRegister = true;

    const nb = Math.floor(Math.random()*6)+3; AppState.caisse.commandeClient = [];
    for(let i=0; i<nb; i++) AppState.caisse.commandeClient.push(nozCatalogue[Math.floor(Math.random()*nozCatalogue.length)]);

    AppState.caisse.mode = 'scan'; AppState.caisse.ticket = []; AppState.caisse.total = 0; updateTicketDisplay();
    drawTapis(); startPatience();
}

function startPatience() {
    document.getElementById('patience-text').style.display = 'block';
    AppState.caisse.patience = 100; updatePatienceUI();
    clearInterval(AppState.caisse.patienceInterval);
    AppState.caisse.patienceInterval = setInterval(() => {
        if (!AppState.caisse.isClientAtRegister) { clearInterval(AppState.caisse.patienceInterval); document.getElementById('patience-text').style.display='none'; return; }
        AppState.caisse.patience -= (AppState.caisse.mode === 'event' ? 3 : 1.5);
        if (AppState.caisse.patience <= 0) {
            clearInterval(AppState.caisse.patienceInterval);
            document.getElementById('patience-text').style.display='none';
            PlayerData.xp = Math.max(0, PlayerData.xp - 15); saveGame();
            resetCaisseState();
            document.getElementById('grid-ean').textContent = "ERROR";
            document.getElementById('grid-desc').textContent = "ABANDON PANIER - CLIENT PARTI";
            document.getElementById('grid-status').textContent = "FAIL";
        } else { updatePatienceUI(); }
    }, 1000);
}

function updatePatienceUI() {
    const val = Math.max(0, Math.floor(AppState.caisse.patience));
    document.getElementById('patience-val').textContent = val;
    if(val < 30) document.getElementById('patience-val').style.color = "red";
    else document.getElementById('patience-val').style.color = "black";
}

function resetCaisseState() {
    AppState.caisse.isClientAtRegister = false; AppState.caisse.ticket = []; AppState.caisse.total = 0;
    updateTicketDisplay(); AppState.caisse.input = ""; updateInputDisplay(); AppState.caisse.mode = 'scan';
    document.getElementById('alert-modal').classList.add('hidden');
    document.getElementById('main-input-container').classList.remove('payment-mode');
}

function drawTapis() {
    if (AppState.caisse.commandeClient.length === 0) {
        document.getElementById('grid-ean').textContent = "-";
        document.getElementById('grid-desc').textContent = "En attente paiement [+]";
        document.getElementById('grid-status').textContent = "OK";
        return;
    }
    const p = AppState.caisse.commandeClient[0];
    if (Math.random() < 0.2) { triggerEvent('CODE_ILLISIBLE', p); return; }
    if (Math.random() < 0.05) { triggerEvent('PANNE_ROULEAU'); return; }

    document.getElementById('grid-ean').textContent = p.code;
    document.getElementById('grid-desc').textContent = p.nom;
    document.getElementById('grid-status').textContent = "PRÊT";
}

function triggerEvent(type, data=null) {
    AudioSys.play('error'); AppState.caisse.mode = 'event'; AppState.caisse.activeEvent = { type, data };
    if (type === 'CODE_ILLISIBLE') {
        document.getElementById('grid-ean').textContent = "???";
        document.getElementById('grid-desc').textContent = data.nom + " (Saisie manuelle requise : " + data.code + ")";
        document.getElementById('grid-status').textContent = "ERR SCAN";
        document.getElementById('grid-status').style.color = "red";
    } else if (type === 'PANNE_ROULEAU') {
        document.getElementById('alert-modal').classList.remove('hidden');
    }
}

// INPUT CAISSE
document.addEventListener('keydown', (e) => {
    if (AppState.screen === 'register') handleRegister(e);
    else if (AppState.screen === 'login') handleLogin(e);
    else if (AppState.screen === 'fond') handleFond(e);
    else if (AppState.screen === 'main') handleMainInput(e);
});

function handleMainInput(e) {
    const c = AppState.caisse;
    if (c.mode === 'scan') {
        if (e.key === 'Delete' && c.ticket.length > 0) {
            const item = c.ticket.pop(); c.total -= item.prix; updateTicketDisplay();
        }
        else if (e.key === ' ') appelerClient();
        else if (e.key >= '0' && e.key <= '9') { c.input += e.key; updateInputDisplay(); }
        else if (e.key === 'Backspace') { c.input = c.input.slice(0, -1); updateInputDisplay(); }
        else if (e.key === 'Enter') validerSaisie();
        else if (e.key === '+') {
            if (c.ticket.length > 0 && c.commandeClient.length === 0) demarrerPaiement();
        }
    }
    else if (c.mode === 'event') {
        if (c.activeEvent.type === 'CODE_ILLISIBLE') {
            if (e.key >= '0' && e.key <= '9') { c.input += e.key; updateInputDisplay(); }
            else if (e.key === 'Backspace') { c.input = c.input.slice(0, -1); updateInputDisplay(); }
            else if (e.key === 'Enter') {
                if (c.input === c.activeEvent.data.code) {
                    ajouterAuTicket(c.activeEvent.data); c.commandeClient.shift();
                    c.input = ""; updateInputDisplay(); c.mode = 'scan'; c.activeEvent = null; drawTapis();
                    document.getElementById('grid-status').style.color = "green";
                } else { c.input = ""; updateInputDisplay(); }
            }
        } else if (c.activeEvent.type === 'PANNE_ROULEAU' && e.key.toLowerCase() === 'r') {
            document.getElementById('alert-modal').classList.add('hidden');
            c.mode = 'scan'; c.activeEvent = null; drawTapis();
        }
    }
    else if (c.mode === 'payment') {
        if (e.key >= '0' && e.key <= '9' || e.key === '.') { c.input += e.key; updateInputDisplay(); }
        else if (e.key === 'Backspace') { c.input = c.input.slice(0, -1); updateInputDisplay(); }
        else if (e.key === 'Enter') validerMonnaie();
    }
}

function validerSaisie() {
    let success = false; const c = AppState.caisse;
    if (!c.input && c.commandeClient.length > 0) { ajouterAuTicket(c.commandeClient[0]); c.commandeClient.shift(); success = true; }
    else if (c.input && c.commandeClient.length > 0 && c.input === c.commandeClient[0].code) { ajouterAuTicket(c.commandeClient[0]); c.commandeClient.shift(); success = true; }

    if (success) {
        AudioSys.play('scan');
        document.body.classList.add('flash'); setTimeout(()=>document.body.classList.remove('flash'),50);
        c.patience = Math.min(100, c.patience + 20); updatePatienceUI();
        c.input = ""; drawTapis();
    } else {
        AudioSys.play('error'); c.input = "";
    }
    updateInputDisplay();
}

function ajouterAuTicket(p) { AppState.caisse.ticket.push(p); AppState.caisse.total += p.prix; updateTicketDisplay(); }

function updateTicketDisplay() {
    const ul = document.getElementById('ticket-lines'); ul.innerHTML = '';
    AppState.caisse.ticket.forEach(p => { ul.innerHTML += `<li class="ticket-line"><span>${p.nom.substring(0,15)}</span><span>${p.prix.toFixed(2)}</span></li>`; });
    ul.scrollTop = ul.scrollHeight;
    document.getElementById('ticket-total-val').textContent = AppState.caisse.total.toFixed(2);
}

function updateInputDisplay() { document.getElementById('main-input-display').textContent = AppState.caisse.input; }

let aRendreEnCours = 0;
function demarrerPaiement() {
    const c = AppState.caisse; c.mode = 'payment'; c.input = ""; updateInputDisplay();
    document.getElementById('main-input-container').classList.add('payment-mode');
    clearInterval(c.patienceInterval); document.getElementById('patience-text').style.display='none';

    const b = [5, 10, 20, 50, 100];
    const donne = b.find(x => x >= c.total) || (Math.ceil(c.total/50)*50);
    aRendreEnCours = donne - c.total;

    document.getElementById('grid-ean').textContent = "PAIEMENT";
    document.getElementById('grid-desc').innerHTML = `Le client donne ${donne.toFixed(2)} EUR. Rendu attendu à saisir.`;
}

function validerMonnaie() {
    const s = parseFloat(AppState.caisse.input); if (isNaN(s)) return;
    AudioSys.play('caisse');

    const att = Math.round(aRendreEnCours * 100); const res = Math.round(s * 100);
    AppState.caisse.caisseReelle += AppState.caisse.total + ((att===res) ? 0 : (att-res)/100);

    resetCaisseState();
    document.getElementById('grid-ean').textContent = "-";
    document.getElementById('grid-desc').textContent = "Client terminé. Attente prochain.";
}

function endCaisseSession() {
    clearInterval(AppState.caisse.intervalId); showScreen('end');
    const e = AppState.caisse.caisseReelle - AppState.caisse.fondTheorique;
    let xp = 0; let m = "";
    if (Math.abs(e) <= 0.05) { xp=25; m="OK (Juste)"; }
    else if (e>0) { xp=10; m="EXCEDENT (+"+e.toFixed(2)+")"; }
    else { m="DEFICIT ("+e.toFixed(2)+")"; }

    PlayerData.xp += xp; PlayerData.jour++; saveGame(); updateGrade();

    document.getElementById('end-stats').innerHTML = `
Rapport de clôture de caisse - Jour ${PlayerData.jour - 1}
--------------------------------------------------
Fonds de caisse théorique :  ${AppState.caisse.fondTheorique.toFixed(2)} EUR
Fonds de caisse compté    :  ${AppState.caisse.caisseReelle.toFixed(2)} EUR
Ecart constaté            :  ${m}

Synthèse Employé:
Total XP généré           :  ${PlayerData.xp}
Habilitation validée      :  ${GRADES[PlayerData.gradeId].nom}
`;
}
window.onload = initGame;
