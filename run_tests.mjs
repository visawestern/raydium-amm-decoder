// raydium_offsets/run_tests.mjs — node vectors against offsets.js (offline, no deps).
// Full 752-byte AmmInfo layout (state.rs + LIQUIDITY_STATE_LAYOUT_V4).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const R = require('./offsets.js');

let pass = 0, total = 0;
function t(name, cond) {
  total++;
  if (cond) pass++;
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name);
}

const F = {};
for (const f of R.LAYOUT) F[f.name] = f;

t('layout ok', R.validateLayout(R.LAYOUT).ok);
t('TOTAL_SIZE=752', R.TOTAL_SIZE === 752);
t('MIN_SIZE=752', R.MIN_SIZE === 752);
t('53 fields', R.LAYOUT.length === 53);
t('first start 0 / last end 752', R.LAYOUT[0].start === 0 && R.LAYOUT[52].end === 752);
t('contiguous', R.LAYOUT.every((f, i) => i === 0 ? f.start === 0 : f.start === R.LAYOUT[i - 1].end));
t('type widths', R.LAYOUT.every((f) =>
  f.end - f.start === ({ u64: 8, u128: 16, pubkey: 32, pad64: 64 })[f.type]));
t('status 0-8 u64 (not anchor discriminator)', F.status.start === 0 && F.status.end === 8 && F.status.type === 'u64');
t('coin_vault 336-368', F.coin_vault.start === 336 && F.coin_vault.end === 368);
t('pc_vault 368-400', F.pc_vault.start === 368 && F.pc_vault.end === 400);
t('coin_vault_mint 400-432', F.coin_vault_mint.start === 400 && F.coin_vault_mint.end === 432);
t('pc_vault_mint 432-464', F.pc_vault_mint.start === 432 && F.pc_vault_mint.end === 464);
t('lp_mint 464-496', F.lp_mint.start === 464 && F.lp_mint.end === 496);
t('open_orders 496-528', F.open_orders.start === 496 && F.open_orders.end === 528);
t('market 528-560', F.market.start === 528 && F.market.end === 560);
t('market_program 560-592', F.market_program.start === 560 && F.market_program.end === 592);
t('target_orders 592-624', F.target_orders.start === 592 && F.target_orders.end === 624);
t('padding1 624-688', F.padding1.start === 624 && F.padding1.end === 688);
t('amm_owner 688-720', F.amm_owner.start === 688 && F.amm_owner.end === 720);
t('tail lp_amount 720-728 / client_order_id 728-736 / recent_epoch 736-744 / padding2 744-752',
  F.lp_amount.start === 720 && F.lp_amount.end === 728 &&
  F.client_order_id.start === 728 && F.client_order_id.end === 736 &&
  F.recent_epoch.start === 736 && F.recent_epoch.end === 744 &&
  F.padding2.start === 744 && F.padding2.end === 752);
t('fees block 128-192 (8xu64)', F.min_separate_numerator.start === 128 && F.swap_fee_denominator.end === 192);
t('statedata u128 swap_coin_in_amount 256-272', F.swap_coin_in_amount.start === 256 && F.swap_coin_in_amount.end === 272);
t('len 751 SHORT', R.validateLength(751).verdict === 'SHORT');
t('len 752 VALID_EXACT', R.validateLength(752).verdict === 'VALID_EXACT');
t('len 753 TRAILING', R.validateLength(753).verdict === 'TRAILING');
t('fixture u64 status==1 state==1', (() => {
  const fx = R.makeFixture(752);
  return R.getU64LE(fx, 0) === 1n && R.getU64LE(fx, 48) === 1n;
})());
t('fixture u64 nonce==2', R.getU64LE(R.makeFixture(752), 8) === 2n);
t('fixture u128 swap_coin_in_amount lo==33 hi==0x121', (() => {
  const fx = R.makeFixture(752);
  return R.getU128LE(fx, 256) === (BigInt(0x121) << 64n) + 33n;
})());
t('fixture pubkeys distinct fills', (() => {
  const fx = R.makeFixture(752);
  const c0 = R.sliceField(fx, F.coin_vault), c1 = R.sliceField(fx, F.pc_vault);
  return c0.length === 32 && c0.every((v) => v === 0x21) && c1.every((v) => v === 0x22);
})());
t('fixture owner fill 0x2a', (() => {
  const fx = R.makeFixture(752);
  return R.sliceField(fx, F.amm_owner).every((v) => v === 0x2a);
})());
t('decodeAccount status/state/type counts', (() => {
  const dec = R.decodeAccount(R.makeFixture(752));
  return dec.u64.status === 1n && dec.u64.nonce === 2n &&
    Object.keys(dec.u64).length === 38 && Object.keys(dec.u128).length === 4 &&
    Object.keys(dec.pubkeys).length === 10 && dec.padding1_hex.length === 128;
})());
t('validateAccount fixture ok (status 1 in range)', (() => {
  const r = R.validateAccount(R.makeFixture(752));
  return r.ok && r.errors.length === 0;
})());
t('validateAccount bad status 8 fails', (() => {
  const fx = R.makeFixture(752);
  for (let i = 0; i < 8; i++) fx[i] = 0;
  fx[0] = 8;
  return !R.validateAccount(fx).ok;
})());
t('validateAccount short fails', !R.validateAccount(new Array(751).fill(0)).ok);
t('b58 zero32', R.b58encode(new Array(32).fill(0)) === '11111111111111111111111111111111');
t('b58 roundtrip Token program', R.b58encode(R.b58decode('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')) === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
t('b64 roundtrip 752', (() => {
  const fx = R.makeFixture(752);
  const back = R.decodeBase64ToBytes(R.bytesToBase64(fx));
  return back.length === 752 && back.every((v, i) => v === fx[i]);
})());

console.log(`RESULT ${pass}/${total} passed`);
if (pass !== total) process.exit(1);
