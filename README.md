# raydium_offsets — offline Raydium v4 AMM account decoder (AmmInfo, 752 B)

**Round 591 rebuild (fixes round 590 review verdict CHANGES in `raydium_review.md`):**
the old 424-byte "13 pubkeys from byte 8" prefix described swap-instruction
account-metas, not pool-account bytes. This rebuild decodes the real on-chain
`AmmInfo` account: 752 B, `#[repr(C, packed)]`, native program (no Anchor
discriminator — bytes 0–8 are `status: u64`).

Sources (read-only, checked 2026-09-29):
- `raydium-amm program/src/state.rs` — `struct AmmInfo`, test
  `test_amm_info_layout` (`pool_data = [0u8; 752]`, `size_of::<AmmInfo>() == 752`)
- `raydium-sdk src/liquidity/layout.ts` — `LIQUIDITY_STATE_LAYOUT_V4`
  (canonical JS field order; primary names below are AmmInfo/rust, SDK aliases shown)

## Files (all inside `raydium_offsets/`, nothing else touched)

| File | What |
|---|---|
| `index.html` | UI: full 53-field layout table (AmmInfo name + SDK alias + type), base64 decoder (u64/u128/base58 + ZERO flags + status/state validation), sample 752 filler, in-page self-test. Only external ref is `./offsets.js` (same folder); no CDN/fetch/XHR. |
| `offsets.js` | Shared core (browser + node): `LAYOUT` (53 fields with types), `TOTAL_SIZE=MIN_SIZE=752`, `validateLayout`, `validateLength` (SHORT/VALID_EXACT/TRAILING), `decodeAccount`, `validateAccount` (status 0–7 / state 0–6 ranges + zero-pubkey warnings), `getU64LE/getU128LE`, `sliceField`, `isZero32`, base58 encode/decode, base64 helpers, `makeFixture`. |
| `test_offsets.py` | Offline tests: layout vectors (python mirror) + fixture decode vectors + file/offline checks + node cross-check + local http 200. |
| `run_tests.mjs` | Node vectors against `offsets.js` (same layout, BigInt u64/u128 checks). |
| `README.md` | This file. |

## Layout decoded (53 fields, 0–752)

Regions: header 16×u64 (0–128) · Fees 8×u64 (128–192) · StateData 144 B (192–336) ·
9×pubkey (336–624) · padding1 64 B (624–688) · amm_owner 32 B (688–720) · tail 4×u64 (720–752).

| Field (AmmInfo) | SDK alias | Range | Type |
|---|---|---|---|
| status | status | 0–8 | u64 (AmmStatus 0–7; NOT an Anchor discriminator) |
| nonce | nonce | 8–16 | u64 |
| order_num | maxOrder | 16–24 | u64 |
| depth | depth | 24–32 | u64 |
| coin_decimals | baseDecimal | 32–40 | u64 |
| pc_decimals | quoteDecimal | 40–48 | u64 |
| state | state | 48–56 | u64 (AmmState 0–6) |
| reset_flag | resetFlag | 56–64 | u64 |
| min_size | minSize | 64–72 | u64 |
| vol_max_cut_ratio | volMaxCutRatio | 72–80 | u64 |
| amount_wave | amountWaveRatio | 80–88 | u64 |
| coin_lot_size | baseLotSize | 88–96 | u64 |
| pc_lot_size | quoteLotSize | 96–104 | u64 |
| min_price_multiplier | minPriceMultiplier | 104–112 | u64 |
| max_price_multiplier | maxPriceMultiplier | 112–120 | u64 |
| sys_decimal_value | systemDecimalValue | 120–128 | u64 |
| min_separate_numerator | minSeparateNumerator | 128–136 | u64 |
| min_separate_denominator | minSeparateDenominator | 136–144 | u64 |
| trade_fee_numerator | tradeFeeNumerator | 144–152 | u64 |
| trade_fee_denominator | tradeFeeDenominator | 152–160 | u64 |
| pnl_numerator | pnlNumerator | 160–168 | u64 |
| pnl_denominator | pnlDenominator | 168–176 | u64 |
| swap_fee_numerator | swapFeeNumerator | 176–184 | u64 |
| swap_fee_denominator | swapFeeDenominator | 184–192 | u64 |
| need_take_pnl_coin | baseNeedTakePnl | 192–200 | u64 |
| need_take_pnl_pc | quoteNeedTakePnl | 200–208 | u64 |
| total_pnl_pc | quoteTotalPnl | 208–216 | u64 |
| total_pnl_coin | baseTotalPnl | 216–224 | u64 |
| pool_open_time | poolOpenTime | 224–232 | u64 |
| state_padding_0 | punishPcAmount | 232–240 | u64 |
| state_padding_1 | punishCoinAmount | 240–248 | u64 |
| orderbook_to_init_time | orderbookToInitTime | 248–256 | u64 |
| swap_coin_in_amount | swapBaseInAmount | 256–272 | u128 |
| swap_pc_out_amount | swapQuoteOutAmount | 272–288 | u128 |
| swap_acc_pc_fee | swapBase2QuoteFee | 288–296 | u64 |
| swap_pc_in_amount | swapQuoteInAmount | 296–312 | u128 |
| swap_coin_out_amount | swapBaseOutAmount | 312–328 | u128 |
| swap_acc_coin_fee | swapQuote2BaseFee | 328–336 | u64 |
| coin_vault | baseVault | 336–368 | pubkey |
| pc_vault | quoteVault | 368–400 | pubkey |
| coin_vault_mint | baseMint | 400–432 | pubkey |
| pc_vault_mint | quoteMint | 432–464 | pubkey |
| lp_mint | lpMint | 464–496 | pubkey |
| open_orders | openOrders | 496–528 | pubkey |
| market | marketId | 528–560 | pubkey |
| market_program | marketProgramId | 560–592 | pubkey |
| target_orders | targetOrders | 592–624 | pubkey |
| padding1 | withdrawQueue+lpVault | 624–688 | 64 B blob (rust `padding1[8]`; SDK: 2×pubkey — same bytes) |
| amm_owner | owner | 688–720 | pubkey |
| lp_amount | lpReserve | 720–728 | u64 |
| client_order_id | client_order_id | 728–736 | u64 |
| recent_epoch | recent_epoch | 736–744 | u64 |
| padding2 | padding | 744–752 | u64 |

Validation: `validateLayout` (53 fields, start 0, type widths, contiguous, last end 752) ·
`validateLength` (SHORT &lt;752 / VALID_EXACT ==752 / TRAILING &gt;752) ·
`validateAccount` (status 0–7, state 0–6, zero-pubkey warnings, trailing-note).

## Run locally (no publish)

```sh
python3 raydium_offsets/test_offsets.py   # vectors + offline checks + node cross-check + http 200
node raydium_offsets/run_tests.mjs        # JS vectors (optional)
python3 -m http.server 8080               # then open http://127.0.0.1:8080/raydium_offsets/
```

Nothing is published, no issue/PR/comment is created. Fully offline except the two
read-only balance checkers (`check_balances.py`, `check_solana.py`).

## Scope honesty

- Decodes the 752-byte AmmInfo pool account at exact on-chain offsets, with
  status/state range validation. It does **not** prove economic correctness of any
  live pool, and TargetOrders (2208 B) is a separate account (out of scope).
- `ZERO PUBKEY` flags are warnings (uninitialized/empty fields), not hard failures.
- Base58 rendering is local (no RPC resolution of the sliced addresses).
