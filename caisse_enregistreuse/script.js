/**
 * NOZ OS - Simulateur de Caisse et de Carrière
 * Refonte d'Architecture
 */

// --- BASE DE DONNÉES / CONFIG ---
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
    { nom: "STAGIAIRE", xpRequise: 0 },
    { nom: "HÔTE(SSE) DE CAISSE", xpRequise: 100 },
    { nom: "CHEF DE RAYON", xpRequise: 300 },
    { nom: "RESPONSABLE ADJOINT", xpRequise: 600 }
];

// --- GESTION AUDIO ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const AudioSys = {
    play: function(type) {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'scan') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'error') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            osc.start(); osc.stop(audioCtx.currentTime + 0.4);
        } else if (type === 'caisse') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start(); osc.stop(audioCtx.currentTime + 0.3);
        }
    }
};

// --- SYSTEME DE SAUVEGARDE ET PROFIL ---
let PlayerData = {
    nom: "",
    matricule: "",
    xp: 0,
    jour: 1,
    gradeId: 0
};

function saveGame() {
    localStorage.setItem('noz_save_v2', JSON.stringify(PlayerData));
}

function loadGame() {
    const data = localStorage.getItem('noz_save_v2');
    if (data) {
        PlayerData = JSON.parse(data);
        return true; // Sauvegarde trouvée
    }
    return false; // Nouveau joueur
}

function updateGrade() {
    let newGradeId = 0;
    for (let i = 0; i < GRADES.length; i++) {
        if (PlayerData.xp >= GRADES[i].xpRequise) {
            newGradeId = i;
        }
    }
    PlayerData.gradeId = newGradeId;
}

// ... La suite du script arrive

// --- ETAT GLOBAL DE L'APPLICATION ---
let AppState = {
    screen: 'init', // init, register, login, hub, fond, caisse, end
    caisse: {
        intervalId: null,
        time: 8 * 60,
        endTime: 19 * 60,
        fondTheorique: 150,
        caisseReelle: 0,
        queue: 0,
        isClientAtRegister: false,
        commandeClient: [],
        ticket: [],
        total: 0,
        input: "",
        mode: "scan", // scan, payment, event
        activeEvent: null
    }
};

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId + '-screen').classList.add('active');
    AppState.screen = screenId;
}

// --- INITIALISATION DU JEU (LANCEMENT) ---
function initGame() {
    if (loadGame()) {
        // Sauvegarde existante, on passe au login
        showScreen('login');
        document.getElementById('login-input').focus();
    } else {
        // Pas de sauvegarde, on passe à la RH (Embauche)
        showScreen('register');
        document.getElementById('register-input').focus();
    }
}

// --- LOGIQUE DES ECRANS (CLAVIER) ---
document.addEventListener('keydown', (e) => {
    if (AppState.screen === 'register') handleRegisterInput(e);
    else if (AppState.screen === 'login') handleLoginInput(e);
    else if (AppState.screen === 'hub') handleHubInput(e);
    else if (AppState.screen === 'fond') handleFondInput(e);
    else if (AppState.screen === 'main') handleMainInput(e);
    else if (AppState.screen === 'end') {
        if (e.key === 'F5') location.reload();
    }
});

function handleRegisterInput(e) {
    if (e.key === 'Enter') {
        const val = document.getElementById('register-input').value.trim();
        if (val.length > 0) {
            PlayerData.nom = val;
            // Génération d'un matricule aléatoire
            PlayerData.matricule = Math.floor(1000 + Math.random() * 9000).toString();
            saveGame();
            updateGrade();
            showScreen('login');
            document.getElementById('login-input').focus();
            alert(`Félicitations ${PlayerData.nom} !\nVotre matricule employé est le : ${PlayerData.matricule}\nRetenez-le pour vous connecter au NOZ OS.`);
        }
    }
}

function handleLoginInput(e) {
    if (e.key === 'Enter') {
        const val = document.getElementById('login-input').value;
        if (val === PlayerData.matricule) {
            goToHub();
        } else {
            alert("MATRICULE INCONNU OU INCORRECT");
            document.getElementById('login-input').value = "";
        }
    }
}

// Lancer le jeu au chargement
window.onload = initGame;

