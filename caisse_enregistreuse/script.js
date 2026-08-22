// Base de données des produits du magasin
const catalogue = [
    { code: "101", nom: "Baguette", prix: 1.10 },
    { code: "102", nom: "Croissant", prix: 1.20 },
    { code: "201", nom: "Lait 1L", prix: 0.95 },
    { code: "202", nom: "Beurre doux", prix: 2.50 },
    { code: "301", nom: "Pommes (kg)", prix: 2.99 },
    { code: "302", nom: "Bananes (kg)", prix: 1.99 },
    { code: "401", nom: "Poulet entier", prix: 6.50 },
    { code: "402", nom: "Steak haché x2", prix: 4.20 },
    { code: "501", nom: "Pâtes 500g", prix: 0.85 },
    { code: "502", nom: "Riz 1kg", prix: 1.80 },
    { code: "601", nom: "Coca-Cola 1.5L", prix: 1.65 },
    { code: "602", nom: "Eau source 1.5L", prix: 0.40 }
];

// État de la caisse
let ticket = [];
let total = 0;
let saisieManuelle = "";

// Éléments du DOM
const productsGrid = document.getElementById('products-grid');
const ticketItems = document.getElementById('ticket-items');
const totalPriceEl = document.getElementById('total-price');
const manualInputEl = document.getElementById('manual-input');

// Initialisation au chargement
function init() {
    genererBoutonsProduits();
    setupNumpad();
}

// Générer les boutons de produits dans la grille
function genererBoutonsProduits() {
    productsGrid.innerHTML = '';
    catalogue.forEach(produit => {
        const btn = document.createElement('button');
        btn.className = 'product-btn';
        btn.innerHTML = `
            <span>${produit.nom}</span>
            <span>${produit.prix.toFixed(2)} €</span>
            <span class="p-code">[${produit.code}]</span>
        `;
        btn.onclick = () => ajouterAuTicket(produit);
        productsGrid.appendChild(btn);
    });
}

// Configuration du pavé numérique
function setupNumpad() {
    const numBtns = document.querySelectorAll('.num-btn');
    numBtns.forEach(btn => {
        btn.onclick = () => {
            saisieManuelle += btn.getAttribute('data-val');
            manualInputEl.value = saisieManuelle;
        };
    });

    document.getElementById('btn-clear').onclick = () => {
        saisieManuelle = "";
        manualInputEl.value = "";
    };

    document.getElementById('btn-enter').onclick = validerSaisieManuelle;
}

// Fonction appelée via le bouton ENTRER (ou touche Entrée du clavier)
function validerSaisieManuelle() {
    if (!saisieManuelle) return;

    // Chercher dans le catalogue par code barre
    const produit = catalogue.find(p => p.code === saisieManuelle);

    if (produit) {
        ajouterAuTicket(produit);
    } else {
        alert("Code produit inconnu !");
    }

    saisieManuelle = "";
    manualInputEl.value = "";
}

// Support du vrai clavier
document.addEventListener('keydown', (e) => {
    // Si la modale de paiement est ouverte, on ne gère pas le clavier ici
    if (!document.getElementById('payment-modal').classList.contains('hidden')) return;

    if (e.key >= '0' && e.key <= '9') {
        saisieManuelle += e.key;
        manualInputEl.value = saisieManuelle;
    } else if (e.key === 'Backspace') {
        saisieManuelle = saisieManuelle.slice(0, -1);
        manualInputEl.value = saisieManuelle;
    } else if (e.key === 'Enter') {
        validerSaisieManuelle();
    }
});

// Ajouter un produit au ticket
function ajouterAuTicket(produit) {
    // On ajoute simplement à la liste (sans grouper pour faire "vrai" ticket qui défile)
    ticket.push(produit);
    total += produit.prix;

    mettreAJourAffichageTicket();
}

// Mettre à jour la vue du ticket
function mettreAJourAffichageTicket() {
    ticketItems.innerHTML = '';

    ticket.forEach(item => {
        const li = document.createElement('li');
        li.className = 'ticket-item';
        li.innerHTML = `
            <span class="item-name">${item.nom}</span>
            <span class="item-price">${item.prix.toFixed(2)} €</span>
        `;
        ticketItems.appendChild(li);
    });

    // Auto-scroll vers le bas
    ticketItems.scrollTop = ticketItems.scrollHeight;

    // Mettre à jour le total
    totalPriceEl.textContent = total.toFixed(2) + ' €';
}

