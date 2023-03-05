const logger = require('./logger');

const requestLogger = (request, response, next) => {
  logger.info('Method:', request.method);
  logger.info('Path:  ', request.path);
  logger.info('Body:  ', request.body);
  logger.info('---');
  next();
};

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' });
};

const errorHandler = (error, req, res, next) => {
  console.log('error:', error);
  if (['ValidationError', 'UniquenessError'].includes(error.name)) {
    res.status(400).send(error);
  } else if (error.statusCode) {
    console.log('! error.statusCode: ', error.statusCode);
    res.status(error.statusCode).send({ error: `${error.reason}` });
  } else {
    res.status(500).send({ error: `${error.reason}` });
  }

  next(error);
};

module.exports = {
  requestLogger,
  unknownEndpoint,
  errorHandler,
};
