import { getIDColor } from "./players.js";

const cfg = {
  colWidth: 150,
  colPadding: 10,
  paddingLeft: 180,
  paddingRight: 60,
  paddingTop: 60,
  paddingBottom: 60,
  
  bgColor: "#f2e9e4",
  rulerColor: "#607d8b",
  rulerPadding: 0,
  fontName: "Futura",
  fontSize: 16,
  textColor: "#22223b",


  nameColor: "#22223b",
  nameSize: 16,
  nameBarHeight: 5,

  lineHeight: 36,

  labelSize: 13,
  labelColor: "#607d8b",
  labelPadding: 30,

  sumSize: 16,
  sumPosColor: "#4caf50",
  sumNegColor: "#f44336",

  pctBarHeight: 15,
  pctBarColor: "#fff",
  barWidth: 60,

  width: 1000,
  height: 600,

  marginTop: 120,
  nameOffsetX: 15,
  nameOffsetY: 5,
  nameMarginLeft: 50,
  gridColor: "#ccc",
  midLineColor: "#999",
  barHeight: 20,

  radarRadius: 50,
}

export function genSVG(width, height) {
  return ["svg", {
    version: "1.1",
    width, height,
    viewBox: `0 0 ${width} ${height}`,
    xmlns: "http://www.w3.org/2000/svg"
  }];
}

function setSVGHeight(svg, h) {
  const w = svg[1].width;
  svg[1].height = h;
  svg[1].viewBox = `0 0 ${w} ${h}`;
  return svg;
}

export function genBackground(color) {
  return ["rect", {
    width: "100%",
    height: "100%",
    fill: color,
  }];
}

export function renderNode(node) {
  if (typeof node === "string") {
    return node;
  }
  if (Array.isArray(node[0])) {
    return node[0].map(renderNode).join("");
  }
  let ret = "<" + node[0];
  const attrs = node[1];
  if (attrs) {
    for (let attr in attrs) {
      ret += ` ${attr}="${attrs[attr]}"`;
    }
  }

  if (node.length > 2) {
    ret += ">\n";
    for (let i = 2; i < node.length; i++) {
      ret += renderNode(node[i]);
    }
    ret += "</" + node[0] + ">\n";
  } else {
    ret += " />\n";
  }
  return ret;
}

function renderText(text, index, v, color, fontSize, fontName) {
  color = color || cfg.textColor;
  fontSize = fontSize || cfg.fontSize;
  fontName = fontName || cfg.fontName;
  let x = cfg.paddingLeft;
  let anchor = "start";
  if (index < 0) {
    x -= cfg.labelPadding * -index;
    anchor = "end";
  } else {
    x += cfg.colWidth * index + cfg.colPadding;
  }
  return ["text", {
    x,
    y: v + cfg.lineHeight / 2,
    "dominant-baseline": "middle",
    "text-anchor": anchor,
  }, ["tspan", {
    "font-family": fontName,
    "font-size": fontSize,
    //"font-weight": "bold",
    "fill": color,
  }, text]];
}

function renderPlayerNet(sum, index, v) {
  let t = sum + "";
  let color;
  if (sum > 0) {
    t = "+" + t;
    color = cfg.sumPosColor;
  } else {
    t = "−" + (-sum);
    color = cfg.sumNegColor;
  }
  return renderText(t, index, v, color, cfg.sumSize);
}

function renderLabel(label, v) {
  return renderText(label, -1, v, cfg.labelColor, cfg.labelSize);
}

function renderPlayerID(id, index, v) {
  const color = getIDColor(id);
  return [[
    renderText(id, index, v, cfg.nameColor, cfg.nameSize),
    ["rect", {
      x: cfg.paddingLeft + cfg.colWidth * index,
      y: v + cfg.lineHeight- cfg.nameBarHeight,
      width: cfg.colWidth - cfg.colPadding,
      height: cfg.nameBarHeight,
      fill: color,
    }]
  ]];
}

function getLineY(index) {
  return cfg.marginTop + index * cfg.lineHeight;
}

function genGrid(data) {
  const n = data.length;
  const ret = [];
  const midLine = cfg.width / 2;
  for (let i = -3; i <= 3; i++) {
    const x = midLine + i * 100;
    ret.push(["line", {
      x1: x,
      y1: getLineY(-.5),
      x2: x,
      y2: getLineY(n - .5),
      stroke: i ? cfg.gridColor : cfg.midLineColor,
    }]);
    ret.push(["text", {
      x: x,
      y: getLineY(-.75),
      "text-anchor": "middle",
      "dominant-baseline": "middle",
    }, ["tspan", {
      "font-family": cfg.nameFont,
      "font-size": cfg.nameSize,
      "fill": i ? cfg.gridColor : cfg.midLineColor,
    }, i ? i + "K" : "0"]]);
  }
  return ["", ret];
}

