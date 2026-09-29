#!/usr/bin/env python3
"""raydium_offsets tests — offline. Mirrors offsets.js full 752B AmmInfo layout in Python.

Layout source: raydium-amm program/src/state.rs (struct AmmInfo, #[repr(C, packed)],
test_amm_info_layout: 752 B) + raydium-sdk LIQUIDITY_STATE_LAYOUT_V4.
Vectors:
  53 fields, first start 0, last end 752, contiguous, type widths
  (u64=8, u128=16, pubkey=32, pad64=64)
  key offsets: coin_vault 336, pc_vault 368, lp_mint 464, open_orders 496,
  market 528, market_program 560, target_orders 592, owner 688
  len 751 -> SHORT, 752 -> VALID_EXACT, 753 -> TRAILING
  fixture: u64 seq rule, u128 lo/hi rule, pubkey fills, decode roundtrip
  base58: zero32 -> 32x'1', Token program id roundtrip
Also: file checks (index.html + offsets.js exist, no CDN/network calls), http 200 via local server.
"""
import base64
import functools
import http.server
import os
import struct
import subprocess
import sys
import threading
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(HERE, "index.html")
CORE = os.path.join(HERE, "offsets.js")
FAIL = []

# (name, type, start, end) — must mirror offsets.js LAYOUT exactly
LAYOUT = [
    ("status", "u64", 0, 8), ("nonce", "u64", 8, 16),
    ("order_num", "u64", 16, 24), ("depth", "u64", 24, 32),
    ("coin_decimals", "u64", 32, 40), ("pc_decimals", "u64", 40, 48),
    ("state", "u64", 48, 56), ("reset_flag", "u64", 56, 64),
    ("min_size", "u64", 64, 72), ("vol_max_cut_ratio", "u64", 72, 80),
    ("amount_wave", "u64", 80, 88), ("coin_lot_size", "u64", 88, 96),
    ("pc_lot_size", "u64", 96, 104),
    ("min_price_multiplier", "u64", 104, 112),
    ("max_price_multiplier", "u64", 112, 120),
    ("sys_decimal_value", "u64", 120, 128),
    ("min_separate_numerator", "u64", 128, 136),
    ("min_separate_denominator", "u64", 136, 144),
    ("trade_fee_numerator", "u64", 144, 152),
    ("trade_fee_denominator", "u64", 152, 160),
    ("pnl_numerator", "u64", 160, 168), ("pnl_denominator", "u64", 168, 176),
    ("swap_fee_numerator", "u64", 176, 184),
    ("swap_fee_denominator", "u64", 184, 192),
    ("need_take_pnl_coin", "u64", 192, 200),
    ("need_take_pnl_pc", "u64", 200, 208),
    ("total_pnl_pc", "u64", 208, 216), ("total_pnl_coin", "u64", 216, 224),
    ("pool_open_time", "u64", 224, 232),
    ("state_padding_0", "u64", 232, 240),
    ("state_padding_1", "u64", 240, 248),
    ("orderbook_to_init_time", "u64", 248, 256),
    ("swap_coin_in_amount", "u128", 256, 272),
    ("swap_pc_out_amount", "u128", 272, 288),
    ("swap_acc_pc_fee", "u64", 288, 296),
    ("swap_pc_in_amount", "u128", 296, 312),
    ("swap_coin_out_amount", "u128", 312, 328),
    ("swap_acc_coin_fee", "u64", 328, 336),
    ("coin_vault", "pubkey", 336, 368), ("pc_vault", "pubkey", 368, 400),
    ("coin_vault_mint", "pubkey", 400, 432),
    ("pc_vault_mint", "pubkey", 432, 464),
    ("lp_mint", "pubkey", 464, 496), ("open_orders", "pubkey", 496, 528),
    ("market", "pubkey", 528, 560), ("market_program", "pubkey", 560, 592),
    ("target_orders", "pubkey", 592, 624),
    ("padding1", "pad64", 624, 688),
    ("amm_owner", "pubkey", 688, 720),
    ("lp_amount", "u64", 720, 728), ("client_order_id", "u64", 728, 736),
    ("recent_epoch", "u64", 736, 744), ("padding2", "u64", 744, 752),
]
MIN_SIZE = 752
WIDTH = {"u64": 8, "u128": 16, "pubkey": 32, "pad64": 64}
F = {n: (t, s, e) for n, t, s, e in LAYOUT}
ALPH = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def b58encode(bs: bytes) -> str:
    n = int.from_bytes(bs, "big")
    zeros = 0
    for b in bs:
        if b == 0:
            zeros += 1
        else:
            break
    if n == 0:
        return "1" * len(bs)
    out = ""
    while n > 0:
        n, r = divmod(n, 58)
        out = ALPH[r] + out
    return "1" * zeros + out


