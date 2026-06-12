function shouldHideOnClose({ isQuitting, hasTray }) {
  return !isQuitting && Boolean(hasTray);
}

module.exports = {
  shouldHideOnClose
};
