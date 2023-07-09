const palette = [
  "#f44336", "#e91e63", "#9c27b0", "#673ab7", // red, pink, purple, deepPurple
  "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4", // indigo, blue, lightBlue, cyan,
  "#009688", "#4caf50", "#8bc34a", "#cddc39", // teal, green, lightGreen, lime
  "#ffeb3b", "#ffc107", "#ff9800", "#ff5722", // yellow, amber, orange, deepOrange
  "#795548", "#9e9e9e", "#607d8b"]; // brown, grey, blueGrey

export const playerList = [
  "QICHENG",
  "YONGSHENG",
  "ZHEN",
  "GRACE",
  "MING",
  "YING",
  "BING",
  "LAWRENCE",
  "TAO",
  "JOHN",
  "JASON",
  "MAO",
  "JACK",
  "YP",
  "XIA",
  "MIKE",
]

const colorMap = {
  QICHENG: 3,
  YONGSHENG: 5,
  ZHEN: 14,
  GRACE: 1,
  YUCHEN: 7,
  MING: 9,
  YING: 0,
  BING: 2,
  LAWRENCE: 8,
  TAO: 6,
  JOHN: 4,
  JASON: 16,
  MAO: 11,
  JACK: 13,
  YP: 10,
  XIA: 12,
  MIKE: 15,
};

export function getIDColor(id) {
  const c = colorMap[id];
  if (typeof c !== "number") {
    throw `color not assigned for ${id}`;
  }
  return palette[c];
};

const aliasMap = {
  "JACK MA": "JACK",
  "JOHN Z": "JOHN",
  "TAO Q": "TAO",
  "TAO QIN": "TAO",
  "LAWRENCEL": "LAWRENCE",
  "LAWRENCE LAO": "LAWRENCE",
  "MINGL": "MING",
  "YING L": "YING",
  "JIANG": "BING",
  "YS": "YONGSHENG",
  "MIKE2": "MIKE",
  "QC": "QICHENG",
};

export function normalizePlayer(s) {
  let id = s.split("@")[0].toUpperCase().replace(/[^A-Z]/g, ' ').trim();
  if (id in aliasMap) {
    id = aliasMap[id];
  }
  return id;
};
