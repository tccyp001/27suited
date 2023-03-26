import { normalizePlayer } from "./players.js";

function initState() {
  return {
    pot: [],
    hands: 0,
    round: "",
    table: [],
    vpip: {},
    pfr: {},
    winners: {},
    players: {},
    flops: [],
    pnl: {},
  };
}

function initPlayerState() {
  return {
    pnl: {},
    hands: 0,
    vpip: [],
    pfr: [],
    afBets: 0,
    afRaises: 0,
    afCalls: 0,
    afFolds: 0,
    afChecks: 0,
    wins: 0,
    delta: 0,
  };
}

function printState(state) {
  console.log("hands", state.hands, "pot", potSize(state.pot), state.pot);
  for (let p in state.players) {
    console.log(p, state.players[p]);
  }
}

function potSize(pot) {
  return pot.reduce((size, curr) => size + curr[1], 0);
}

function parseNoOps(entry, state) {
  if (entry.endsWith(" requested a seat.") ||
    entry.endsWith(" canceled the seat request.") ||
    entry.endsWith(" because authenticated login.") ||
    (entry.startsWith("The admin ") && entry.match(/approved|enqueued|rejected|forced|canceled/)) ||
    entry.startsWith("Undealt cards: ") ||
    entry.startsWith("WARNING: the admin ") ||
    entry.startsWith("The game's ") ||
    entry.startsWith("Your hand is ") ||
    entry.startsWith("Dead Small Blind") ||
    entry.startsWith("Dead Big Blind") ||
    entry.indexOf("passed the room ownership") > 0 ||
    entry.indexOf("stand up with the stack") > 0) {
    return state;
  }
}

function parsePlayerStacks(entry, state) {
  if (entry.startsWith("Player stacks: ")) {
    state.table = [... entry.matchAll(/"([^"]+)" \(\d+\)/g)].map(m => normalizePlayer(m[1]));
    return state;
  }
}

function parseStartingHand(entry, state) {
  if (entry.startsWith("-- starting hand ")) {
    if (state.pot.length) {
      throw `unexpected starting state (pot): ${JSON.stringify(state)}`;
    }
    for (let p in state.players) {
      if (state.players[p].bet) {
        throw `unexpected starting state (bet): ${JSON.stringify(state)}`;
      }
    }
    state.round = "preflop";
    state.vpip = {};
    state.pfr = {};
    state.winners = {};
    return state;
  }
}

function parseEndingHand(entry, state) {
  if (entry.startsWith("-- ending hand ")) {
    state.hands++;
    state.table.forEach(p => {
      state.players[p].hands++;

      state.pnl[p] = state.pnl[p] || [];
      state.pnl[p].push([state.hands, state.players[p].delta]);
    });
    for (let p in state.vpip) {
      state.players[p].vpip.push(state.hands);
    }
    for (let p in state.pfr) {
      state.players[p].pfr.push(state.hands);
    }
    for (let p in state.winners) {
      state.players[p].wins++;
    }
    return state;
  }
}

function parseSitBack(entry, state) {
  const m = entry.match(/The player "([^"]+)" sit back with the stack of (\d+)./);
  if (m) {
    const player = normalizePlayer(m[1]);
    const stack = parseInt(m[2], 10);
    state.players[player] = state.players[player] || initPlayerState();
    state.players[player].carryover = stack;
    return state;
  }
}

function parseBuyIn(entry, state) {
  const m = entry.match(/The player "([^"]+)" joined the game with a stack of (\d+)./);
  if (m) {
    const player = normalizePlayer(m[1]);
    const stack = parseInt(m[2], 10);
    state.players[player] = state.players[player] || initPlayerState();
    state.players[player].stack = stack;
    state.players[player].bet = 0;
    state.players[player].buyin = (state.players[player].buyin || 0) + stack - (state.players[player].carryover || 0);
    delete state.players[player].carryover;
    return state;
  }
}

function parseUpdateStack(entry, state) {
  const m = entry.match(/The admin updated the player "([^"]+)" stack from (\d+) to (\d+)./);
  if (m) {
    const player = normalizePlayer(m[1]);
    const fromStack = parseInt(m[2], 10);
    const toStack = parseInt(m[3], 10);
    state.players[player] = state.players[player] || initPlayerState();
    state.players[player].stack = toStack;
    state.players[player].buyin = (state.players[player].buyin || 0) + toStack - fromStack;
    return state;
  }
}

