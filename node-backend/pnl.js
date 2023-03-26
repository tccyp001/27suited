import fs from "fs";
import { spawnSync } from "child_process";
import { genSVG, genBackground, renderNode } from "./logplotter.js";
import { getIDColor } from "./players.js";
import { parseCSV } from "./csv.js";
import { parseLog } from "./logparser.js";

const cfg = {
  bgColor: "#f2e9e4",
  heightPerK: 100,
  widthPerHand: 8,

  rulerColor: "#607d8b",
  paddingLeft: 96,
  paddingRight: 64,
  paddingTop: 64,
  paddingBottom: 64,

  pnlStrokeWidth: 6,
  baselineStrokeWidth: 3,

  labelFontName: "Futura",
  labelFontSize: 16,
  labelColor: "#607d8b",
  labelPaddingRight: 24,
};

function getMean(vs) {
  return vs.reduce((s, c) => s + c, 0) / vs.length;
}

function getVariance(vs) {
  const m = getMean(vs);
  return vs.reduce((s, c) => s += (c - m) * (c - m), 0) / vs.length;
}

function getSTD(vs) {
  return Math.sqrt(getVariance(vs));
}

function getVol(vs) {
  return getSTD(vs) * Math.sqrt(vs.length);
}

function getStats(data) {
  const ret = {
    players: [],
    pnlMax: 0,
    pnlMaxK: 0,
    pnlMin: 0,
    pnlMinK: 0,
    hands: 0,
  };

  for (let p in data) {
    const deltas = data[p];
    ret.players.push({
      player: p,
      pnl: deltas[deltas.length-1][1],
    });
    const chips = [];
    deltas.forEach(pair => {
      const d = pair[1];
      chips.push(d);
      if (d > ret.pnlMax) {
        ret.pnlMax = d;
      } else if (d < ret.pnlMin) {
        ret.pnlMin = d;
      }
    });
    const variance = getVariance(chips);
    const std = Math.sqrt(variance);
    const vol = std * Math.sqrt(chips.length);

    console.log(chips, p, "\n", variance, std, vol);
    // ret.players[ret.players.length - 1].variance = Math.round(variance);
    ret.players[ret.players.length - 1].std = Math.round(std);
    ret.players[ret.players.length - 1].vol = Math.round(vol);
    if (deltas[deltas.length-1][0] > ret.hands) {
      ret.hands = deltas[deltas.length-1][0];
    }
  }

  // sort by pnl
  ret.players.sort((a, b) => {
    if (a.pnl > b.pnl) {
      return -1;
    }
    if (b.pnl > a.pnl) {
      return 1;
    }
    return a.player < b.player ? -1 : 1;
  });

  ret.pnlMaxK = Math.ceil(ret.pnlMax / 1000);
  ret.pnlMinK = Math.floor(ret.pnlMin / 1000);
  return ret;
}

function genHR(w, y, cont) {
  return ["line", {
    x1: cfg.paddingLeft,
    y1: y,
    x2: cfg.paddingLeft + w,
    y2: y,
    stroke: cfg.rulerColor,
    "stroke-width": cont ? cfg.baselineStrokeWidth : 1,
    fill: "none",
    "stroke-dasharray": cont ? undefined : "4"
  }];
}

function genLine(x1, y1, x2, y2, color, sw) {
  return ["line", {x1, y1, x2, y2,
    stroke: color,
    "stroke-width": sw,
    "stroke-linecap": "round",
    fill: "none",
//    "stroke-dasharray": cont ? undefined : "4"
  }];
}

function getBaseY(stats) {
  return cfg.paddingTop + stats.pnlMaxK * cfg.heightPerK;
}

function renderRulers(svg, stats) {
  const baseY = getBaseY(stats);
  const rulerW = stats.hands * cfg.widthPerHand;
  for (let k = stats.pnlMaxK; k >= stats.pnlMinK; k--) {
    svg.push(genHR(rulerW, baseY - k * cfg.heightPerK, !k));
  }
}

function renderRulerLabels(svg, stats) {
  const baseY = getBaseY(stats);
  for (let k = stats.pnlMaxK; k >= stats.pnlMinK; k--) {
    let text;
    if (k > 0) {
      text = "+" + k + "K";
    } else if (k < 0) {
      text = k + "K";
    } else {
      text = "0";
    }
    svg.push(
      ["text", {
        x: cfg.paddingLeft - cfg.labelPaddingRight,
        y: baseY - k * cfg.heightPerK,
        "dominant-baseline": "middle",
        "text-anchor": "end",
      }, ["tspan", {
        "font-family": cfg.labelFontName,
        "font-size": cfg.labelFontSize,
        //"font-weight": "bold",
        "fill": cfg.labelColor,
      }, text]]
    );
  }
}

function renderPNLChart(svg, stats, player, deltas) {
  let lastY = 0;
  const color = getIDColor(player);
  const baseY = getBaseY(stats);
  for (let i = 0; i < deltas.length; i++) {
    const delta = deltas[i];
    const hand = delta[0];
    const pnl = delta[1];
    svg.push(genLine(cfg.paddingLeft + (hand - 1) * cfg.widthPerHand, baseY - (lastY * cfg.heightPerK / 1000) | 0,
      cfg.paddingLeft + hand * cfg.widthPerHand, baseY - (pnl * cfg.heightPerK / 1000) | 0, color, cfg.pnlStrokeWidth));
    lastY = pnl;
  }
}

function renderPNLCharts(svg, stats, data) {
  for (let i = stats.players.length - 1; i >= 0; i--) {
    const player = stats.players[i].player;
    renderPNLChart(svg, stats, player, data[player]);
  }
}

export function plotPNL(data) {
  const stats = getStats(data);
  console.log("stats\n", stats);

  const width = cfg.paddingLeft + stats.hands * cfg.widthPerHand + cfg.paddingRight;
  const height = cfg.paddingTop + (stats.pnlMaxK - stats.pnlMinK) * cfg.heightPerK + cfg.paddingBottom;
  console.log("width", width, "height", height);
  
  const svg =genSVG(width, height);
  svg.push(genBackground(cfg.bgColor));
  renderRulers(svg, stats);
  renderRulerLabels(svg, stats);
  renderPNLCharts(svg, stats, data);

  return renderNode(svg);
}

// function main() {
//   const argv = process.argv.slice(2);
//   if (argv.length !== 1) {
//     throw "expecting path to log file";
//   }
//   const lines = parseCSV(argv[0]).reverse();
//   const data = parseLog(lines);
//   const svg = plotPNL(data.pnl);
//   // console.log("svg\n", svg);
//   // fs.writeFileSync("./output/pnl.svg", svg);
//   // return;
//   const pngName = "./output/pnl.png";
//   let res = spawnSync("convert", ["-", pngName], {input: svg});
//   if (res.status !== 0) {
//     throw new Error(res);
//   }
//   res = spawnSync("osascript", ["-e", `set the clipboard to (read (POSIX file "${pngName}") as «class PNGf»)`]);
//   if (res.status !== 0) {
//     throw new Error(res);
//   }

// }

// main();