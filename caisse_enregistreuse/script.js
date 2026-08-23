// --- CONFIGURATION ET ETAT GLOBAL ---
let state = {
    screen: 'login', // login, fond, main, end
    matricule: '',
    fondCaisse: 0,
    caisseReelle: 0, // L'argent physiquement dans le tiroir
    timeMinutes: 8 * 60, // 08:00
    timeEndMinutes: 19 * 60, // 19:00
    gameSpeed: 10, // 1 seconde réelle = 10 minutes virtuelles ? Non, c'est trop rapide.
    // Faisons 1 tick (1 seconde réelle) = 2 minutes in-game
    // 8h à 19h = 11h = 660 minutes. / 2 = 330 secondes (5.5 minutes la partie)
    queue: 0,
    isClientAtRegister: false,
    ticket: [],
    totalTicket: 0,
    mainInput: "",
    mode: "scan", // scan, payment, event
    activeEvent: null // stocke l'imprévu en cours
};

let gameInterval = null;

// --- GESTION DES ECRANS ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId + '-screen').classList.add('active');
    state.screen = screenId;
}

// --- CLAVIER GLOBAL ---
document.addEventListener('keydown', (e) => {
    // Plein écran avec F11 géré par le navigateur par défaut

    if (state.screen === 'login') handleLoginInput(e);
    else if (state.screen === 'fond') handleFondInput(e);
    else if (state.screen === 'main') handleMainInput(e);
});

// --- ECRAN 1: LOGIN ---
function handleLoginInput(e) {
    if (e.key === 'Enter') {
        const val = document.getElementById('login-input').value;
        if (val.length > 0) {
            state.matricule = val;
            document.getElementById('op-id').textContent = val;
            showScreen('fond');
            document.getElementById('fond-input').focus();
        }
    }
}

// --- ECRAN 2: FOND DE CAISSE ---
function handleFondInput(e) {
    if (e.key === 'Enter') {
        const val = parseFloat(document.getElementById('fond-input').value.replace(',', '.'));
        if (!isNaN(val)) {
            state.fondCaisse = val;
            state.caisseReelle = val;
            startGame();
        }
    }
}

// --- BOUCLE PRINCIPALE (TEMPS & CLIENTS) ---
function startGame() {
    showScreen('main');
    updateClockDisplay();
    updateQueueDisplay();
    gameInterval = setInterval(gameTick, 1000); // 1 tick par seconde
}

function gameTick() {
    // Temps
    state.timeMinutes += 2; // Avance de 2 minutes in-game
    updateClockDisplay();

    // Fin de journée ?
    if (state.timeMinutes >= state.timeEndMinutes) {
        endGame();
        return;
    }

    // Génération de clients (File d'attente)
    // Plus il est tard, plus y'a de monde ? On fait aléatoire
    if (Math.random() < 0.15) { // 15% de chance d'avoir 1 ou 2 clients en plus par tick
        state.queue += Math.floor(Math.random() * 2) + 1;
        updateQueueDisplay();
    }
}

function updateClockDisplay() {
    const h = Math.floor(state.timeMinutes / 60).toString().padStart(2, '0');
    const m = (state.timeMinutes % 60).toString().padStart(2, '0');
    const timeStr = `${h}:${m}`;
    document.getElementById('clock-main').textContent = timeStr;
}

function updateQueueDisplay() {
    document.getElementById('queue-count').textContent = state.queue;
}

// --- FIN DE JOURNEE ---
function endGame() {
    clearInterval(gameInterval);
    showScreen('end');

    // Calcul de l'écart de caisse
    // Le fond initial + l'argent encaissé - la monnaie rendue
    // Pour simplifier, on assume que la caisseRelle a été bien tenue,
    // l'écart vient des erreurs de rendu de monnaie du joueur.
    const ecart = state.caisseReelle - state.fondCaisse; // (On ajoutera la vraie logique après)

    document.getElementById('end-stats').innerHTML = `
        FOND INITIAL: ${state.fondCaisse.toFixed(2)} €<br>
        CAISSE FINALE: ${state.caisseReelle.toFixed(2)} €<br>
        <br>
        >>> VOUS POUVEZ FERMER L'APPLICATION.
    `;
}

// --- CATALOGUE NOZ (PRODUITS BIZARRES) ---
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

// --- GESTION DU CLIENT ET DU SCAN ---
let commandeEnCours = [];

