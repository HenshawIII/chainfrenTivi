// Empty module to replace Solana packages we don't use
// This prevents build errors from transitive Solana dependencies
// Export as CommonJS for better compatibility with webpack

module.exports = {
  isDurableNonceTransaction: function() {
    return false;
  },
  // Add any other exports that might be needed
  default: {},
};

// Also provide ES module exports for compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports.default = module.exports;
}

