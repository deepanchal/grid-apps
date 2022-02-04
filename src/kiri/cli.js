#!/usr/bin/env node

const fs = require("fs");
const zx = require("zx");
const minimist = require("minimist");
const consola = require("consola");

const argv = minimist(process.argv.slice(2), {
  string: ["stlDir", "outputDir", "config"],
  default: {
    stlDir: "./stl",
    outputDir: "./output",
    config: "./src/kiri/print-config.json",
  },
  alias: { stlDir: "d" },
});

consola.info(zx.chalk.whiteBright("Args"));
console.dir(argv);

const libDir = ".";
const files = [
  "main/gapp",
  "moto/license",
  "main/kiri",
  "ext/three",
  "ext/pngjs",
  "ext/jszip",
  "ext/clip2",
  "ext/earcut",
  "add/array",
  "add/three",
  "add/class",
  "geo/base",
  "geo/point",
  "geo/points",
  "geo/slope",
  "geo/line",
  "geo/bounds",
  "geo/polygons",
  "geo/polygon",
  "geo/gyroid",
  "kiri/conf",
  "kiri/pack",
  "kiri/client",
  "kiri/engine",
  "kiri/slice",
  "kiri/slicer",
  "kiri/layers",
  "kiri-mode/fdm/fill",
  "kiri-mode/fdm/driver",
  "kiri-mode/fdm/slice",
  "kiri-mode/fdm/prepare",
  "kiri-mode/fdm/export",
  "kiri-mode/sla/driver",
  "kiri-mode/sla/slice",
  "kiri-mode/sla/export",
  "kiri-mode/cam/driver",
  "kiri-mode/cam/slicer",
  "kiri-mode/cam/ops",
  "kiri-mode/cam/tool",
  "kiri-mode/cam/topo",
  "kiri-mode/cam/slice",
  "kiri-mode/cam/prepare",
  "kiri-mode/cam/export",
  "kiri-mode/cam/animate",
  "kiri-mode/laser/driver",
  "kiri/widget",
  "kiri/print",
  "kiri/codec",
  "kiri/worker",
  "load/stl",
].map((p) => `${libDir}/src/${p}.js`);

const exports_save = exports,
  navigator = { userAgent: "" },
  module_save = module,
  THREE = {},
  gapp = {},
  geo = {},
  self = (this.self = {
    THREE,
    gapp,
    kiri: { driver: {}, loader: [] },
    location: { hostname: "local", port: 0, protocol: "fake" },
    postMessage: (msg) => {
      self.kiri.client.onmessage({ data: msg });
    },
  });

// fake fetch for worker to get wasm, if needed
const fetch = function (url) {
  console.log({ fake_fetch: url });
  const buf = fs.readFileSync(url);
  return new Promise((resolve, reject) => {
    resolve(
      new Promise((resolve, reject) => {
        resolve({
          arrayBuffer: function () {
            return buf;
          },
        });
      })
    );
  });
};

class Worker {
  constructor(url) {
    console.log({ fake_worker: url });
  }

  postMessage(msg) {
    setImmediate(() => {
      self.kiri.worker.onmessage({ data: msg });
    });
  }

  onmessage(msg) {
    // if we end up here, something went wrong
    console.trace("worker-recv", msg);
  }

  terminate() {
    // if we end up here, something went wrong
    console.trace("worker terminate");
  }
}

for (const file of files) {
  const isPNG = file.indexOf("/pngjs") > 0;
  const isClip = file.indexOf("/clip") > 0;
  const isEarcut = file.indexOf("/earcut") > 0;
  const isTHREE = file.indexOf("/three") > 0;
  if (isTHREE) {
    // THREE.js kung-fu fake-out
    exports = {};
  }
  const swapMod = isEarcut;
  if (swapMod) {
    module = { exports: {} };
  }
  const clearMod = isPNG || isClip;
  if (clearMod) {
    module = undefined;
  }
  try {
    console.log(zx.chalk.blueBright.bold(`loading ... ${libDir}/${file}`));
    eval(fs.readFileSync(libDir + "/" + file).toString());
  } catch (e) {
    throw e;
  }
  if (isClip) {
    ClipperLib = self.ClipperLib;
  }
  if (isTHREE) {
    Object.assign(THREE, exports);
    // restore exports after faking out THREE.js
    exports = exports_save;
  }
  if (isEarcut) {
    self.earcut = module.exports;
  }
  if (clearMod || swapMod) {
    module = module_save;
  }
}

const { kiri, moto, load } = self;
const engine = kiri.newEngine();

(async function () {
  const config = zx.fs.readJsonSync("./src/kiri/print-config.json");

  console.log(zx.chalk.whiteBright.bold("Using config"));
  console.dir(config);

  const printConfig = JSON.parse(fs.readFileSync("./src/kiri/print-config.json").toString());
  const stlDir = "/home/deep/projects/test-3d/joints";
  const stlFiles = fs.readdirSync(stlDir).filter((f) => f.endsWith(".stl"));

  for (const f of stlFiles) {
    const stlPath = `${stlDir}/${f}`;
    try {
      const data = await fetch(stlPath);
      console.log({ version: kiri.version });

      const buffer = data.arrayBuffer().buffer;
      const parsed = await engine.parse(buffer);
      console.log("parsed", parsed);

      await engine.moveTo(1, 1, 1);
      await engine.setProcess(printConfig.process);
      const eng = await engine.setDevice(printConfig.device);

      await eng.slice();
      await eng.prepare();
      const gcode = await eng.export();

      console.log(`${f} gcode: ${gcode.length} bytes`);
      zx.fs.writeFileSync(`${stlDir}/${f.split(".stl")[0]}.gcode`, gcode);
    } catch (e) {
      console.error(e);
    }
  }
})();