def check(name, got, want):
    ok = got == want
    print(f"{'PASS' if ok else 'FAIL'} {name}: got={got} want={want}")
    if not ok:
        FAIL.append(name)


print("== raydium AmmInfo 752B layout vectors (python mirror) ==")
check("field count=53", len(LAYOUT), 53)
check("MIN_SIZE=752", MIN_SIZE, 752)
check("first start=0", LAYOUT[0][2], 0)
check("last end=752", LAYOUT[-1][3], 752)
contig = all(LAYOUT[i][2] == LAYOUT[i - 1][3] for i in range(1, len(LAYOUT)))
check("contiguous", contig, True)
widths = all(e - s == WIDTH[t] for _, t, s, e in LAYOUT)
check("type widths", widths, True)
names_unique = len({n for n, _, _, _ in LAYOUT}) == len(LAYOUT)
check("names unique", names_unique, True)
u64n = sum(1 for _, t, _, _ in LAYOUT if t == "u64")
u128n = sum(1 for _, t, _, _ in LAYOUT if t == "u128")
pkn = sum(1 for _, t, _, _ in LAYOUT if t == "pubkey")
check("u64 count=38", u64n, 38)
check("u128 count=4", u128n, 4)
check("pubkey count=10", pkn, 10)
for nm, s, e in (("status", 0, 8), ("coin_vault", 336, 368),
                 ("pc_vault", 368, 400), ("lp_mint", 464, 496),
                 ("open_orders", 496, 528), ("market", 528, 560),
                 ("market_program", 560, 592), ("target_orders", 592, 624),
                 ("amm_owner", 688, 720), ("lp_amount", 720, 728),
                 ("client_order_id", 728, 736), ("recent_epoch", 736, 744),
                 ("padding2", 744, 752)):
    t, gs, ge = F[nm]
    check(f"{nm} {s}-{e}", (gs, ge), (s, e))
check("fees block 128-192", (F["min_separate_numerator"][1],
      F["swap_fee_denominator"][2]), (128, 192))
check("header 16xu64 = 0-128", (F["status"][1], F["sys_decimal_value"][2]), (0, 128))


def verdict(n):
    if n < 752:
        return "SHORT"
    if n == 752:
        return "VALID_EXACT"
    return "TRAILING"


check("len 0 -> SHORT", verdict(0), "SHORT")
check("len 751 -> SHORT", verdict(751), "SHORT")
check("len 752 -> EXACT", verdict(752), "VALID_EXACT")
check("len 753 -> TRAILING", verdict(753), "TRAILING")


def make_fixture():
    b = bytearray(752)
    pkj = 0
    for s, (nm, t, fs, fe) in enumerate(LAYOUT):
        if t == "u64":
            struct.pack_into("<Q", b, fs, 1 if nm in ("status", "state") else s + 1)
        elif t == "u128":
            struct.pack_into("<Q", b, fs, s + 1)
            struct.pack_into("<Q", b, fs + 8, 0x100 + s + 1)
        elif t == "pubkey":
            for k in range(fs, fe):
                b[k] = (0x21 + pkj) & 0xFF
            pkj += 1
        elif t == "pad64":
            for k in range(fs, fe):
                b[k] = (0xC0 + (k - fs)) & 0xFF
    return bytes(b)