// --- LOGIQUE D'ENCAISSEMENT ---
const btnCheckout = document.getElementById('btn-checkout');
const paymentModal = document.getElementById('payment-modal');
const modalTotalAmount = document.getElementById('modal-total-amount');
const clientGivenEl = document.getElementById('client-given');
const changeInput = document.getElementById('change-input');
const btnValidateChange = document.getElementById('btn-validate-change');
const changeFeedback = document.getElementById('change-feedback');
let amountGivenByClient = 0;
let changeDue = 0;

btnCheckout.onclick = () => {
    if (ticket.length === 0) {
        alert("Le ticket est vide !");
        return;
    }

    // Générer un montant donné par le client (soit exact, soit un peu plus)
    genererPaiementClient();

    modalTotalAmount.textContent = total.toFixed(2) + ' €';
    clientGivenEl.textContent = amountGivenByClient.toFixed(2) + ' €';
    changeDue = amountGivenByClient - total;

    // Reset modal inputs
    changeInput.value = '';
    changeFeedback.textContent = '';
    changeFeedback.className = 'feedback-msg';

    paymentModal.classList.remove('hidden');
    changeInput.focus();
};

function genererPaiementClient() {
    // Le client donne soit le montant exact (20% de chances)
    // Soit un billet supérieur courant (5, 10, 20, 50)
    const rand = Math.random();
    if (rand < 0.2) {
        amountGivenByClient = total;
    } else {
        const billets = [5, 10, 20, 50, 100];
        // Trouver le plus petit billet supérieur au total
        let billetAdequat = billets.find(b => b >= total);
        if (!billetAdequat) billetAdequat = Math.ceil(total / 50) * 50; // Pour les très gros montants

        // Parfois ils donnent un billet encore plus gros
        if (Math.random() < 0.3) {
            const index = billets.indexOf(billetAdequat);
            if (index !== -1 && index < billets.length - 1) {
                billetAdequat = billets[index + 1];
            }
        }
        amountGivenByClient = billetAdequat;
    }
}

btnValidateChange.onclick = verifierMonnaie;

changeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        verifierMonnaie();
    }
});

function verifierMonnaie() {
    const inputVal = parseFloat(changeInput.value.replace(',', '.'));

    if (isNaN(inputVal)) {
        changeFeedback.textContent = "Veuillez entrer un nombre valide.";
        changeFeedback.className = "feedback-msg error";
        return;
    }

    // On arrondit pour éviter les erreurs de flottants JS
    const dueRound = Math.round(changeDue * 100);
    const inputRound = Math.round(inputVal * 100);

    if (inputRound === dueRound) {
        changeFeedback.textContent = "Parfait ! La caisse s'ouvre. Ticket clôturé.";
        changeFeedback.className = "feedback-msg success";
        setTimeout(cloturerTicket, 2000); // On attend 2 sec puis on ferme
    } else {
        changeFeedback.textContent = "Erreur de caisse ! Il manque ou il y a trop de monnaie.";
        changeFeedback.className = "feedback-msg error";
    }
}

function cloturerTicket() {
    paymentModal.classList.add('hidden');
    ticket = [];
    total = 0;
    mettreAJourAffichageTicket();

    const customerStatus = document.getElementById('customer-status');
    customerStatus.textContent = "En attente d'un client...";
    customerStatus.style.backgroundColor = "#f39c12"; // Orange

    // Vider la commande en cours
    commandeEnCours = [];
}

// --- LOGIQUE CLIENTS (SIMULATION) ---
const btnNextClient = document.getElementById('btn-next-client');
let commandeEnCours = [];

btnNextClient.onclick = genererClient;

function genererClient() {
    if (ticket.length > 0) {
        alert("Terminez d'abord le client actuel !");
        return;
    }

    // Le client choisit entre 2 et 6 articles au hasard
    const nbArticles = Math.floor(Math.random() * 5) + 2;
    commandeEnCours = [];

    for(let i=0; i<nbArticles; i++) {
        const randomProduct = catalogue[Math.floor(Math.random() * catalogue.length)];
        commandeEnCours.push(randomProduct);
    }

    // Mettre à jour l'affichage du statut
    const customerStatus = document.getElementById('customer-status');
    customerStatus.textContent = `Nouveau client ! Il a ${nbArticles} articles à scanner.`;
    customerStatus.style.backgroundColor = "#2ecc71"; // Vert

    console.log("Liste de courses du client:", commandeEnCours.map(c => c.nom));
    alert(`Un client arrive à la caisse !\nIl a ${nbArticles} articles dans son panier.\n\nRegardez le client sur le tapis (Aide pour vous: ${commandeEnCours.map(p => p.nom + ' ['+p.code+']').join(', ')})`);
}

// Lancement
init();