function appelerClient() {
    if (state.isClientAtRegister) return;
    if (state.queue <= 0) return;

    state.queue--;
    updateQueueDisplay();
    state.isClientAtRegister = true;

    // Générer liste de courses (3 à 8 articles)
    const nbArticles = Math.floor(Math.random() * 6) + 3;
    commandeEnCours = [];
    for(let i=0; i<nbArticles; i++) {
        commandeEnCours.push(nozCatalogue[Math.floor(Math.random() * nozCatalogue.length)]);
    }

    state.mode = 'scan';
    state.ticket = [];
    state.totalTicket = 0;
    updateTicketDisplay();

    // Afficher client
    document.getElementById('event-title').textContent = "CLIENT A LA CAISSE";
    document.getElementById('event-desc').textContent = "Scannez les articles du tapis !";
    drawTapis();
}

function drawTapis() {
    if (commandeEnCours.length === 0) {
        document.getElementById('client-sprite').textContent = "LE TAPIS EST VIDE.\n\n[+] POUR ENCAISSER.";
        return;
    }

    // On simule le scan automatique (ou manuel)
    // Le premier article est celui à scanner
    const produit = commandeEnCours[0];

    // Generer un evenement ?
    if (Math.random() < 0.2) { // 20% de chance d'un bug code barre
        triggerEvent('CODE_ILLISIBLE', produit);
        return;
    }
    if (Math.random() < 0.05) { // 5% de chance panne rouleau
        triggerEvent('PANNE_ROULEAU');
        return;
    }

    // Sinon, affichage normal
    document.getElementById('client-sprite').innerHTML = `
        PROCHAIN ARTICLE SUR LE TAPIS:
        <br><br>
        <span style="background:#0f0; color:#000; padding:2px;">[ ${produit.code} ]</span><br>
        ${produit.nom}
    `;
}

// --- EVENEMENTS "CHAOS" ---
function triggerEvent(type, data = null) {
    state.mode = 'event';
    state.activeEvent = { type, data };

    if (type === 'CODE_ILLISIBLE') {
        document.getElementById('event-title').textContent = "!!! BIP ERREUR !!!";
        document.getElementById('event-desc').textContent = "Code-barre illisible ! Tapez les 13 chiffres manuellement :";
        document.getElementById('client-sprite').innerHTML = `
            ${data.nom}<br>
            CODE: ${data.code}
        `;
    }
    else if (type === 'PANNE_ROULEAU') {
        const modal = document.getElementById('alert-modal');
        modal.classList.remove('hidden');
    }
}

// --- GESTION DU CLAVIER (CAISSE) ---
function handleMainInput(e) {
    if (state.mode === 'scan') {
        if (e.key === ' ') {
            appelerClient();
        } else if (e.key >= '0' && e.key <= '9') {
            state.mainInput += e.key;
            updateInputDisplay();
        } else if (e.key === 'Backspace') {
            state.mainInput = state.mainInput.slice(0, -1);
            updateInputDisplay();
        } else if (e.key === 'Enter') {
            validerSaisie();
        } else if (e.key === '+') {
            if (state.ticket.length > 0 && commandeEnCours.length === 0) {
                demarrerPaiement();
            } else if (commandeEnCours.length > 0) {
                document.getElementById('event-desc').textContent = "TERMINEZ DE SCANNER LE TAPIS D'ABORD !";
            }
        }
    }
    else if (state.mode === 'event') {
        if (state.activeEvent.type === 'CODE_ILLISIBLE') {
            if (e.key >= '0' && e.key <= '9') {
                state.mainInput += e.key;
                updateInputDisplay();
            } else if (e.key === 'Backspace') {
                state.mainInput = state.mainInput.slice(0, -1);
                updateInputDisplay();
            } else if (e.key === 'Enter') {
                if (state.mainInput === state.activeEvent.data.code) {
                    // Succès
                    ajouterAuTicket(state.activeEvent.data);
                    commandeEnCours.shift();
                    state.mainInput = "";
                    updateInputDisplay();
                    state.mode = 'scan';
                    state.activeEvent = null;
                    drawTapis();
                } else {
                    document.getElementById('event-desc').textContent = "CODE INCORRECT, RECOMMENCEZ !";
                    state.mainInput = "";
                    updateInputDisplay();
                }
            }
        }
        else if (state.activeEvent.type === 'PANNE_ROULEAU') {
            if (e.key.toLowerCase() === 'r') {
                document.getElementById('alert-modal').classList.add('hidden');
                state.mode = 'scan';
                state.activeEvent = null;
                drawTapis();
            }
        }
    }
    else if (state.mode === 'payment') {
        if (e.key >= '0' && e.key <= '9' || e.key === '.') {
            state.mainInput += e.key;
            updateInputDisplay();
        } else if (e.key === 'Backspace') {
            state.mainInput = state.mainInput.slice(0, -1);
            updateInputDisplay();
        } else if (e.key === 'Enter') {
            validerMonnaie();
        }
    }
}

