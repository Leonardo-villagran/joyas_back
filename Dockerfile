# Imagen base
FROM node:latest

# Crear el directorio de trabajo
WORKDIR /app

# Copiar los archivos necesarios
COPY package*.json ./
COPY . .

# Install any needed packages specified in package.json
RUN npm install

# Make port 3001 available to the world outside this container
EXPOSE 3001

# Set environment variables for database connection
ENV DB_HOST=joyas-db
ENV DB_PORT=5432
ENV DB_USER=postgres
ENV DB_PASSWORD=postgres
ENV DB_NAME=joyas
ENV PORT=3001

# Run the command to start the server
CMD ["npm", "start"]