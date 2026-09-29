'use strict';
/* raydium_offsets/offsets.js — shared core (browser + node).
 * Raydium v4 AMM (AmmInfo) full 752-byte account decoder.
 * Sources (checked 2026-09-29):
 *  - raydium-amm program/src/state.rs: `struct AmmInfo #[repr(C, packed)]`,
 *    test `test_amm_info_layout` (pool_data = [0u8; 752], size_of::<AmmInfo>() == 752)
 *  - raydium-sdk src/liquidity/layout.ts: LIQUIDITY_STATE_LAYOUT_V4
 * Native program (cargo build-sbf), NOT Anchor: bytes 0-8 are `status: u64`
 * (AmmStatus), not an 8-byte Anchor discriminator.
 * Field names below are AmmInfo (rust); SDK V4 aliases in `alias`.
 * No network, no deps. Browser: window.RaydiumOffsets. Node: module.exports.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RaydiumOffsets = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  var TOTAL_SIZE = 752;
  var MIN_SIZE = 752; // alias: account must be exactly 752 B
  var HEADER_SIZE = 8; // kept for compat: size of leading status u64 word
  var FIELD_SIZE = 32; // pubkey width

  // Full AmmInfo layout. type: u64=8B LE, u128=16B LE, pubkey=32B, pad64=64B blob.
  // 0-128: 16xu64 header | 128-192: Fees 8xu64 | 192-336: StateData 144B |
  // 336-624: 9xpubkey | 624-688: padding1 | 688-720: owner | 720-752: 4xu64 tail
  var LAYOUT = [
    { name: 'status',                 alias: 'status',             type: 'u64',    start: 0,   end: 8   },
    { name: 'nonce',                  alias: 'nonce',              type: 'u64',    start: 8,   end: 16  },
    { name: 'order_num',              alias: 'maxOrder',           type: 'u64',    start: 16,  end: 24  },
    { name: 'depth',                  alias: 'depth',              type: 'u64',    start: 24,  end: 32  },
    { name: 'coin_decimals',          alias: 'baseDecimal',        type: 'u64',    start: 32,  end: 40  },
    { name: 'pc_decimals',            alias: 'quoteDecimal',       type: 'u64',    start: 40,  end: 48  },
    { name: 'state',                  alias: 'state',              type: 'u64',    start: 48,  end: 56  },
    { name: 'reset_flag',             alias: 'resetFlag',          type: 'u64',    start: 56,  end: 64  },
    { name: 'min_size',               alias: 'minSize',            type: 'u64',    start: 64,  end: 72  },
    { name: 'vol_max_cut_ratio',      alias: 'volMaxCutRatio',     type: 'u64',    start: 72,  end: 80  },
    { name: 'amount_wave',            alias: 'amountWaveRatio',    type: 'u64',    start: 80,  end: 88  },
    { name: 'coin_lot_size',          alias: 'baseLotSize',        type: 'u64',    start: 88,  end: 96  },
    { name: 'pc_lot_size',            alias: 'quoteLotSize',       type: 'u64',    start: 96,  end: 104 },
    { name: 'min_price_multiplier',   alias: 'minPriceMultiplier', type: 'u64',    start: 104, end: 112 },
    { name: 'max_price_multiplier',   alias: 'maxPriceMultiplier', type: 'u64',    start: 112, end: 120 },
    { name: 'sys_decimal_value',      alias: 'systemDecimalValue', type: 'u64',    start: 120, end: 128 },
    { name: 'min_separate_numerator',   alias: 'minSeparateNumerator',   type: 'u64', start: 128, end: 136 },
    { name: 'min_separate_denominator', alias: 'minSeparateDenominator', type: 'u64', start: 136, end: 144 },
    { name: 'trade_fee_numerator',      alias: 'tradeFeeNumerator',      type: 'u64', start: 144, end: 152 },
    { name: 'trade_fee_denominator',    alias: 'tradeFeeDenominator',    type: 'u64', start: 152, end: 160 },
    { name: 'pnl_numerator',            alias: 'pnlNumerator',            type: 'u64', start: 160, end: 168 },
    { name: 'pnl_denominator',          alias: 'pnlDenominator',          type: 'u64', start: 168, end: 176 },
    { name: 'swap_fee_numerator',       alias: 'swapFeeNumerator',       type: 'u64', start: 176, end: 184 },
    { name: 'swap_fee_denominator',     alias: 'swapFeeDenominator',     type: 'u64', start: 184, end: 192 },
    { name: 'need_take_pnl_coin', alias: 'baseNeedTakePnl',  type: 'u64', start: 192, end: 200 },
    { name: 'need_take_pnl_pc',   alias: 'quoteNeedTakePnl', type: 'u64', start: 200, end: 208 },
    { name: 'total_pnl_pc',       alias: 'quoteTotalPnl',    type: 'u64', start: 208, end: 216 },
    { name: 'total_pnl_coin',     alias: 'baseTotalPnl',     type: 'u64', start: 216, end: 224 },
    { name: 'pool_open_time',     alias: 'poolOpenTime',     type: 'u64', start: 224, end: 232 },
    { name: 'state_padding_0',    alias: 'punishPcAmount',   type: 'u64', start: 232, end: 240 },
    { name: 'state_padding_1',    alias: 'punishCoinAmount', type: 'u64', start: 240, end: 248 },
    { name: 'orderbook_to_init_time', alias: 'orderbookToInitTime', type: 'u64', start: 248, end: 256 },
    { name: 'swap_coin_in_amount',  alias: 'swapBaseInAmount',   type: 'u128', start: 256, end: 272 },
    { name: 'swap_pc_out_amount',   alias: 'swapQuoteOutAmount', type: 'u128', start: 272, end: 288 },
    { name: 'swap_acc_pc_fee',      alias: 'swapBase2QuoteFee',  type: 'u64',  start: 288, end: 296 },
    { name: 'swap_pc_in_amount',    alias: 'swapQuoteInAmount',  type: 'u128', start: 296, end: 312 },
    { name: 'swap_coin_out_amount', alias: 'swapBaseOutAmount',  type: 'u128', start: 312, end: 328 },
    { name: 'swap_acc_coin_fee',    alias: 'swapQuote2BaseFee',  type: 'u64',  start: 328, end: 336 },
    { name: 'coin_vault',      alias: 'baseVault',       type: 'pubkey', start: 336, end: 368 },
    { name: 'pc_vault',        alias: 'quoteVault',      type: 'pubkey', start: 368, end: 400 },
    { name: 'coin_vault_mint', alias: 'baseMint',        type: 'pubkey', start: 400, end: 432 },
    { name: 'pc_vault_mint',   alias: 'quoteMint',       type: 'pubkey', start: 432, end: 464 },
    { name: 'lp_mint',         alias: 'lpMint',          type: 'pubkey', start: 464, end: 496 },
    { name: 'open_orders',     alias: 'openOrders',      type: 'pubkey', start: 496, end: 528 },
    { name: 'market',          alias: 'marketId',        type: 'pubkey', start: 528, end: 560 },
    { name: 'market_program',  alias: 'marketProgramId', type: 'pubkey', start: 560, end: 592 },
    { name: 'target_orders',   alias: 'targetOrders',    type: 'pubkey', start: 592, end: 624 },
    // SDK V4 names slots 624-688 withdrawQueue+lpVault (2x pubkey); rust: padding1[8] u64.
    // Same bytes; decoded here as one 64B padding blob.
    { name: 'padding1',        alias: 'withdrawQueue+lpVault', type: 'pad64', start: 624, end: 688 },
    { name: 'amm_owner',       alias: 'owner',           type: 'pubkey', start: 688, end: 720 },
    { name: 'lp_amount',       alias: 'lpReserve',       type: 'u64', start: 720, end: 728 },
    { name: 'client_order_id', alias: 'client_order_id', type: 'u64', start: 728, end: 736 },
    { name: 'recent_epoch',    alias: 'recent_epoch',    type: 'u64', start: 736, end: 744 },
    { name: 'padding2',        alias: 'padding',         type: 'u64', start: 744, end: 752 }
  ];

  var TYPE_WIDTH = { u64: 8, u128: 16, pubkey: 32, pad64: 64 };

  function fieldByName(name) {
    for (var i = 0; i < LAYOUT.length; i++) if (LAYOUT[i].name === name) return LAYOUT[i];
    return null;
  }

  function validateLayout(layout) {
    var errors = [];
    if (!Array.isArray(layout)) return { ok: false, errors: ['layout is not an array'] };
    if (layout.length !== 53) errors.push('expected 53 fields, got ' + layout.length);
    var seen = {}, i, f;
    for (i = 0; i < layout.length; i++) {
      f = layout[i];
      if (typeof f.name !== 'string' || !f.name) errors.push('field#' + i + ' missing name');
      else if (seen[f.name]) errors.push('duplicate field name: ' + f.name);
      else seen[f.name] = 1;
      var w = TYPE_WIDTH[f.type];
      if (w === undefined) errors.push(f.name + ': unknown type ' + f.type);
      else if (f.end - f.start !== w) errors.push(f.name + ': width ' + (f.end - f.start) + ' != ' + w + ' (' + f.type + ')');
      if (i === 0 && f.start !== 0) errors.push('first field must start at 0, got ' + f.start);
      if (i > 0 && f.start !== layout[i - 1].end) errors.push(f.name + ': gap/overlap (start ' + f.start + ' != prev end ' + layout[i - 1].end + ')');
      if (f.start < 0 || f.end > TOTAL_SIZE) errors.push(f.name + ': out of [0,752] bounds');
    }
    if (layout.length && layout[layout.length - 1].end !== TOTAL_SIZE)
      errors.push('last field must end at 752, got ' + layout[layout.length - 1].end);
    return { ok: errors.length === 0, errors: errors };
  }

  function validateLength(n) {
    if (!Number.isInteger(n) || n < 0) return { verdict: 'ERROR', detail: 'bad length' };
    if (n < MIN_SIZE) return { verdict: 'SHORT', detail: 'len ' + n + ' < 752 (missing ' + (MIN_SIZE - n) + ' B)' };
    if (n === MIN_SIZE) return { verdict: 'VALID_EXACT', detail: 'len 752 == AmmInfo size (full v4 account)' };
    return { verdict: 'TRAILING', detail: 'len ' + n + ' > 752 (+' + (n - MIN_SIZE) + ' B trailing; first 752 B decoded as AmmInfo)' };
  }

  function sliceField(bytes, field) {
    if (field.start < 0 || field.end > bytes.length) throw new Error(field.name + ' out of bounds [' + field.start + ',' + field.end + ') for len ' + bytes.length);
    return bytes.slice(field.start, field.end);
  }

  function getU64LE(bytes, offset) {
    var v = 0n, i;
    for (i = 0; i < 8; i++) v |= BigInt(bytes[offset + i] & 0xff) << BigInt(8 * i);
    return v;
  }

  function getU128LE(bytes, offset) {
    var v = 0n, i;
    for (i = 0; i < 16; i++) v |= BigInt(bytes[offset + i] & 0xff) << BigInt(8 * i);
    return v;
  }

  function decodeAccount(bytes) {
    if (bytes.length < TOTAL_SIZE) throw new Error('need >=752 bytes, got ' + bytes.length);
    var out = { u64: {}, u128: {}, pubkeys: {}, padding1_hex: '' };
    var i, f;
    for (i = 0; i < LAYOUT.length; i++) {
      f = LAYOUT[i];
      if (f.type === 'u64') out.u64[f.name] = getU64LE(bytes, f.start);
      else if (f.type === 'u128') out.u128[f.name] = getU128LE(bytes, f.start);
      else if (f.type === 'pubkey') {
        var sl = sliceField(bytes, f);
        out.pubkeys[f.name] = { base58: b58encode(sl), hex: toHex(sl) };
      } else if (f.type === 'pad64') {
        out.padding1_hex = toHex(sliceField(bytes, f));
      }
    }
    return out;
  }

  // AmmStatus (state.rs): 0 Uninitialized 1 Initialized 2 Disabled 3 WithdrawOnly
  // 4 LiquidityOnly 5 OrderBookOnly 6 SwapOnly 7 WaitingTrade.
  // AmmState: 0 Invalid 1 Idle 2 CancelAllOrders 3 PlanOrders 4 CancelOrder 5 PlaceOrders 6 PurgeOrder.
  function validateAccount(bytes) {
    var errors = [], warnings = [];
    if (!bytes || bytes.length < TOTAL_SIZE) {
      errors.push('len ' + (bytes ? bytes.length : 0) + ' < 752');
      return { ok: false, errors: errors, warnings: warnings };
    }
    var dec;
    try { dec = decodeAccount(bytes); }
    catch (e) { errors.push('decode: ' + String((e && e.message) || e)); return { ok: false, errors: errors, warnings: warnings }; }
    var st = dec.u64.status, am = dec.u64.state;
    if (st < 0n || st > 7n) errors.push('status out of range 0..7: ' + st);
    else if (st === 0n) warnings.push('status 0 (Uninitialized)');
    if (am < 0n || am > 6n) errors.push('state out of range 0..6: ' + am);
    var k;
    for (k in dec.pubkeys) {
      if (dec.pubkeys[k].hex === '0000000000000000000000000000000000000000000000000000000000000000')
        warnings.push(k + ' is ZERO PUBKEY');
    }
    if (bytes.length > TOTAL_SIZE) warnings.push('+' + (bytes.length - TOTAL_SIZE) + ' B trailing past 752');
    return { ok: errors.length === 0, errors: errors, warnings: warnings, values: dec };
  }

  function isZero32(b) {
    for (var i = 0; i < b.length; i++) if (b[i] !== 0) return false;
    return true;
  }

  function toHex(b) {
    var s = '';
    for (var i = 0; i < b.length; i++) {
      var h = b[i].toString(16);
      if (h.length < 2) h = '0' + h;
      s += h;
    }
    return s;
  }

  // --- base58 (bitcoin alphabet), no deps ---
  var ALPH = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  function b58encode(bytes) {
    if (!bytes.length) return '';
    var zeros = 0;
    while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
    if (zeros === bytes.length) { var z = ''; for (var zi = 0; zi < bytes.length; zi++) z += '1'; return z; }
    var digits = [0];
    for (var i = 0; i < bytes.length; i++) {
      var carry = bytes[i], j;
      for (j = 0; j < digits.length; j++) {
        var x = digits[j] * 256 + carry;
        digits[j] = x % 58;
        carry = (x / 58) | 0;
      }
      while (carry > 0) { digits.push(carry % 58); carry = (carry / 58) | 0; }
    }
    // drop leading zero digit produced by the [0] seed
    while (digits.length > 1 && digits[digits.length - 1] === 0) digits.pop();
    var out = '';
    for (var k = 0; k < zeros; k++) out += '1';
    for (var d = digits.length - 1; d >= 0; d--) out += ALPH[digits[d]];
    return out;
  }
  function b58decode(s) {
    var zeros = 0;
    while (zeros < s.length && s[zeros] === '1') zeros++;
    var bytes = [0];
    for (var i = 0; i < s.length; i++) {
      var v = ALPH.indexOf(s[i]);
      if (v < 0) throw new Error('bad base58 char: ' + s[i]);
      var carry = v, j;
      for (j = 0; j < bytes.length; j++) {
        var x = bytes[j] * 58 + carry;
        bytes[j] = x % 256;
        carry = (x / 256) | 0;
      }
      while (carry > 0) { bytes.push(carry % 256); carry = (carry / 256) | 0; }
    }
    // strip leading zero byte from accumulator
    while (bytes.length > 1 && bytes[bytes.length - 1] === 0) bytes.pop();
    bytes.reverse();
    // re-add leading zero bytes
    var out = [];
    for (var k = 0; k < zeros; k++) out.push(0);
    // bytes[0] may be a spurious 0 when input had no leading '1's
    var start = (zeros === 0 && bytes.length > 0 && bytes[0] === 0) ? 1 : 0;
    for (var t = start; t < bytes.length; t++) out.push(bytes[t]);
    return out;
  }

  function decodeBase64ToBytes(b64) {
    var s = String(b64).replace(/\s+/g, '');
    if (!s) throw new Error('empty input');
    if (typeof Buffer !== 'undefined') {
      var buf = Buffer.from(s, 'base64');
      if (!buf.length) throw new Error('base64 decode produced 0 bytes');
      return Array.prototype.slice.call(buf);
    }
    // browser
    var bin = atob(s);
    var out = new Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
    if (!out.length) throw new Error('base64 decode produced 0 bytes');
    return out;
  }

  function bytesToBase64(bytes) {
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }

  function putU64LE(b, off, v) {
    var x = BigInt(v);
    for (var i = 0; i < 8; i++) b[off + i] = Number((x >> BigInt(8 * i)) & 0xffn);
  }
  function putU128LE(b, off, lo, hi) {
    putU64LE(b, off, lo);
    putU64LE(b, off + 8, hi);
  }

  // Deterministic synthetic fixture (752 B):
  // u64 field#seq -> LE64(seq+1), except status/state forced to 1 (valid AmmStatus/AmmState);
  // u128 -> lo=seq+1, hi=0x100+seq+1;
  // pubkey#j (j=0..9 in layout order) -> 32 x (0x21+j); padding1 -> 0xC0+k; tail u64 same u64 rule.
  function makeFixture(totalLen) {
    var n = totalLen || TOTAL_SIZE;
    var b = new Array(n);
    var i;
    for (i = 0; i < n; i++) b[i] = 0;
    var pkJ = 0;
    for (var s = 0; s < LAYOUT.length; s++) {
      var f = LAYOUT[s];
      if (f.end > n) break;
      if (f.type === 'u64') putU64LE(b, f.start, (f.name === 'status' || f.name === 'state') ? 1 : s + 1);
      else if (f.type === 'u128') putU128LE(b, f.start, s + 1, 0x100 + s + 1);
      else if (f.type === 'pubkey') {
        for (var k = f.start; k < f.end; k++) b[k] = (0x21 + pkJ) & 0xff;
        pkJ++;
      } else if (f.type === 'pad64') {
        for (var c = f.start; c < f.end; c++) b[c] = (0xC0 + (c - f.start)) & 0xff;
      }
    }
    return b;
  }

  return {
    TOTAL_SIZE: TOTAL_SIZE, MIN_SIZE: MIN_SIZE, HEADER_SIZE: HEADER_SIZE, FIELD_SIZE: FIELD_SIZE,
    LAYOUT: LAYOUT, fieldByName: fieldByName,
    validateLayout: validateLayout, validateLength: validateLength,
    validateAccount: validateAccount, decodeAccount: decodeAccount,
    getU64LE: getU64LE, getU128LE: getU128LE,
    sliceField: sliceField, isZero32: isZero32, toHex: toHex,
    b58encode: b58encode, b58decode: b58decode,
    decodeBase64ToBytes: decodeBase64ToBytes, bytesToBase64: bytesToBase64,
    makeFixture: makeFixture
  };
}));