function validerSaisie() {
    if (!state.mainInput) {
        // Scan auto si le champ est vide (comme si on utilisait la douchette)
        if (commandeEnCours.length > 0) {
            ajouterAuTicket(commandeEnCours[0]);
            commandeEnCours.shift();
            drawTapis();
        }
    } else {
        // Saisie manuelle normale (un client qui aurait scanné un code)
        // Dans ce simulateur, si on tape Entrée et que c'est le bon code sur le tapis, on le passe
        if (commandeEnCours.length > 0 && state.mainInput === commandeEnCours[0].code) {
            ajouterAuTicket(commandeEnCours[0]);
            commandeEnCours.shift();
            state.mainInput = "";
            drawTapis();
        } else {
            document.getElementById('event-desc').textContent = "BIP ! PRODUIT NON RECONNU (ou pas sur le tapis)";
            state.mainInput = "";
        }
    }
    updateInputDisplay();
}

function ajouterAuTicket(produit) {
    state.ticket.push(produit);
    state.totalTicket += produit.prix;
    updateTicketDisplay();
}

function updateTicketDisplay() {
    const ul = document.getElementById('ticket-lines');
    ul.innerHTML = '';
    state.ticket.forEach(p => {
        const li = document.createElement('li');
        li.className = 'ticket-line';
        li.innerHTML = `<span>${p.nom}</span><span>${p.prix.toFixed(2)} €</span>`;
        ul.appendChild(li);
    });
    ul.scrollTop = ul.scrollHeight;
    document.getElementById('ticket-total-val').textContent = state.totalTicket.toFixed(2);
}

function updateInputDisplay() {
    document.getElementById('main-input-display').textContent = state.mainInput;
}

// --- PAIEMENT ---
let paiementClient = 0;
let aRendre = 0;

function demarrerPaiement() {
    state.mode = 'payment';
    state.mainInput = "";
    updateInputDisplay();

    // Le client donne de l'argent (billet superieur)
    const billets = [5, 10, 20, 50, 100];
    paiementClient = billets.find(b => b >= state.totalTicket) || (Math.ceil(state.totalTicket/50)*50);
    aRendre = paiementClient - state.totalTicket;

    document.getElementById('event-title').textContent = "ENCAISSEMENT";
    document.getElementById('event-desc').innerHTML = `
        LE CLIENT DONNE: <b>${paiementClient.toFixed(2)} €</b><br>
        TAPEZ LE MONTANT A RENDRE ET [ENTRÉE]:
    `;
    document.getElementById('client-sprite').textContent = "";
}

function validerMonnaie() {
    const saisi = parseFloat(state.mainInput);
    if (isNaN(saisi)) return;

    const arrondiAttendu = Math.round(aRendre * 100);
    const arrondiSaisi = Math.round(saisi * 100);

    if (arrondiAttendu === arrondiSaisi) {
        // Caisse exacte
        state.caisseReelle += state.totalTicket;
    } else {
        // Erreur de caisse (trou ou excédent)
        const difference = arrondiAttendu - arrondiSaisi;
        // Si je devais rendre 2 et que je rends 5, j'ai un trou de -3.
        // Si je devais rendre 5 et que je rends 2, j'ai un excédent de +3 (le client râle mais NOZ est content).
        state.caisseReelle += state.totalTicket + (difference/100);
    }

    // Reset pour prochain client
    state.isClientAtRegister = false;
    state.ticket = [];
    state.totalTicket = 0;
    updateTicketDisplay();
    state.mainInput = "";
    updateInputDisplay();
    state.mode = 'scan';

    document.getElementById('event-title').textContent = "CAISSE OUVERTE";
    document.getElementById('event-desc').textContent = "Appuyez sur [ESPACE] pour appeler le prochain client.";
    document.getElementById('client-sprite').textContent = "";
}

// Lancement direct sur login
showScreen('login');

// Ajout du raccourci Delete pour annuler un article (comme demandé par la review)
// On ajoute juste la gestion dans le handleMainInput

const originalHandleMainInput = handleMainInput;
handleMainInput = function(e) {
    if (state.mode === 'scan') {
        if (e.key === 'Delete') {
            if (state.ticket.length > 0) {
                const item = state.ticket.pop();
                state.totalTicket -= item.prix;
                // On simule une petite pénalité de temps ou juste on met à jour
                updateTicketDisplay();
                document.getElementById('event-desc').textContent = "ARTICLE ANNULÉ: " + item.nom;
            } else {
                document.getElementById('event-desc').textContent = "BIP ! LE TICKET EST DEJA VIDE.";
            }
            return;
        }
    }

    // Appel de la fonction originale pour le reste
    originalHandleMainInput(e);
}

