# Stage 1: Build
FROM node:18-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
# If package.json is missing, we use npm init or assume vite is ready
RUN npm install
COPY . .
RUN ls -la
RUN chmod +x vite_build.sh && ./vite_build.sh

# Stage 2: Production
FROM nginx:stable-alpine
# Vite usually outputs to 'dist'. Adjust if yours outputs to 'build'
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
