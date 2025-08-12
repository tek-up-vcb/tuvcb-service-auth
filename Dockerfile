FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Réinstaller uniquement les dépendances de production après le build
RUN npm ci --only=production && npm cache clean --force

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
