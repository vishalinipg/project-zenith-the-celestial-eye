/**
 * fix-octal-escape-loader.js
 *
 * Webpack loader that fixes pre-built dist files (specifically @spz-loader/core)
 * that contain illegal content inside template literal strings or strings that
 * get transpiled/optimized into illegal template literals by SWC.
 *
 * Solution:
 * Instead of trying to escape characters, we base64-encode the WASM binary string
 * passed to the er() decoder function. At runtime, we decode it using
 * globalThis.atob(). This completely removes all binary bytes, hex/octal escapes,
 * and template literals from the WASM data, making it 100% compliant with strict
 * mode and immune to any compiler/minifier optimizations that generate illegal octals.
 */

module.exports = function fixOctalEscapeLoader(source) {
  let result = source;
  let searchIdx = 0;

  while (true) {
    // Find "er(`" which is the decoder function call
    const startIdx = result.indexOf('er(`', searchIdx);
    if (startIdx === -1) break;

    // Find the closing backtick of this template literal
    let endIdx = -1;
    let i = startIdx + 4;
    const len = result.length;
    while (i < len) {
      if (result[i] === '`' && result[i - 1] !== '\\') {
        endIdx = i;
        break;
      }
      i++;
    }

    if (endIdx === -1) {
      // No closing backtick found, move search index forward and continue
      searchIdx = startIdx + 4;
      continue;
    }

    // Extract the template literal (including the backticks)
    const templateLiteral = result.substring(startIdx + 3, endIdx + 1);

    try {
      // Evaluate the template literal to get the actual binary string value
      const stringValue = eval(templateLiteral);

      // Convert the binary string to a Uint8Array
      const bytes = new Uint8Array(stringValue.length);
      for (let j = 0; j < stringValue.length; j++) {
        bytes[j] = stringValue.charCodeAt(j) & 0xFF;
      }

      // Convert to Base64
      const base64 = Buffer.from(bytes).toString('base64');

      // Construct the replacement code
      const replacement = `globalThis.atob("${base64}")`;

      // Replace in the source code (only the template literal part)
      result = result.substring(0, startIdx + 3) + replacement + result.substring(endIdx + 1);

      // Move search index past the replacement
      searchIdx = startIdx + 3 + replacement.length;
      
      console.error(`>>> fix-octal-escape-loader: Successfully base64-encoded WASM string at index ${startIdx}`);
    } catch (e) {
      console.error(`>>> fix-octal-escape-loader: Failed to process template literal at index ${startIdx}:`, e.message);
      searchIdx = endIdx + 1;
    }
  }

  return result;
};