// --- LE HUB INTRANET ---
function goToHub() {
    updateGrade();

    // Mettre à jour l'affichage du hub
    document.getElementById('hub-mat').textContent = PlayerData.matricule;
    document.getElementById('hub-grade').textContent = GRADES[PlayerData.gradeId].nom;
    document.getElementById('hub-nom').textContent = PlayerData.nom;
    document.getElementById('hub-xp').textContent = PlayerData.xp;

    // Débloquer les boutons en fonction du grade
    const btnStock = document.getElementById('btn-go-stock');
    if (PlayerData.gradeId >= 2) {
        btnStock.classList.remove('locked');
        btnStock.innerHTML = `<span>[2]</span><span>GESTION STOCKS</span>`;
    }
    const btnManager = document.getElementById('btn-go-manager');
    if (PlayerData.gradeId >= 3) {
        btnManager.classList.remove('locked');
        btnManager.innerHTML = `<span>[3]</span><span>BUREAU RESPONSABLE</span>`;
    }

    showScreen('hub');
}

function handleHubInput(e) {
    if (e.key === '1') {
        showScreen('fond');
        document.getElementById('fond-input').focus();
    } else if (e.key === '2' && PlayerData.gradeId >= 2) {
        alert("MODE GESTION DES STOCKS BIENTOT DISPONIBLE ! (Mise à jour v4.0)");
    } else if (e.key === '3' && PlayerData.gradeId >= 3) {
        alert("BUREAU DU RESPONSABLE BIENTOT DISPONIBLE ! (Mise à jour v5.0)");
    }
}

// --- LA CAISSE (JEU PRINCIPAL) ---
function handleFondInput(e) {
    if (e.key === 'Enter') {
        const val = parseFloat(document.getElementById('fond-input').value.replace(',', '.'));
        if (!isNaN(val)) {
            AppState.caisse.fondTheorique = val;
            AppState.caisse.caisseReelle = val;
            startCaisseSession();
        }
    }
}

function startCaisseSession() {
    showScreen('main');
    document.getElementById('op-id').textContent = PlayerData.matricule;
    updateClockDisplay();
    updateQueueDisplay();
    AppState.caisse.intervalId = setInterval(gameTick, 1000); // 1 sec = 2 min in-game
}

function gameTick() {
    AppState.caisse.time += 2;
    updateClockDisplay();

    if (AppState.caisse.time >= AppState.caisse.endTime) {
        endCaisseSession();
        return;
    }

    if (Math.random() < 0.15) {
        AppState.caisse.queue += Math.floor(Math.random() * 2) + 1;
        updateQueueDisplay();
    }
}

function updateClockDisplay() {
    const h = Math.floor(AppState.caisse.time / 60).toString().padStart(2, '0');
    const m = (AppState.caisse.time % 60).toString().padStart(2, '0');
    document.getElementById('clock-main').textContent = `${h}:${m}`;
}

function updateQueueDisplay() {
    document.getElementById('queue-count').textContent = AppState.caisse.queue;
}

// L'appel du client
function appelerClient() {
    if (AppState.caisse.isClientAtRegister || AppState.caisse.queue <= 0) return;

    AppState.caisse.queue--;
    updateQueueDisplay();
    AppState.caisse.isClientAtRegister = true;

    const nb = Math.floor(Math.random() * 6) + 3;
    AppState.caisse.commandeClient = [];
    for(let i=0; i<nb; i++) {
        AppState.caisse.commandeClient.push(nozCatalogue[Math.floor(Math.random() * nozCatalogue.length)]);
    }

    AppState.caisse.mode = 'scan';
    AppState.caisse.ticket = [];
    AppState.caisse.total = 0;
    updateTicketDisplay();

    document.getElementById('event-title').textContent = "CLIENT A LA CAISSE";
    document.getElementById('event-desc').textContent = "Scannez les articles du tapis !";
    drawTapis();
}

function drawTapis() {
    if (AppState.caisse.commandeClient.length === 0) {
        document.getElementById('client-sprite').textContent = "LE TAPIS EST VIDE.\n\n[+] POUR ENCAISSER.";
        return;
    }

    const p = AppState.caisse.commandeClient[0];

    if (Math.random() < 0.2) {
        triggerEvent('CODE_ILLISIBLE', p);
        return;
    }
    if (Math.random() < 0.05) {
        triggerEvent('PANNE_ROULEAU');
        return;
    }

    document.getElementById('client-sprite').innerHTML = `PROCHAIN ARTICLE SUR LE TAPIS:\n<br><br><span style="background:#0f0; color:#000; padding:2px;">[ ${p.code} ]</span><br>${p.nom}`;
}

