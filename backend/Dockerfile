FROM node:18-alpine

WORKDIR /app

# Copiar tudo de uma vez (simplificado)
COPY . .

# Instalar dependências
RUN npm install

EXPOSE 3000

CMD ["npm", "start"]