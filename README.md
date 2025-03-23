### Environment Set Up

1. run "npm install" from the root folder to install all the required packages
2. set up the local redis server following the official documentation: https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/
3. set up the local MongoDB server following the official documentation: https://www.mongodb.com/try/download/community
4. the local redis server should default to "localhost:6379"
5. the local MongoDB server should default to "localhost:27017"
6. run command "npm start" form the root folder to start the server

### To Access the Site from A Machine Connected to the Local Network

1. go to the network setting of the device that runs the server program and obtain it's local IP address
2. to access from another device in the same local network, simply use the local IP address obtained form step 1 as the url in the browser
3. to access from the same device that runs the server app, simply use localhost as the url in the browser