// --- SYSTEME DE PROGRESSION (XP ET CARRIERE) ---
let save = {
    xp: 0,
    jour: 1,
    grade: "STAGIAIRE"
};

// Charger la sauvegarde locale si existante
function loadSave() {
    const savedData = localStorage.getItem('noz_save');
    if (savedData) {
        save = JSON.parse(savedData);
    }
}

function saveGame() {
    localStorage.setItem('noz_save', JSON.stringify(save));
}

function getGradeInfo() {
    if (save.xp < 100) return "STAGIAIRE";
    if (save.xp < 300) return "HÔTE(SSE) DE CAISSE";
    if (save.xp < 600) return "CHEF DE RAYON";
    return "RESPONSABLE ADJOINT";
}

// Mettre à jour endGame pour inclure la progression
const originalEndGame = endGame;
endGame = function() {
    clearInterval(gameInterval);
    showScreen('end');

    // Calcul de l'écart (en centimes pour la précision, mais on le garde en euros ici pour le display)
    const ecart = state.caisseReelle - state.fondCaisse;

    // Calcul de l'XP
    let gainXp = 0;
    let messageEcart = "";

    // Tolérance d'erreur de caisse de 0.05€
    if (Math.abs(ecart) <= 0.05) {
        gainXp = 25;
        messageEcart = "CAISSE JUSTE ! (+25 XP)";
    } else if (ecart > 0.05) {
        gainXp = 10; // C'est pas ouf mais NOZ gagne de l'argent
        messageEcart = `EXCEDENT DE CAISSE DE +${ecart.toFixed(2)} € (+10 XP)`;
    } else {
        gainXp = 0; // Trou de caisse
        messageEcart = `TROU DE CAISSE DE ${ecart.toFixed(2)} € (0 XP - AVERTISSEMENT)`;
    }

    save.xp += gainXp;
    save.jour++;
    save.grade = getGradeInfo();
    saveGame();

    document.getElementById('end-stats').innerHTML = `
        FOND INITIAL: ${state.fondCaisse.toFixed(2)} €<br>
        CAISSE FINALE: ${state.caisseReelle.toFixed(2)} €<br>
        RESULTAT: <span style="color:${Math.abs(ecart)<=0.05 ? '#0f0' : '#f00'}">${messageEcart}</span><br>
        <br>
        --- PROGRESSION CARRIERE ---<br>
        JOUR TERMINE: ${save.jour - 1}<br>
        EXPERIENCE TOTALE: ${save.xp} XP<br>
        GRADE ACTUEL: <span class="title-noz">${save.grade}</span><br>
        <br>
        >>> VOUS POUVEZ FERMER L'APPLICATION.<br>
        [F5] POUR DEMARRER LE JOUR SUIVANT
    `;
}

// Appel du chargement à l'initialisation
loadSave();

// --- DESIGN SONORE (AUDIO API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBeep(type) {
    if(audioCtx.state === 'suspended') audioCtx.resume();

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'scan') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // Aigu et court
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    }
    else if (type === 'error') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, audioCtx.currentTime); // Grave et "buzzy"
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.4);
    }
    else if (type === 'caisse') {
        // Un son composite pour la caisse (cha-ching)
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    }
}

// Injecter le son dans les fonctions existantes
const originalValiderSaisie = validerSaisie;
validerSaisie = function() {
    if (!state.mainInput) {
        if (commandeEnCours.length > 0) {
            playBeep('scan');
        }
    } else {
        if (commandeEnCours.length > 0 && state.mainInput === commandeEnCours[0].code) {
            playBeep('scan');
        } else {
            playBeep('error');
        }
    }
    originalValiderSaisie();
}

const originalTriggerEvent = triggerEvent;
triggerEvent = function(type, data = null) {
    playBeep('error');
    originalTriggerEvent(type, data);
}

const originalValiderMonnaie = validerMonnaie;
validerMonnaie = function() {
    playBeep('caisse');
    originalValiderMonnaie();
}

// Ajouter le flash visuel au scan
const originalPlayBeep = playBeep;
playBeep = function(type) {
    if (type === 'scan') {
        document.body.classList.add('flash');
        setTimeout(() => document.body.classList.remove('flash'), 50);
    }
    originalPlayBeep(type);
}
