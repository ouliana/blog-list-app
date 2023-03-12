const jwt = require('jsonwebtoken');
const logger = require('./logger');
const users = require('../models/users');

const requestLogger = (request, response, next) => {
  logger.info('Method:', request.method);
  logger.info('Path:  ', request.path);
  logger.info('Body:  ', request.body);
  logger.info('---');
  next();
};

const tokenExtractor = (request, response, next) => {
  const authorization = request.get('authorization');
  if (!authorization) {
    return response.status(401).json({ error: 'Unauthorized access' });
  }

  if (authorization && authorization.startsWith('bearer')) {
    request.token = authorization.split(' ')[1];
  }

  next();
};

const userExtractor = async (request, response, next) => {
  const decodedToken = jwt.verify(request.token, process.env.SECRET);

  if (!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' });
  }

  request.user = await users.findOne(decodedToken.id, 'full_info');

  next();
};

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' });
};

const errorHandler = (error, request, response, next) => {
  console.log('error:', error);
  if (['ValidationError', 'UniquenessError'].includes(error.name)) {
    response.status(400).send(error);
  } else if (error.statusCode) {
    console.log('! error.statusCode: ', error.statusCode);
    response.status(error.statusCode).send({ error: `${error.reason}` });
  } else if (error.name === 'JsonWebTokenError') {
    return response.status(400).json({ error: error.message });
  } else {
    response.status(500).send({ error: `${error.reason}` });
  }

  next(error);
};

module.exports = {
  requestLogger,
  tokenExtractor,
  userExtractor,
  unknownEndpoint,
  errorHandler,
};
