# Angular dev server image
FROM node:20-alpine

EXPOSE 4200

WORKDIR /app

COPY package*.json ./

RUN npm install -g @angular/cli

RUN npm install 

COPY . .

CMD [ "ng", "serve", "--host", "0.0.0.0" ]