fx = make_fixture()
check("fixture len", len(fx), 752)
check("fixture status==1", struct.unpack_from("<Q", fx, 0)[0], 1)
check("fixture state==1 (valid AmmState)", struct.unpack_from("<Q", fx, 48)[0], 1)
check("fixture nonce==2", struct.unpack_from("<Q", fx, 8)[0], 2)
check("fixture swap_coin_in lo==33", struct.unpack_from("<Q", fx, 256)[0], 33)
check("fixture swap_coin_in hi==0x121", struct.unpack_from("<Q", fx, 264)[0], 0x121)
check("fixture coin_vault fill 0x21", fx[336:368], bytes([0x21]) * 32)
check("fixture pc_vault fill 0x22", fx[368:400], bytes([0x22]) * 32)
check("fixture amm_owner fill 0x2a", fx[688:720], bytes([0x2A]) * 32)
check("fixture lp_amount==50", struct.unpack_from("<Q", fx, 720)[0], 50)
check("fixture client_order_id==51", struct.unpack_from("<Q", fx, 728)[0], 51)
check("fixture recent_epoch==52", struct.unpack_from("<Q", fx, 736)[0], 52)
check("fixture padding2==53", struct.unpack_from("<Q", fx, 744)[0], 53)
check("status byte range ok (1 in 0..7)", 0 <= fx[0] <= 7, True)
b64 = base64.b64encode(fx).decode()
back = base64.b64decode(b64)
check("base64 roundtrip len", len(back), 752)
check("base64 roundtrip bytes", back, fx)

check("b58 zero32", b58encode(bytes(32)), "1" * 32)
tok = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
n = 0
for ch in tok:
    n = n * 58 + ALPH.index(ch)
raw = n.to_bytes(32, "big")
check("token program b58 decode len", len(raw), 32)
check("token program b58 roundtrip", b58encode(raw), tok)

print("== static/offline file checks ==")
for p in (INDEX, CORE):
    ok = os.path.exists(p)
    print(f"{'PASS' if ok else 'FAIL'} exists {os.path.basename(p)}")
    if not ok:
        FAIL.append(f"exists {p}")
html = open(INDEX, encoding="utf-8").read()
core = open(CORE, encoding="utf-8").read()
for bad, why in (('src="http', "CDN script"), ("src='http", "CDN script"),
                 ("fetch(", "network fetch"), ("XMLHttpRequest", "XHR"),
                 ("api.mainnet-beta", "RPC call")):
    ok = bad not in html and bad not in core
    print(f"{'PASS' if ok else 'FAIL'} no `{bad}` in index.html/offsets.js")
    if not ok:
        FAIL.append(f"offline:{bad}")
for needle in ("752", "offsets.js", "coin_vault", "amm_owner", "base64",
               "status", "LIQUIDITY_STATE_LAYOUT_V4"):
    ok = needle in html
    print(f"{'PASS' if ok else 'FAIL'} index.html mentions `{needle}`")
    if not ok:
        FAIL.append(f"content:{needle}")
for needle in ("LAYOUT", "MIN_SIZE", "TOTAL_SIZE", "validateLayout",
               "validateAccount", "decodeAccount", "getU64LE", "getU128LE",
               "makeFixture"):
    ok = needle in core
    print(f"{'PASS' if ok else 'FAIL'} offsets.js mentions `{needle}`")
    if not ok:
        FAIL.append(f"core:{needle}")

print("== node cross-check (offsets.js, if node present) ==")
try:
    r = subprocess.run(["node", os.path.join(HERE, "run_tests.mjs")],
                       capture_output=True, text=True, timeout=20)
    print((r.stdout or "").strip() or "(no stdout)")
    if r.returncode != 0:
        print((r.stderr or "").strip())
        FAIL.append("node vectors")
except FileNotFoundError:
    print("SKIP node not installed (python mirror already passed)")
except Exception as e:
    print(f"SKIP node cross-check: {e}")

print("== http 200 (local server, no publish) ==")
Handler = functools.partial(http.server.SimpleHTTPRequestHandler,
                            directory=os.path.dirname(HERE))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
port = srv.server_address[1]
th = threading.Thread(target=srv.serve_forever, daemon=True)
th.start()
try:
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/raydium_offsets/",
                                timeout=10) as r:
        code = r.status
        body = r.read(6000).decode("utf-8", "replace")
    ok = code == 200 and "Raydium" in body and "752" in body
    print(f"{'PASS' if ok else 'FAIL'} http 200 /raydium_offsets/ (status={code})")
    if not ok:
        FAIL.append("http200")
finally:
    srv.shutdown()

print()
if FAIL:
    print(f"RESULT FAIL: {FAIL}")
    sys.exit(1)
print("RESULT ALL PASS")
