/**
 * NOZ Quantum OS - Core Logic
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
    { nom: "OPÉRATEUR JUNIOR", xp: 0, sal: 50 },
    { nom: "CHEF DE RAYON", xp: 150, sal: 80 },
    { nom: "RESPONSABLE RH", xp: 400, sal: 120 },
    { nom: "DIRECTEUR ADJOINT", xp: 800, sal: 200 }
];

// STATE MANAGER
let PlayerData = { matricule:"", xp:0, jour:1, gradeId:0, argentPerso:0, budgetMagasin:2500, reputation:100, stockMagasin:100, staff:0 };
let AppState = { screen:'init', timeGame: 8*60, tickInterval:null, caisse: { isClient:false, queue:0, input:"", total:0, ticket:[], mode:'scan', commande:[] } };

// AUDIO & EFFECTS
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if(audioCtx.state==='suspended') audioCtx.resume();
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    if(type==='scan'){ o.type='sine'; o.frequency.setValueAtTime(1500, audioCtx.currentTime); g.gain.setValueAtTime(0.05, audioCtx.currentTime); o.start(); o.stop(audioCtx.currentTime+0.1); }
    if(type==='error'){ o.type='sawtooth'; o.frequency.setValueAtTime(150, audioCtx.currentTime); g.gain.setValueAtTime(0.1, audioCtx.currentTime); o.start(); o.stop(audioCtx.currentTime+0.3); }
    if(type==='pay'){ o.type='square'; o.frequency.setValueAtTime(800, audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime+0.3); g.gain.setValueAtTime(0.1, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime+0.3); o.start(); o.stop(audioCtx.currentTime+0.3); }
}

function flashScreen() { document.body.classList.add('flash'); setTimeout(()=>document.body.classList.remove('flash'),50); }

// AI ASSISTANT
function triggerAI(msg, duration=4000) {
    const ai = document.getElementById('ai-bot');
    document.getElementById('ai-text').innerHTML = msg;
    ai.classList.add('show');
    playSound('scan'); // petit bip notif
    setTimeout(() => ai.classList.remove('show'), duration);
}

// STORAGE
function saveGame() { localStorage.setItem('noz_quantum', JSON.stringify(PlayerData)); }
function loadGame() { const d = localStorage.getItem('noz_quantum'); if(d){ PlayerData=JSON.parse(d); return true;} return false; }
function calcGrade() { let g=0; GRADES.forEach((gr,i)=>{if(PlayerData.xp>=gr.xp) g=i;}); PlayerData.gradeId=g; }

// NAVIGATION
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.getElementById(id+'-screen').classList.add('active');
    AppState.screen = id;
    if(id==='hub') refreshHub();
    if(id==='caisse') initCaisse();
}

function closeModal() { document.getElementById('modal-app').classList.remove('active'); }

// INIT
window.onload = () => {
    if(loadGame()) { showScreen('login'); document.getElementById('login-content').innerHTML=`<input type="password" id="login-input" class="cyber-input" placeholder="ENTREZ MATRICULE" autofocus>`; document.getElementById('login-input').onkeydown=(e)=>{if(e.key==='Enter'){if(e.target.value===PlayerData.matricule) startOS(); else{playSound('error'); e.target.value="";}}}; }
    else { showScreen('login'); document.getElementById('login-content').innerHTML=`<p style="color:#888;margin-bottom:15px;">CRÉATION DE PROFIL</p><input type="text" id="login-input" class="cyber-input" placeholder="VOTRE NOM" autofocus>`; document.getElementById('login-input').onkeydown=(e)=>{if(e.key==='Enter'){PlayerData.nom=e.target.value.trim(); PlayerData.matricule=Math.floor(1000+Math.random()*9000).toString(); saveGame(); alert(`Matricule généré : ${PlayerData.matricule}`); location.reload();}}; }
};

// CORE OS LOOP
function startOS() {
    calcGrade(); showScreen('hub');
    AppState.tickInterval = setInterval(() => {
        AppState.timeGame += 2;
        const h = Math.floor(AppState.timeGame/60).toString().padStart(2,'0'), m = (AppState.timeGame%60).toString().padStart(2,'0');
        document.getElementById('hub-time').textContent = `${h}:${m}`;

        // Auto-sales (Staff)
        if(PlayerData.staff>0 && AppState.timeGame%10===0 && PlayerData.stockMagasin>0) {
            let ventes = Math.min(PlayerData.staff, PlayerData.stockMagasin);
            PlayerData.stockMagasin -= ventes; PlayerData.budgetMagasin += ventes*2; saveGame(); refreshHub();
        }

        // Random AI interventions
        if(Math.random()<0.02 && AppState.screen==='hub') {
            if(PlayerData.stockMagasin<50) triggerAI("Attention, le stock physique est critique. Veuillez commander via le WMS.");
            else triggerAI("Analyse des flux clients en cours... Trafic nominal.");
        }

        if(AppState.timeGame >= 19*60) endDay();
    }, 1000);
}

function endDay() {
    clearInterval(AppState.tickInterval);
    PlayerData.argentPerso += GRADES[PlayerData.gradeId].sal; PlayerData.jour++;
    AppState.timeGame = 8*60; saveGame();
    triggerAI(`Fin de la journée. Votre salaire de ${GRADES[PlayerData.gradeId].sal}€ a été versé. Redémarrage des systèmes...`, 5000);
    setTimeout(()=>location.reload(), 5000);
}

function refreshHub() {
    document.getElementById('hub-nom').textContent = PlayerData.nom || "Operateur";
    document.getElementById('hub-grade').textContent = GRADES[PlayerData.gradeId].nom;
    document.getElementById('hub-jour').textContent = PlayerData.jour;
    document.getElementById('hub-argent').textContent = PlayerData.argentPerso.toFixed(2) + " €";
    document.getElementById('hub-salaire').textContent = GRADES[PlayerData.gradeId].sal + " €";
    document.getElementById('hub-xp').textContent = PlayerData.xp;
    document.getElementById('hub-budget').textContent = PlayerData.budgetMagasin.toFixed(2) + " €";
    document.getElementById('hub-stock').textContent = PlayerData.stockMagasin;
    document.getElementById('hub-rep').textContent = PlayerData.reputation + "%";
    document.getElementById('hub-staff').textContent = PlayerData.staff;

    document.getElementById('btn-wms').disabled = PlayerData.gradeId < 1;
    document.getElementById('btn-hr').disabled = PlayerData.gradeId < 2;
    document.getElementById('btn-mail').disabled = PlayerData.gradeId < 3;
}

// MODAL APPS (WMS / HR / MAIL)
function showScreenApp(app) {
    const mod = document.getElementById('modal-app'); const body = document.getElementById('modal-body');
    mod.classList.add('active');

    if(app==='wms') {
        document.getElementById('modal-title').textContent = "WMS - Commandes Pôle Central";
        body.innerHTML = `
            <table class="cyber-table">
                <thead><tr><th>Réf</th><th>Détails Palette</th><th>Prix</th><th>Action</th></tr></thead>
                <tbody>
                    <tr><td>PAL-ALI</td><td>Palette Alimentaire (+200 unités)</td><td>150.00 €</td><td><button class="btn-cyber" onclick="buyStock(150, 200)">Acheter</button></td></tr>
                    <tr><td>PAL-TEX</td><td>Palette Textile (+100 unités)</td><td>250.00 €</td><td><button class="btn-cyber" onclick="buyStock(250, 100)">Acheter</button></td></tr>
                    <tr><td>PAL-MYS</td><td>Palette Mystère (+50 unités)</td><td>400.00 €</td><td><button class="btn-cyber" onclick="buyStock(400, 50)">Acheter</button></td></tr>
                </tbody>
            </table>
        `;
    }
    if(app==='hr') {
        document.getElementById('modal-title').textContent = "RH - Embauche Automates";
        body.innerHTML = `
            <p style="margin-bottom:20px; color:#888;">Les automates génèrent des ventes sans votre intervention.</p>
            <table class="cyber-table">
                <thead><tr><th>Modèle</th><th>Efficacité</th><th>Coût Journalier</th><th>Action</th></tr></thead>
                <tbody>
                    <tr><td>Caissier Drone V1</td><td>Lent</td><td>45.00 €</td><td><button class="btn-cyber" onclick="buyStaff(45, 1)">Recruter</button></td></tr>
                    <tr><td>Caissier Cyborg V2</td><td>Rapide</td><td>80.00 €</td><td><button class="btn-cyber" onclick="buyStaff(80, 2)">Recruter</button></td></tr>
                </tbody>
            </table>
        `;
    }
    if(app==='mail') {
        document.getElementById('modal-title').textContent = "OUTLOOK - Gestion Réputation";
        body.innerHTML = `
            <div style="background:rgba(0,0,0,0.5); padding:20px; border-radius:8px;">
                <p style="color:var(--neon-red); margin-bottom:10px;">Message urgent d'un client insatisfait de son produit mystère.</p>
                <button class="btn-cyber" onclick="resolveMail(true)">Dédommager (-50€) [+Rép]</button>
                <button class="btn-cyber danger" onclick="resolveMail(false)">Ignorer [-Rép]</button>
            </div>
        `;
    }
}
const originalShowScreen = showScreen;
window.showScreen = (id) => { if(['wms','hr','mail'].includes(id)){ showScreenApp(id); } else { originalShowScreen(id); } };

function buyStock(prix, qty) { if(PlayerData.budgetMagasin>=prix){ PlayerData.budgetMagasin-=prix; PlayerData.stockMagasin+=qty; PlayerData.xp+=10; saveGame(); refreshHub(); triggerAI("Stock approvisionné."); closeModal(); } else triggerAI("Fonds insuffisants."); }
function buyStaff(prix, eff) { if(PlayerData.budgetMagasin>=prix){ PlayerData.budgetMagasin-=prix; PlayerData.staff+=eff; saveGame(); refreshHub(); triggerAI("Drone recruté avec succès."); closeModal(); } else triggerAI("Fonds insuffisants."); }
function resolveMail(rembourse) {
    if(rembourse && PlayerData.budgetMagasin>=50){ PlayerData.budgetMagasin-=50; PlayerData.reputation=Math.min(100,PlayerData.reputation+10); PlayerData.xp+=20;}
    else if(!rembourse) { PlayerData.reputation-=15; }
    saveGame(); refreshHub(); closeModal(); triggerAI("Incident clôturé.");
}

// CAISSE
function initCaisse() {
    AppState.caisse.isClient = false; AppState.caisse.queue = 0; AppState.caisse.input = ""; AppState.caisse.ticket = []; AppState.caisse.total = 0; AppState.caisse.mode = 'scan';
    document.getElementById('caisse-desc').textContent = "EN ATTENTE D'APPEL"; document.getElementById('caisse-desc').style.color = "#888";
    document.getElementById('caisse-ean').textContent = "-";
    document.getElementById('laser').classList.remove('active');
    updateCaisseUI(); triggerAI("Interface d'encaissement prête.");
}

function updateCaisseUI() {
    document.getElementById('caisse-input').textContent = AppState.caisse.input;
    document.getElementById('caisse-queue').textContent = AppState.caisse.queue;
    document.getElementById('caisse-total').textContent = AppState.caisse.total.toFixed(2) + " €";
    document.getElementById('ticket-lines').innerHTML = AppState.caisse.ticket.map(p=>`<li><span>${p.nom.substring(0,20)}</span><span>${p.prix.toFixed(2)}</span></li>`).join('');
}

document.addEventListener('keydown', (e) => {
    if(AppState.screen==='caisse') {
        if(e.key==='Escape') showScreen('hub');
        const c = AppState.caisse;
        if(c.mode==='scan') {
            if(e.key===' ' && !c.isClient) callClient();
            else if(e.key>='0' && e.key<='9') { c.input+=e.key; updateCaisseUI(); }
            else if(e.key==='Backspace') { c.input=c.input.slice(0,-1); updateCaisseUI(); }
            else if(e.key==='Enter') scanItem();
            else if(e.key==='+' && c.ticket.length>0 && c.commande.length===0) goPayment();
            else if(e.key==='Delete' && c.ticket.length>0) { const i=c.ticket.pop(); c.total-=i.prix; updateCaisseUI(); playSound('error'); triggerAI("Article annulé."); }
        } else if (c.mode==='pay') {
            if((e.key>='0' && e.key<='9') || e.key==='.') { c.input+=e.key; updateCaisseUI(); }
            else if(e.key==='Backspace') { c.input=c.input.slice(0,-1); updateCaisseUI(); }
            else if(e.key==='Enter') validPayment();
        }
    }
});

setInterval(()=>{ if(AppState.screen==='caisse' && Math.random()<0.15){ AppState.caisse.queue+=Math.floor(Math.random()*2)+1; updateCaisseUI(); } }, 1000);

function callClient() {
    if(PlayerData.stockMagasin<=0) { triggerAI("Rayons vides. Les clients repartent."); return; }
    AppState.caisse.isClient = true; AppState.caisse.commande = [];
    const nb=Math.floor(Math.random()*4)+2; for(let i=0;i<nb;i++) AppState.caisse.commande.push(nozCatalogue[Math.floor(Math.random()*nozCatalogue.length)]);
    document.getElementById('laser').classList.add('active');
    showNextItem();
}

function showNextItem() {
    if(AppState.caisse.commande.length===0) {
        document.getElementById('caisse-desc').textContent = "PAIEMENT REQUIS [+]"; document.getElementById('caisse-desc').style.color = "var(--neon-blue)";
        document.getElementById('caisse-ean').textContent = ""; document.getElementById('laser').classList.remove('active');
        return;
    }
    const p = AppState.caisse.commande[0];
    document.getElementById('caisse-desc').textContent = p.nom; document.getElementById('caisse-desc').style.color = "#fff";
    const isIllisible = Math.random() < 0.2;
    document.getElementById('caisse-ean').textContent = isIllisible ? "ILLISIBLE" : p.code;
    if(isIllisible) {
        document.getElementById('caisse-ean').style.color="var(--neon-red)";
        triggerAI(`Erreur de lecture EAN. Le code de "${p.nom}" est : ${p.code}. Saisie manuelle requise.`);
    } else {
        document.getElementById('caisse-ean').style.color="var(--glass-border)";
    }
}

function scanItem() {
    if(AppState.caisse.commande.length===0) return;
    const p = AppState.caisse.commande[0];
    const eanUI = document.getElementById('caisse-ean').textContent;

    if((eanUI!=="ILLISIBLE" && !AppState.caisse.input) || (AppState.caisse.input===p.code)) {
        playSound('scan'); flashScreen(); PlayerData.stockMagasin--;
        AppState.caisse.ticket.push(p); AppState.caisse.total+=p.prix;
        AppState.caisse.commande.shift(); AppState.caisse.input="";
        updateCaisseUI(); showNextItem();
    } else { playSound('error'); AppState.caisse.input=""; updateCaisseUI(); }
}

let cbMode = true; let aRendre = 0;
function goPayment() {
    AppState.caisse.mode='pay'; AppState.caisse.input=""; cbMode = Math.random()>0.5;
    const inputContainer = document.getElementById('caisse-input-container');
    inputContainer.style.borderColor = "var(--neon-green)";
    inputContainer.style.color = "var(--neon-green)";

    if(cbMode) {
        document.getElementById('caisse-desc').textContent = `TPE - SAISIR: ${AppState.caisse.total.toFixed(2)}`;
        document.getElementById('caisse-ean').textContent = "Paiement CB";
    } else {
        const d = [5,10,20,50,100].find(x=>x>=AppState.caisse.total) || Math.ceil(AppState.caisse.total/50)*50; aRendre=d-AppState.caisse.total;
        document.getElementById('caisse-desc').textContent = `ESPECES - DONNÉ: ${d.toFixed(2)}`;
        document.getElementById('caisse-ean').textContent = `Saisir Rendu Exact`;
    }
    updateCaisseUI();
}

function validPayment() {
    const s = parseFloat(AppState.caisse.input); if(isNaN(s)) return;
    playSound('pay');
    document.getElementById('caisse-input-container').style.borderColor = "var(--glass-border)";
    document.getElementById('caisse-input-container').style.color = "var(--text-main)";

    if(cbMode) { if(Math.round(s*100)===Math.round(AppState.caisse.total*100)){ PlayerData.budgetMagasin+=AppState.caisse.total; PlayerData.xp+=10; triggerAI("Paiement accepté."); } else { PlayerData.reputation-=5; triggerAI("Erreur TPE. Client facturé incorrectement."); } }
    else { const at=Math.round(aRendre*100), re=Math.round(s*100); PlayerData.budgetMagasin+=AppState.caisse.total + (at===re?0:(at-re)/100); PlayerData.xp+=10; triggerAI("Monnaie rendue."); }

    AppState.caisse.isClient=false; AppState.caisse.ticket=[]; AppState.caisse.total=0; AppState.caisse.input=""; AppState.caisse.mode='scan';
    showNextItem(); updateCaisseUI(); calcGrade(); saveGame();
}
