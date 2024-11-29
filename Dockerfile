# Use a imagem oficial do Node.js 14 como base
FROM node:14

# Defina o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copie os arquivos package.json e package-lock.json para o diretório de trabalho
COPY package*.json ./

# Instale apenas as dependências de produção
RUN npm install --only=production

# Copie o restante do código da aplicação para o diretório de trabalho
COPY . .

# Exponha a porta em que a aplicação será executada
EXPOSE 8080

# Defina a variável de ambiente PORT (se necessário)
ENV PORT=8080

# Comando para iniciar a aplicação
CMD ["npm", "start"]
