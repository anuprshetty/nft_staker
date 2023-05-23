export const formatBalance = (rawBalance) => {
  const balance =
    Math.round(
      (parseInt(rawBalance) / 1000000000000000000 + Number.EPSILON) * 10000
    ) / 10000;

  return balance;
};

export const formatChainAsNum = (chainIdHex) => {
  const chainIdNum = parseInt(chainIdHex);
  return chainIdNum;
};
