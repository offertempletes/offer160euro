FROM php:8.2-apache

# Node.js और NPM इंस्टॉल करने का कमांड
RUN apt-get update && apt-get install -y curl gnupg \
    && curl -fsSL https://nodesource.com | abc-node-setup - \
    && apt-get install -y nodejs

# MySQL ड्राइवरों को इंस्टॉल करना
RUN docker-php-ext-install mysqli pdo pdo_mysql && docker-php-ext-enable mysqli pdo pdo_mysql

COPY . /var/www/html/

# Node डिपेंडेंसी इंस्टॉल करना (ताकि PDF लाइब्रेरी लोड हो सके)
RUN cd /var/www/html && npm install

EXPOSE 80
