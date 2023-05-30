# Multi-stage builds

# Build stage
FROM node:18-alpine as builder

ARG PROJECT_ROOT_FOLDER=dapp
ARG REACT_APP_IPFS_GATEWAY
ARG REACT_APP_EVMCHAIN_HTTP_PROVIDER_URL_READONLY

# set current working directory
WORKDIR /developer/projects/$PROJECT_ROOT_FOLDER
RUN echo "Current working directory: $(pwd)"

ENV REACT_APP_IPFS_GATEWAY=$REACT_APP_IPFS_GATEWAY
ENV REACT_APP_EVMCHAIN_HTTP_PROVIDER_URL_READONLY=$REACT_APP_EVMCHAIN_HTTP_PROVIDER_URL_READONLY

COPY ./package.json ./package-lock.json ./
RUN npm install

COPY ./ ./

RUN npm run build

# Run stage
FROM nginx:latest

ARG PROJECT_ROOT_FOLDER=dapp

# set current working directory
WORKDIR /developer/projects/$PROJECT_ROOT_FOLDER
RUN echo "Current working directory: $(pwd)"

COPY --from=builder /developer/projects/dapp/build/ ./build/

COPY ./nginx.conf ./nginx.conf

RUN mv /etc/nginx/nginx.conf /etc/nginx/nginx_original.conf
RUN cp ./nginx.conf /etc/nginx/nginx.conf

# Expose the port on which Nginx will listen
EXPOSE 80

# # Start Nginx daemon service in the background
CMD nginx -g 'daemon off;'
