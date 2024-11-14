FROM scottyhardy/docker-wine:latest

# Mise à jour et installation des dépendances nécessaires
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    build-essential \  
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Installation de Node.js (version LTS) et npm
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get install -y nodejs

# Créer le répertoire de travail pour l'application
WORKDIR /usr/src/canon

# Copier le contenu de votre projet dans le conteneur
COPY . .

# Installer les dépendances Node.js
RUN npm install
RUN npm install ./lib/dimensional/napi-canon-cameras.tgz

# Commande pour exécuter votre programme
CMD ["npm", "run", "dev"]