function triggerEvent(type, data = null) {
    AudioSys.play('error');
    AppState.caisse.mode = 'event';
    AppState.caisse.activeEvent = { type, data };

    if (type === 'CODE_ILLISIBLE') {
        document.getElementById('event-title').textContent = "!!! BIP ERREUR !!!";
        document.getElementById('event-desc').textContent = "Code-barre illisible ! Tapez les 13 chiffres manuellement :";
        document.getElementById('client-sprite').innerHTML = `${data.nom}<br>CODE: ${data.code}`;
    } else if (type === 'PANNE_ROULEAU') {
        document.getElementById('alert-modal').classList.remove('hidden');
    }
}

// Clavier de caisse
function handleMainInput(e) {
    if (AppState.caisse.mode === 'scan') {
        if (e.key === 'Delete') {
            if (AppState.caisse.ticket.length > 0) {
                const item = AppState.caisse.ticket.pop();
                AppState.caisse.total -= item.prix;
                updateTicketDisplay();
                document.getElementById('event-desc').textContent = "ARTICLE ANNULÉ: " + item.nom;
            } else {
                document.getElementById('event-desc').textContent = "BIP ! LE TICKET EST DEJA VIDE.";
            }
            return;
        }

        if (e.key === ' ') {
            appelerClient();
        } else if (e.key >= '0' && e.key <= '9') {
            AppState.caisse.input += e.key;
            updateInputDisplay();
        } else if (e.key === 'Backspace') {
            AppState.caisse.input = AppState.caisse.input.slice(0, -1);
            updateInputDisplay();
        } else if (e.key === 'Enter') {
            validerSaisie();
        } else if (e.key === '+') {
            if (AppState.caisse.ticket.length > 0 && AppState.caisse.commandeClient.length === 0) demarrerPaiement();
            else if (AppState.caisse.commandeClient.length > 0) document.getElementById('event-desc').textContent = "TERMINEZ DE SCANNER LE TAPIS D'ABORD !";
        }
    }
    else if (AppState.caisse.mode === 'event') {
        if (AppState.caisse.activeEvent.type === 'CODE_ILLISIBLE') {
            if (e.key >= '0' && e.key <= '9') { AppState.caisse.input += e.key; updateInputDisplay(); }
            else if (e.key === 'Backspace') { AppState.caisse.input = AppState.caisse.input.slice(0, -1); updateInputDisplay(); }
            else if (e.key === 'Enter') {
                if (AppState.caisse.input === AppState.caisse.activeEvent.data.code) {
                    ajouterAuTicket(AppState.caisse.activeEvent.data);
                    AppState.caisse.commandeClient.shift();
                    AppState.caisse.input = ""; updateInputDisplay();
                    AppState.caisse.mode = 'scan'; AppState.caisse.activeEvent = null; drawTapis();
                } else {
                    document.getElementById('event-desc').textContent = "CODE INCORRECT, RECOMMENCEZ !";
                    AppState.caisse.input = ""; updateInputDisplay();
                }
            }
        }
        else if (AppState.caisse.activeEvent.type === 'PANNE_ROULEAU') {
            if (e.key.toLowerCase() === 'r') {
                document.getElementById('alert-modal').classList.add('hidden');
                AppState.caisse.mode = 'scan'; AppState.caisse.activeEvent = null; drawTapis();
            }
        }
    }
    else if (AppState.caisse.mode === 'payment') {
        if (e.key >= '0' && e.key <= '9' || e.key === '.') { AppState.caisse.input += e.key; updateInputDisplay(); }
        else if (e.key === 'Backspace') { AppState.caisse.input = AppState.caisse.input.slice(0, -1); updateInputDisplay(); }
        else if (e.key === 'Enter') { validerMonnaie(); }
    }
}

function validerSaisie() {
    let success = false;
    if (!AppState.caisse.input) {
        if (AppState.caisse.commandeClient.length > 0) {
            ajouterAuTicket(AppState.caisse.commandeClient[0]);
            AppState.caisse.commandeClient.shift();
            success = true;
        }
    } else {
        if (AppState.caisse.commandeClient.length > 0 && AppState.caisse.input === AppState.caisse.commandeClient[0].code) {
            ajouterAuTicket(AppState.caisse.commandeClient[0]);
            AppState.caisse.commandeClient.shift();
            success = true;
        }
    }

    if (success) {
        AudioSys.play('scan');
        document.body.classList.add('flash'); setTimeout(() => document.body.classList.remove('flash'), 50);
        AppState.caisse.input = "";
        drawTapis();
    } else {
        AudioSys.play('error');
        document.getElementById('event-desc').textContent = "BIP ! PRODUIT NON RECONNU (ou pas sur le tapis)";
        AppState.caisse.input = "";
    }
    updateInputDisplay();
}