function parseBlind(entry, state) {
  const m = entry.match(/"([^"]+)" posts a( missing| missed)? (small|big) blind of (\d+)/);
  if (m) {
    const player = normalizePlayer(m[1]);
    if (m[2] === " missing" && state.pot[0][0] === player) {
      // do nothing when the player has already posted a small blind
      return state;
    }
    const blind = parseInt(m[4], 10);
    state.players[player].stack -= blind;
    if (m[2] !== " missing") {
      // missing small blind is considered dead
      state.players[player].bet = blind;
    }
    state.pot.push([player, blind]);
    return state;
  }
}

function parseStraddle(entry, state) {
  const m = entry.match(/"([^"]+)" posts a straddle of (\d+)/);
  if (m) {
    const player = normalizePlayer(m[1]);
    const straddle = parseInt(m[2], 10);
    state.players[player].stack -= straddle;
    state.players[player].bet = straddle;
    state.pot.push([player, straddle]);
    return state;
  }
}

function parseRaise(entry, state) {
  const m = entry.match(/"([^"]+)" raises to (\d+)/);
  if (m) {
    const player = normalizePlayer(m[1]);
    const raise = parseInt(m[2], 10);
    const delta = raise - state.players[player].bet;
    state.players[player].stack -= delta;
    state.players[player].bet = raise;
    state.pot.push([player, delta]);
    if (state.round === "preflop") {
      state.vpip[player] = 1;
      state.pfr[player] = 1;
    } else {
      state.players[player].afRaises++;
    }
    return state;
  }
}

function parseBet(entry, state) {
  const m = entry.match(/"([^"]+)" bets (\d+)/);
  if (m) {
    const player = normalizePlayer(m[1]);
    const bet = parseInt(m[2], 10);
    state.players[player].stack -= bet;
    state.players[player].bet = bet;
    state.pot.push([player, bet]);
    if (state.round !== "preflop") {
      state.players[player].afBets++;
    }
    return state;
  }
}

function parseFold(entry, state) {
  const m = entry.match(/"([^"]+)" folds/);
  if (m) {
    const player = normalizePlayer(m[1]);
    state.players[player].bet = 0;
    if (state.round !== "preflop") {
      state.players[player].afFolds++;
    }
    return state;
  }
}

function parseCall(entry, state) {
  const m = entry.match(/"([^"]+)" calls (\d+)/);
  if (m) {
    const player = normalizePlayer(m[1]);
    const call = parseInt(m[2], 10);
    const delta = call - state.players[player].bet;
    state.players[player].stack -= delta;
    state.players[player].bet = call;
    state.pot.push([player, delta]);
    if (state.round === "preflop") {
      state.vpip[player] = 1;
    } else {
      state.players[player].afCalls++;
    }
    return state;
  }
}

function parseCheck(entry, state) {
  const m = entry.match(/"([^"]+)" checks/);
  if (m) {
    if (state.round !== "preflop") {
      const player = normalizePlayer(m[1]);
      state.players[player].afChecks++;
    }
    return state;
  }
}

function parseCard(card) {
  const ret = card.replace(/^10/, "T").replace("♦", "d").replace("♠", "s").replace("♥", "h").replace("♣", "c");
  if (ret.match(/^[23456789TJQKA][cdhs]$/)) {
    return ret;
  }
  throw Error("invalid card: " + card);
}

function parseFlop(entry, state) {
  const m = entry.match(/Flop:  \[(\w+.), (\w+.), (\w+.)\]/);
  if (m) {
    state.round = "flop";
    state.flops.push([parseCard(m[1]), parseCard(m[2]), parseCard(m[3])]);
    return clearBets(state);
  }
}

function parseTurn(entry, state) {
  if (entry.startsWith("Turn: ")) {
    state.round = "turn";
    return clearBets(state);
  }
}

function parseRiver(entry, state) {
  if (entry.startsWith("River: ")) {
    state.round = "river";
    return clearBets(state);
  }
}

function parseShow(entry, state) {
  const m = entry.match(/"([^"]+)" shows /);
  if (m) {
    return clearBets(state);
  }
}

function parseCollect(entry, state) {
  const m = entry.match(/"([^"]+)" collected (\d+) from pot/);
  if (m) {
    const player = normalizePlayer(m[1]);
    const winning = parseInt(m[2], 10);
    state.players[player].stack += winning;
    state.winners[player] = 1;
    let remaining = winning;
    while (remaining > 0) {
      const first = state.pot[0];
      const from = first[0];
      const chips = first[1];
      const take = Math.min(remaining, chips);
      if (chips > remaining) {
        state.pot[0][1] -= take;
      } else {
        state.pot.shift();
      }
      remaining -= take;
      if (from !== player) { // ignore own chips
        state.players[from].pnl[player] = (state.players[from].pnl[player] || 0) - take;
        state.players[player].pnl[from] = (state.players[player].pnl[from] || 0) + take;
        state.players[from].delta -= take;
        state.players[player].delta += take;
      }
    }
    return state;
  }
}

