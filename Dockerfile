# Estágio 1: Build
FROM node:18-alpine AS build

# Define o diretório de trabalho
WORKDIR /app

# Copia arquivos de configuração de dependências
# Copiar separadamente aproveita o cache de camadas do Docker
COPY package.json package-lock.json* ./

# Instala todas as dependências (incluindo devDependencies para o build)
RUN npm install

# Copia o restante dos arquivos do projeto
COPY . .

# Executa o build de produção
# O Vite gera por padrão a pasta 'dist'
RUN npm run build

# Estágio 2: Produção com Nginx
FROM nginx:stable-alpine

# Remove a configuração padrão do Nginx para evitar conflitos
RUN rm /etc/nginx/conf.d/default.conf

# Copia a sua configuração personalizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos estáticos do estágio de build para o diretório do Nginx
# Certifique-se que o vite.config.ts aponta para 'dist'
COPY --from=build /app/dist /usr/share/nginx/html

# Expõe a porta padrão do Nginx
EXPOSE 80

# Comando para rodar o Nginx em primeiro plano
CMD ["nginx", "-g", "daemon off;"]