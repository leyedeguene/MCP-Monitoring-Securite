FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de configuration
COPY app/package.json .

# Installer les dépendances
RUN npm install

# Copier le reste du code
COPY app/ .

EXPOSE 3000

CMD ["npm", "run", "dev"]