function parseReturnUncalled(entry, state) {
  const m = entry.match(/Uncalled bet of (\d+) returned to "([^"]+)"/);
  if (m) {
    const player = normalizePlayer(m[2]);
    const uncalled = parseInt(m[1], 10);
    let i = state.pot.length - 1;
    while (state.pot[i][0] !== player) {
      i--;
    }
    const remaining = state.pot[i][1] - uncalled;
    if (remaining > 0) {
      state.pot[i][1] = remaining;
    } else {
      state.pot.splice(i, 1);
    }
    state.players[player].stack += uncalled;
    state.players[player].bet = 0;
    return state;
  }
}

function parseQuit(entry, state) {
  const m = entry.match(/The player "([^"]+)" quits the game with a stack of (\d+)/);
  if (m) {
    return state;
  }
}

function clearBets(state) {
  for (let p in state.players) {
    state.players[p].bet = 0;
  }
  return state;
}

const parsers = [
  parseBuyIn, parseUpdateStack, parseBlind, parseRaise, parseFold, parseCall, parseStraddle,
  parseCheck, parseBet, parseFlop, parseTurn, parseRiver,
  parseShow, parseCollect, parseReturnUncalled, parseStartingHand, parseEndingHand,
  parsePlayerStacks, parseQuit, parseSitBack, parseNoOps];

function parseLine(index, line, state) {
  const entry = line.entry;
  for (let i = 0; i < parsers.length; i++) {
    const s = parsers[i](entry, state);
    if (s) {
      return s;
    }
  }
  throw `unrecognized entry[${index}]: ${entry}`;
}

function validateState(state) {
  for (let p in state.players) {
    for (let o in state.players[p].pnl) {
      const w = state.players[p].pnl[o];
      const l = state.players[o].pnl[p];
      if (w !== -l) {
        throw "unbalanced pnl";
      }
    }
  }
}

function extractPlayers(state) {
  let ret = [];
  for (let p in state.players) {
    const player = state.players[p];
    const payoff = player.pnl;
    const pnl = [];
    for (let o in payoff) {
      pnl.push([payoff[o], o]);
    }
    pnl.sort((a, b) => a[0] - b[0]);
    const sum = pnl.reduce((s, curr) => s+curr[0], 0);
    if (sum !== player.delta) {
      throw Error(p + " " + sum + " !== " + player.delta);
    }
    ret.push({
      player: p,
      hands: player.hands,
      wins: player.wins,
      winspct: Math.round(player.wins * 100 / player.hands),
      buyin: player.buyin,
      vpip: player.vpip.length,
      vpippct: Math.round(player.vpip.length * 100 / player.hands),
      pfr: player.pfr.length,
      pfrpct: Math.round(player.pfr.length * 100 / player.hands),
      afBets: player.afBets,
      afRaises: player.afRaises,
      afCalls: player.afCalls,
      afChecks: player.afChecks,
      afFolds: player.afFolds,
      pnl: pnl,
      sum,
      delta: player.delta,
    });
  }
  ret.sort((a, b) => b.sum - a.sum);
  return ret;
};

function parseStartTime(lines) {
  return lines[0].at;
};

function parseEndTime(lines) {
  return lines[lines.length - 1].at;
};

export function isSuited(cards) {
  const suit = cards[0][1];
  for (let i = 1; i < cards.length; i++) {
    if (cards[i][1] !== suit) {
      return false;
    }
  }
  return true;
};

export function isSameKind(cards) {
  const kind = cards[0][0];
  for (let i = 1; i < cards.length; i++) {
    if (cards[i][0] !== kind) {
      return false;
    }
  }
  return true;
};

export function parseLog(lines) {
  let s = initState();
  let i;
  try {
    for (i = 0; i < lines.length; i++) {
      // console.log(i, lines[i].entry);
      s = parseLine(i, lines[i], s);
      // validateState(s);
      // printState(s);
    }
  } catch (e) {
    printState(s);
    console.log(`offending line ${i}: ${lines[i].entry}`);
    throw e;
  }
  return {
    startTime: parseStartTime(lines),
    endTime: parseEndTime(lines),
    players: extractPlayers(s),
    pnl: s.pnl,
    // flops: s.flops,
  };
};