function renderPlayerPNL(pnl, index, v) {
  let neg = 0;
  let pos = 0;
  let ret = [];
  let mid = -1;
  const midLine = v + cfg.lineHeight / 2; //
  for (let i = 0; i < pnl.length; i++) {
    if (pnl[i][0] >= 0) {
      break;
    }
    mid = i;
  }
  for (let i = 0; i <= mid; i++) {
    const w = pnl[i][0] / 10;
    const oppID = pnl[i][1];
    const oppColor = getIDColor(oppID);
    ret.push(["rect", {
      x: cfg.paddingLeft + index * cfg.colWidth + cfg.colPadding,
      y: midLine + neg,
      width: cfg.barWidth,
      height: -w,
      fill: oppColor
    }]);
    neg -= w;
  }
  for (let i = pnl.length - 1; i > mid; i--) {
    const w = pnl[i][0] / 10;
    const oppID = pnl[i][1];
    const oppColor = getIDColor(oppID);
    ret.push(["rect", {
      x: cfg.paddingLeft + index * cfg.colWidth + cfg.colPadding,
      y: midLine - pos - w,
      height: w,
      width: cfg.barWidth,
      fill: oppColor
    }]);
    pos += w;
  }
  return [ret];
}

function genHR(y, w, color) {
  color = color || cfg.rulerColor;
  return ["line", {
    x1: 0,
    y1: y,
    x2: w,
    y2: y,
    stroke: color,
  }];
}

function genVR(x, h, color) {
  color = color || cfg.rulerColor;
  return ["line", {
    x1: x,
    y1: 0,
    x2: x,
    y2: h,
    stroke: color,
  }];
}

export function plotLog(data) {
  const players = data.players;
  const n = players.length;
  const w = cfg.paddingLeft + cfg.colWidth * n + cfg.paddingRight;
  const h = cfg.paddingTop + cfg.height + cfg.paddingBottom;
  const svg = genSVG(w, h);
  svg.push(genBackground(cfg.bgColor));

svg.push(["rect", {
  x: 0,
  y: 0,
  width: cfg.paddingLeft - cfg.colPadding,
  height: cfg.paddingTop + cfg.lineHeight, // cfg.nameBarHeight,
  fill: cfg.labelColor,
}]);

  let v = cfg.paddingTop;
  svg.push(renderText(new Date(data.startTime).toLocaleDateString("en-US", {timeZone: "America/Los_Angeles"}), -1, v, cfg.bgColor, cfg.nameSize));



  players.forEach((player, i) => {
    svg.push(renderPlayerID(player.player, i, v));
  });
  v += cfg.lineHeight + cfg.nameBarHeight;
  svg.push(renderLabel("NET", v));
  players.forEach((player, i) => {
    svg.push(renderPlayerNet(player.sum, i, v));
  });

  v += cfg.lineHeight;

  renderPNL();

  v += cfg.lineHeight;
  svg.push(renderLabel("BUY-IN", v));
  players.forEach((player, i) => {
    svg.push(renderText(player.buyin + "", i, v));
  });

  v += cfg.lineHeight;
  svg.push(renderLabel("HANDS", v));
  players.forEach((player, i) => {
    svg.push(renderText(player.hands + "", i, v));
  });

  v += cfg.lineHeight;
  svg.push(renderLabel("WINS", v));
  players.forEach((player, i) => {
    svg.push(renderText(player.winspct + "% (" + player.wins + "/" + player.hands + ")", i, v));
    svg.push(...renderPercentage(player.winspct, i, v));
  });

  v += cfg.lineHeight * 2;
  svg.push(renderLabel("VPIP", v));
  players.forEach((player, i) => {
    svg.push(renderText(player.vpippct + "% (" + player.vpip + "/" + player.hands + ")", i, v));
    svg.push(...renderPercentage(player.vpippct, i, v));
  });

  v += cfg.lineHeight * 2;
  svg.push(renderLabel("PFR", v));
  players.forEach((player, i) => {
    svg.push(renderText(player.pfrpct + "% (" + player.pfr + "/" + player.hands + ")", i, v));
    svg.push(...renderPercentage(player.pfrpct, i, v));
  });

  v += cfg.lineHeight * 2;
  svg.push(renderLabel("AFQ", v));
  players.forEach((player, i) => {
    const agg = player.afBets + player.afRaises;
    const total = agg + player.afCalls + player.afFolds;
    const pct = Math.round(agg * 100 / total);
    svg.push(renderText(pct + "% (" + agg + "/" + total + ")", i, v));
    svg.push(...renderPercentage(pct, i, v));
  });

  v += cfg.lineHeight * 2;
  svg.push(renderLabel("PFR", v));
  svg.push(renderText("AFQ", -3.5, v, cfg.labelColor, cfg.labelSize));
  svg.push(...renderRadarChart(players[0], -1, v));
  players.forEach((player, i) => {
    svg.push(...renderRadarChart(player, i, v));
  });
  svg.push(renderText("VPIP", -2.25, v + cfg.radarRadius * 2, cfg.labelColor, cfg.labelSize));

  v += cfg.lineHeight * 4;
  svg.push(renderLabel("FOOTNOTE", v));
  svg.push(renderText("VPIP (voluntarily put money in pot) tracks the percentage of hands a player calls or raises PRE-FLOP.", 0, v));
  v += cfg.lineHeight;
  svg.push(renderText("Posting the blinds is involuntary and thus does not increase VPIP.", 0, v));
  v += cfg.lineHeight;
  svg.push(renderText("PFR (pre-flop raise) tracks the percentage of hands a player raises PRE-FLOP.", 0, v));
  v += cfg.lineHeight;
  svg.push(renderText("AFQ (aggression frequency) tracks the percentage of POST-FLOP aggressive actions:", 0, v));
  v += cfg.lineHeight;
  svg.push(renderText("AFQ = (Raises + Bets) / (Raises + Bets + Calls + Folds), where all actions are POST-FLOP.", 0, v));

  v += cfg.lineHeight * 2;

  function renderPNL() {
  let minNet = 0, maxNet = 0;
  players.forEach(player => {
    let ns = 0;
    let ps = 0;
    player.pnl.forEach(e => {
      const v = e[0];
      if (v < 0) {
        ns += v;
      } else {
        ps += v;
      }
    });
    minNet = Math.min(minNet, ns);
    maxNet = Math.max(maxNet, ps);
  });

  const minK = -Math.floor(minNet / 1000);
  const maxK = Math.ceil(maxNet / 1000);
  v += maxK * 100;

  for (let i = 1; i <= maxK; i++) {
    svg.push(renderHR(n, v - i * 100));
    svg.push(renderLabel("+" + i + "K", v - i * 100));
  }
  
  for (let i = 1; i <= minK; i++) {
    svg.push(renderHR(n, v + i * 100));
    svg.push(renderLabel("−" + i + "K", v + i * 100));
  }

  players.forEach((player, i) => {
    svg.push(renderPlayerPNL(player.pnl, i, v));
  });

  svg.push(renderHR(n, v, true));
  svg.push(renderLabel("PNL", v));

  v += minK * 100;
  }

  setSVGHeight(svg, v + cfg.paddingBottom);

  return renderNode(svg);
};