function ajouterAuTicket(p) {
    AppState.caisse.ticket.push(p);
    AppState.caisse.total += p.prix;
    updateTicketDisplay();
}

function updateTicketDisplay() {
    const ul = document.getElementById('ticket-lines');
    ul.innerHTML = '';
    AppState.caisse.ticket.forEach(p => {
        const li = document.createElement('li');
        li.className = 'ticket-line';
        li.innerHTML = `<span>${p.nom}</span><span>${p.prix.toFixed(2)} €</span>`;
        ul.appendChild(li);
    });
    ul.scrollTop = ul.scrollHeight;
    document.getElementById('ticket-total-val').textContent = AppState.caisse.total.toFixed(2);
}

function updateInputDisplay() {
    document.getElementById('main-input-display').textContent = AppState.caisse.input;
}

let paiementEnCours = 0;
let aRendreEnCours = 0;

function demarrerPaiement() {
    AppState.caisse.mode = 'payment';
    AppState.caisse.input = "";
    updateInputDisplay();

    const billets = [5, 10, 20, 50, 100];
    paiementEnCours = billets.find(b => b >= AppState.caisse.total) || (Math.ceil(AppState.caisse.total/50)*50);
    aRendreEnCours = paiementEnCours - AppState.caisse.total;

    document.getElementById('event-title').textContent = "ENCAISSEMENT";
    document.getElementById('event-desc').innerHTML = `LE CLIENT DONNE: <b>${paiementEnCours.toFixed(2)} €</b><br>TAPEZ LE MONTANT A RENDRE ET [ENTRÉE]:`;
    document.getElementById('client-sprite').textContent = "";
}

function validerMonnaie() {
    const saisi = parseFloat(AppState.caisse.input);
    if (isNaN(saisi)) return;

    AudioSys.play('caisse');

    const att = Math.round(aRendreEnCours * 100);
    const s = Math.round(saisi * 100);

    if (att === s) {
        AppState.caisse.caisseReelle += AppState.caisse.total;
    } else {
        AppState.caisse.caisseReelle += AppState.caisse.total + ((att - s)/100);
    }

    AppState.caisse.isClientAtRegister = false;
    AppState.caisse.ticket = [];
    AppState.caisse.total = 0;
    updateTicketDisplay();
    AppState.caisse.input = "";
    updateInputDisplay();
    AppState.caisse.mode = 'scan';

    document.getElementById('event-title').textContent = "CAISSE OUVERTE";
    document.getElementById('event-desc').textContent = "Appuyez sur [ESPACE] pour appeler le prochain client.";
}

function endCaisseSession() {
    clearInterval(AppState.caisse.intervalId);
    showScreen('end');

    const ecart = AppState.caisse.caisseReelle - AppState.caisse.fondTheorique;
    let xp = 0; let msg = "";

    if (Math.abs(ecart) <= 0.05) {
        xp = 25; msg = "CAISSE JUSTE ! (+25 XP)";
    } else if (ecart > 0.05) {
        xp = 10; msg = `EXCEDENT DE CAISSE DE +${ecart.toFixed(2)} € (+10 XP)`;
    } else {
        msg = `TROU DE CAISSE DE ${ecart.toFixed(2)} € (0 XP - AVERTISSEMENT)`;
    }

    PlayerData.xp += xp;
    PlayerData.jour++;
    updateGrade();
    saveGame();

    document.getElementById('end-stats').innerHTML = `
        FOND INITIAL: ${AppState.caisse.fondTheorique.toFixed(2)} €<br>
        CAISSE FINALE: ${AppState.caisse.caisseReelle.toFixed(2)} €<br>
        RESULTAT: <span style="color:${Math.abs(ecart)<=0.05 ? '#0f0' : '#f00'}">${msg}</span><br><br>
        --- PROGRESSION CARRIERE ---<br>
        JOUR TERMINE: ${PlayerData.jour - 1}<br>
        EXPERIENCE TOTALE: ${PlayerData.xp} XP<br>
        GRADE ACTUEL: <span class="title-noz">${GRADES[PlayerData.gradeId].nom}</span><br><br>
        [F5] POUR RETOURNER AU HUB INTRANET
    `;
}
