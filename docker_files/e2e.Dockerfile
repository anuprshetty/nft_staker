# Multi-stage builds

FROM node:18 as contract_deployer

ARG PROJECT_ROOT_FOLDER=contract
ARG HARDHAT_NETWORK
ARG ETHERNAL_API_TOKEN
ARG ETHERNAL_WORKSPACE

WORKDIR /developer/projects/$PROJECT_ROOT_FOLDER
RUN echo "Current working directory: $(pwd)"

ENV ETHERNAL_API_TOKEN=$ETHERNAL_API_TOKEN
ENV ETHERNAL_WORKSPACE=$ETHERNAL_WORKSPACE

COPY ./contract/package.json ./contract/package-lock.json ./
RUN npm install

COPY ./contract/ ./

RUN command=`DEPLOY_MODE='DeployE2E' npx hardhat --network $HARDHAT_NETWORK run ./scripts/deploy.js` \
    && command_output=$command 2>&1 \
    && echo "$command_output" | tee DeployE2E.log


FROM node:18-alpine as dapp_builder

ARG PROJECT_ROOT_FOLDER=dapp
ARG REACT_APP_IPFS_GATEWAY
ARG REACT_APP_EVMCHAIN_HTTP_PROVIDER_URL_READONLY

# set current working directory
WORKDIR /developer/projects/$PROJECT_ROOT_FOLDER
RUN echo "Current working directory: $(pwd)"

ENV REACT_APP_IPFS_GATEWAY=$REACT_APP_IPFS_GATEWAY
ENV REACT_APP_EVMCHAIN_HTTP_PROVIDER_URL_READONLY=$REACT_APP_EVMCHAIN_HTTP_PROVIDER_URL_READONLY

COPY ./dapp/package.json ./dapp/package-lock.json ./
RUN npm install

COPY ./dapp/ ./

COPY --from=contract_deployer /developer/projects/contract/dapp_contracts_info/ ./src/contracts_info/

RUN npm run build


FROM nginx:latest

ARG PROJECT_ROOT_FOLDER=dapp

# set current working directory
WORKDIR /developer/projects/$PROJECT_ROOT_FOLDER
RUN echo "Current working directory: $(pwd)"

COPY --from=dapp_builder /developer/projects/dapp/build/ ./build/
COPY --from=contract_deployer /developer/projects/contract/DeployE2E.log ./DeployE2E.log

COPY ./dapp/nginx.conf ./nginx.conf

RUN mv /etc/nginx/nginx.conf /etc/nginx/nginx_original.conf
RUN cp ./nginx.conf /etc/nginx/nginx.conf

# Expose the port on which Nginx will listen
EXPOSE 80

# Start Nginx daemon service in the background
CMD nginx -g 'daemon off;'

# Link the github package to the github repository in github
LABEL org.opencontainers.image.source=https://github.com/anuprshetty/nft_staker