function renderRadarChart(player, index, v) {
  const color = getIDColor(player.player);
  const vals = [
    player.vpip / player.hands,
    player.pfr / player.vpip,
    (player.afBets + player.afRaises) / (player.afBets + player.afRaises + player.afCalls + player.afFolds),
  ];
  const w = cfg.colWidth - cfg.colPadding;
  const cx = cfg.paddingLeft + cfg.colWidth * index + w / 2;
  const cy = v + cfg.radarRadius;
  const len = vals.length;
  const ret = [];
  let d = "";
  for (let i = 0; i < len; i++) {
    const a = Math.PI * 2 * i / len;
    const dx = Math.sin(a) * cfg.radarRadius;
    const dy = Math.cos(a) * cfg.radarRadius;
    const x = cx + dx * vals[i];
    const y = cy + dy * vals[i];
    d += `${i ? "L" : "M"} ${x} ${y}`;
    ret.push(["line", {
      x1: cx,
      y1: cy,
      x2: cx + dx,
      y2: cy + dy,
      stroke: cfg.rulerColor,
    }]);
  }
  d += "Z";
  if (index >= 0) {
    ret.push(["path", {
      fill: color,
      stroke: cfg.rulerColor,
      d,
    }]);
  }
  return ret;
}

function renderHR(n, v, cont) {
  v += cfg.lineHeight / 2;
  return ["line", {
    x1: cfg.paddingLeft - cfg.rulerPadding,
    y1: v,
    x2: cfg.paddingLeft + n * cfg.colWidth + cfg.paddingRight,
    y2: v,
    stroke: cfg.rulerColor,
    fill: "none",
    "stroke-dasharray": cont ? undefined : "4"
  }];
}

function renderPercentage(pct, index, v) {
  const w = cfg.colWidth - cfg.colPadding;
  const fw = Math.round((w - 2) * pct / 100);
  return [
  ["rect", {
      x: cfg.paddingLeft + cfg.colWidth * index,
      y: v + cfg.lineHeight,
      width: w,
      height: cfg.pctBarHeight,
      fill: cfg.labelColor, 
  }],
  ["rect", {
    x: cfg.paddingLeft + cfg.colWidth * index + 1,
    y: v + cfg.lineHeight + 1,
    width: fw,
    height: cfg.pctBarHeight - 2,
    fill: cfg.pctBarColor, 
  }]];
}