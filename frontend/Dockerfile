FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV ORBITA_API_URL=http://backend:8000
EXPOSE 5173
CMD ["npm", "run", "dev"]
