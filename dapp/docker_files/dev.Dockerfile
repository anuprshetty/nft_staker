FROM node:18-alpine

ARG PROJECT_ROOT_FOLDER=dapp

# set current working directory
WORKDIR /developer/projects/$PROJECT_ROOT_FOLDER
RUN echo "Current working directory: $(pwd)"

COPY ./package.json ./package-lock.json ./
RUN npm install

COPY ./ ./

EXPOSE 3000

CMD npm run start
