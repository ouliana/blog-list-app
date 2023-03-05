class UniquenessError extends Error {
  constructor(message) {
    super(message); // (1)
    this.name = 'UniquenessError'; // (2)
  }
}

module.exports = UniquenessError;
