#!/bin/bash
# Script de lancement du jeu pour Linux Mint
cd "$(dirname "$0")"

# Vérifier si python3 est installé (par défaut sur Linux Mint)
if command -v python3 >/dev/null 2>&1; then
    # Lancer le serveur en arrière-plan
    python3 -m http.server 8080 &
    PID=$!

    # Ouvrir le navigateur
    xdg-open "http://localhost:8080"

    # Attendre que l'utilisateur appuie sur entrée pour fermer le serveur
    echo "Le jeu NOZ Simulator tourne sur le port 8080."
    echo "Appuyez sur ENTRÉE dans ce terminal pour quitter le jeu complètement."
    read -p ""
    kill $PID
else
    # Fallback si pas de python
    xdg-open "index.html"
fi
