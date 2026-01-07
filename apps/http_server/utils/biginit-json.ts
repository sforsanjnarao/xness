// This makes JSON.stringify work with BigInt
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};