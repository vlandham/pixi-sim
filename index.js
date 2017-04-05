const su = new SpriteUtilities(PIXI);

const TILESIZE = 16;

let rand = function(i) {
  return Math.floor(Math.random()*i);
};

let updateRollingAve = function (current, incremental) {
  return current * (STAT_ROLL-1)/STAT_ROLL + incremental/STAT_ROLL;
};

let sameLoc = function(a,b) {
  return a.x == b.x && a.y == b.y;
};

let getDist = function(a,b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};


let PACK = function(){
  throw new Error("PACK not yet initialized");
};

class MapMaker {
  constructor(cols, rows, tilesize) {
    this.generate = this.generate.bind(this);
    this.rows = rows;
    this.cols = cols;
    this.tilesize = tilesize;
    this.tiles = [];
  }

  createArray(length) {
    var arr = new Array(length || 0);
    var i = length;

    if (arguments.length > 1) {
      var args = Array.prototype.slice.call(arguments, 1);
      while(i--) arr[length-1 - i] = this.createArray.apply(this, args);
    }

    return arr;
  }



  generate() {

    function isNotStreet(x, y, cols, rows) {
      return x < 0 || x >= cols || y < 0 || y >= rows || // in bounds
      (x % 2 == 1 && y % 2 == 1); // not a 'pillar'
    }

    this.tiles = this.createArray(this.cols, this.rows)

    for (var x = 0; x < this.cols; x++) {
      for (var y = 0; y < this.rows; y++) {
        let tilePos = null;
        let isPlaza = false;
        if (x == 0 && y == 0) tilePos = [20,2];
        else if (x == 0 && y == this.rows-1) tilePos = [20,3];
        else if (x == this.cols-1 && y == 0) tilePos = [21,2];
        else if (x == this.cols-1 && y == this.rows-1) tilePos = [21,3];


        // sides
        else if ((x == 0 || x == this.cols-1) && y % 2 == 1) tilePos = [19,3];
        else if ((y == 0 || y == this.rows-1) && x % 2 == 1) tilePos = [18,2];

        else if (x == 0) tilePos = [22,2];
        else if (x == this.cols-1) tilePos = [22,3];
        else if (y == 0) tilePos = [23,3];
        else if (y == this.rows-1) tilePos = [23,2];

        // middle
        else {
          if (isNotStreet(x,y, this.cols, this.rows)) {
            //									tilePos = [3 + rand(7),27];
            //									tilePos = [1,27]; // grass
            //									tilePos = [1,26]; // grass
            //									tilePos = [9,27]; // dirt
            //									tilePos = [11, 0]; // street
            tilePos = [31, 1]; // street
            isPlaza = true;
          }
          //								if (this._isNotStreet(x,y)) tilePos = [1,3]
          else if (isNotStreet(x,y-1)) tilePos = [18,2]; //[11,19];//
          else if (isNotStreet(x-1,y)) tilePos = [19,3];//[11,19];

          else {
            //									tilePos = [12,19];
            tilePos = [18,3];
            //									if (x%2 == 0 && y%2 == 0) tilePos = [11,19];
            //									else tilePos = [11,20];
          }
      }
      this.tiles[x][y] = {tile: tilePos, traversable: !isPlaza}
    }
  }

  return this.tiles;

  }
}


class Agent {
  constructor(street, container) {
    this.moveCloser = this.moveCloser.bind(this);

    this.active = true;
    this.street = street;
    this.container = container;
    this.sprite = null;
    this.kill = false;
    this.killing = false;
    this.killtime = 0;

    this.lastLoc = { x: -1, y: -1 };
    this.lastLoc2 = { x:-1, y:-1 };

    this.parked = false;
    this.loc = street.getRandomPos();
    this.ping = street.getRandomPos();
    // this.ping = { x: 100, y: 100 };

    if (street.isStreet(this.loc.x+1, this.loc.y) || street.isStreet(this.loc.x - 1, this.loc.y)) {
    //if (true) {
      this.facing = ['W','E'][rand(1)];
    }
    else {
      this.facing = ['N','S'][rand(1)];
    }

    this.carType = rand(5) + 1;
    this.sprite = su.sprite(PACK['car_yellow_small_'+this.carType+'.png']);
    this.sprite.anchor.x = 0.5;
    this.sprite.anchor.y = 0.5;
    //this.sprite.tint = 0xFF0000; // new car
    this.sprite.scale.set(0.25);

    this.container.addChild(this.sprite);

    this.render();
  }

  getRotation(s) {
    let newRotation = 0;
    switch(this.facing) {
      case 'E':newRotation = Math.PI * 0.5; break;
      case 'S':newRotation = Math.PI * 1; break;
      case 'W':newRotation = Math.PI * 1.5; break;
      case 'N':newRotation = 0; break;
    }
    if (s.rotation-newRotation > Math.PI) {
      return newRotation+(Math.PI*2);
    }
    else if (s.rotation-newRotation < -Math.PI) {
      return newRotation-(Math.PI*2);
    }
    return newRotation;
  }

  isLastLoc2(x,y){
    return this.lastLoc2.x == x && this.lastLoc2.y == y;
  }

  moveCloser(you) {
    // let you = this.ping;
    let x = this.loc.x;
    let y = this.loc.y;
    let isStreet = this.street.isStreet;



    // bias toward continuing north to prevent snaking.
    if (this.facing == 'N' && y > you.y && isStreet(x,y-1) && !this.isLastLoc2(x,y-1)) { this.loc.y-=1; this.facing = 'N'}

    // then pure direction
    else if (x < you.x && isStreet(x+1,y) && !this.isLastLoc2(x+1,y)) { this.loc.x+=1; this.facing = 'E'}
    else if (y < you.y && isStreet(x,y+1) && !this.isLastLoc2(x,y+1)) { this.loc.y+=1; this.facing = 'S'}
    else if (x > you.x && isStreet(x-1,y) && !this.isLastLoc2(x-1,y)) { this.loc.x-=1; this.facing = 'W'}
    else if (y > you.y && isStreet(x,y-1) && !this.isLastLoc2(x,y-1)) { this.loc.y-=1; this.facing = 'N'}

    // then avoid objects
    else if (y >= you.y && isStreet(x,y-1) && !this.isLastLoc2(x,y-1)) { this.loc.y-=1; this.facing = 'N'}
    else if (x >= you.x && isStreet(x-1,y) && !this.isLastLoc2(x-1,y)) { this.loc.x-=1; this.facing = 'W'}
    else if (y <= you.y && isStreet(x,y+1) && !this.isLastLoc2(x,y+1)) { this.loc.y+=1; this.facing = 'S'}
    else if (x <= you.x && isStreet(x+1,y) && !this.isLastLoc2(x+1,y)) { this.loc.x+=1; this.facing = 'E'}

    else {
      // console.log("blocked", x, y, you.x, you.y);
    }

    // record history
    this.lastLoc2.x = this.lastLoc.x;
    this.lastLoc2.y = this.lastLoc.y;
    this.lastLoc.x = this.loc.x;
    this.lastLoc.y = this.loc.y;

  }

  render() {
    let s = this.sprite;
    if (s) {

      // IMPORTANT
      s.y = TILESIZE * this.loc.y + TILESIZE * 0.5;
      s.x = TILESIZE * this.loc.x + TILESIZE * 0.5;

      s.rotation = this.getRotation(s);

    } else {
      console.log('NO SPRITE')
    }
  }
}

const SIMDEFAULTS = {

  fps: 5,

  farePerMin: 1.0,
  costPerMin:0.10,
  bookingFee:1.50,
  surgeMult: 2,
  companyShare: 0.2,

  autoScaling: true,

  driversPark: true,

  canvasAlign: 'left',
  numDrivers: 10,
  paxChance: 0.4,
  paxPer: 1, // generated per chance
  surgePaxRedux: 0.3,

  rows: "auto", // number of car rows
  cols: "auto", // number of car rows
  minWage: 0,
  resolution: 1, // scaling
  slowDispatch: false, // exponential scaling!
  buttonSetup: null,
  paxWait: 10,
  maxDrivers: 999,
}

class Simulation {

  constructor(options) {
    this.options = Object.assign({}, SIMDEFAULTS, options);
    this.generateBackground = this.generateBackground.bind(this);
    this.update = this.update.bind(this);
    this.onResize = this.onResize.bind(this);
    this.isNotStreet = this.isNotStreet.bind(this);
    this.isStreet = this.isStreet.bind(this);
    this.isIntersection = this.isIntersection.bind(this);
    this.getRandomPos = this.getRandomPos.bind(this);
  }

  init() {
    this.bg = null; // background
    this.fg = null; // foreground
    this.engine = null;
    this.stage = null;
    this.dBox = null; // particle container for drivers
    this.pBox = null; // particle container for pax
    this.pixiLoaded = false;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.width = 500
    this.height = 200

    this.drivers = [];

    this.initDimensions();

    this.initPixi();
  }

  initDimensions() {
    if (this.options.rows == "auto") {
      this.options.rows = Math.floor(this.height / this.options.resolution / TILESIZE);
      if ((this.options.rows+1) % 2) this.options.rows--;

    }
    if (this.options.cols == "auto") {
      this.options.cols = Math.floor(this.width / this.options.resolution / TILESIZE);
      if ((this.options.cols+1) % 2) this.options.cols--;
    }

  }

  initPixi() {

    this.renderer = PIXI.autoDetectRenderer(512, 256);
    this.renderer.plugins.interaction.autoPreventDefault = false;



    document.body.appendChild(this.renderer.view);

    this.stage = new PIXI.Container();

    this.engine = new Smoothie({
      engine: PIXI,
      renderer: this.renderer,
      root: this.stage,
      fps: this.options.fps,
      interpolate: true, // magic
      properties: {
        position: true,
        rotation: true,
        alpha: true,
        scale: true,
        size: false,
        tile: false
      },
      update: this.update  // will run this update loop at set fps
    });

    this.onResize();

    console.log('engine made');

    this.dBox = su.group();

    this.stage.addChild(this.dBox);

    this.pBox = new PIXI.particles.ParticleContainer(15000, {
      rotation: true,
      uvs: true,
      scale: true,
      alpha: true
    });



    //this.stage.addChild(this.pBox);

    PACK = PIXI.loader.resources[ "imgs/city-pack.json" ].textures;

    // var cat = new PIXI.Sprite(
    //   PIXI.loader.resources["imgs/cat.png"].texture
    // );
    // this.stage.addChild(cat);

    this.generateBackground();

    this.pixiLoaded = true;

    for (let i = 0; i < this.options.numDrivers; i++) {
      this.generateAgent();
    }


    this.engine.start();
  }

  onResize() {
    this.renderer.view.style.position = "absolute";
    this.renderer.view.style.display = "block";
    this.renderer.autoResize = true;

    let ratio = ((this.width / this.options.resolution / TILESIZE) / this.options.cols);
    this.engine.renderer.view.style.width = (ratio *  this.width - (TILESIZE * this.options.resolution)) + 'px';
    this.engine.renderer.view.style.height = (ratio *  this.height - (TILESIZE * this.options.resolution)) + 'px';
    this.renderer.resize(this.width, this.height);
  }

  destroyBackground() {

    // const that = this;
    if (this.bg) {
      this.stage.removeChild(this.bg);
      this.bg.destroy();
      this.bg = null;
    }

    if (this.fg) {
      this.stage.removeChild(this.fg);
      this.fg.destroy();
      this.fg = null;
    }
  }

  generateBackground() {
    this.destroyBackground();

    // const mm = new MapMaker(this.options.cols, this.options.rows, TILESIZE);
    //
    // var map = mm.generate();
    // console.log(map)


    const that = this;
    console.log('background')

    let pad = 2;
    let plazas = [];

    let getTile = function(x, y) {
      let sprite = su.sprite(
        su.frame("imgs/city-tilesx2.png",
          x * (TILESIZE * 2 + pad),
          y * (TILESIZE * 2 + pad),
          TILESIZE * 2,
          TILESIZE * 2)
      );
      sprite.scale.set(0.5);
      return sprite;
    };


    // console.log(that.options.cols)
    // console.log(that.options.rows)

    let bg = su.grid(that.options.cols, that.options.rows, TILESIZE, TILESIZE, true, 0,0,
      function(x, y) {
        let isPlaza = false;
        let tilePos;

        // corners
        if (x == 0 && y == 0) tilePos = [20,2];
        else if (x == 0 && y == that.options.rows-1) tilePos = [20,3];
        else if (x == that.options.cols-1 && y == 0) tilePos = [21,2];
        else if (x == that.options.cols-1 && y == that.options.rows-1) tilePos = [21,3];


        // sides
        else if ((x == 0 || x == that.options.cols-1) && y%2 == 1) tilePos = [19,3];
        else if ((y == 0 || y == that.options.rows-1) && x%2 == 1) tilePos = [18,2];

        else if (x == 0) tilePos = [22,2];
        else if (x == that.options.cols-1) tilePos = [22,3];
        else if (y == 0) tilePos = [23,3];
        else if (y == that.options.rows-1) tilePos = [23,2];

        // middle
        else {
          if (that.isNotStreet(x,y)) {
            //									tilePos = [3 + rand(7),27];
            //									tilePos = [1,27]; // grass
            //									tilePos = [1,26]; // grass
            //									tilePos = [9,27]; // dirt
            //									tilePos = [11, 0]; // street
            tilePos = [31, 1]; // street
            isPlaza = true;
          }
          //								if (that._isNotStreet(x,y)) tilePos = [1,3]
          else if (that.isNotStreet(x,y-1)) tilePos = [18,2]; //[11,19];//
          else if (that.isNotStreet(x-1,y)) tilePos = [19,3];//[11,19];

          else {
            //									tilePos = [12,19];
            tilePos = [18,3];
            //									if (x%2 == 0 && y%2 == 0) tilePos = [11,19];
            //									else tilePos = [11,20];
          }

        }

        let sprite = getTile(tilePos[0], tilePos[1]);


        if (isPlaza) {
          plazas.push(sprite);
        }


        sprite.alpha = 0.7;


        return sprite;

      });

      // console.log(bg.children[0].x)

      this.stage.addChildAt(bg, 0);

      // console.log(plazas.length)


      this.fg = su.group();
      this.stage.addChild(this.fg);

      this.bg = bg;
  }

  getRandomPos() {
    let pos = {};
    let limit = 500;

    do {
      limit++;
      pos.x = Math.floor(this.options.cols * Math.random());
      pos.y = Math.floor(this.options.rows * Math.random());
    } while (limit && this.isNotStreet(pos.x, pos.y));

    // console.log(pos)

    return pos;
  }

  isNotStreet(x, y) {
    return x < 0 || x >= this.options.cols || y < 0 || y >= this.options.rows || // in bounds
    (x % 2 == 1 && y % 2 == 1); // not a 'pillar'
  }

  isStreet(x, y) {
    return !(this.isNotStreet(x,y));
  }

  isIntersection(x, y) {
    return x % 2 == 0 && y % 2 == 0;
  }

  generateAgent() {
    let d = new Agent(this, this.dBox);
    this.drivers.push(d);
    this.totalDrivers++;
  }

  update() {
    this.drivers.forEach((d) => {
      if(sameLoc(d.ping, d.loc)) {
        d.ping = this.getRandomPos();
      }
      d.moveCloser(d.ping)
    })
    this.render();
  }


  render() {
    if (!this.pixiLoaded) return;

    this.drivers.forEach((d) => d.render());
  }
}

const sim = new Simulation();

PIXI.loader
  .add('imgs/city-tilesx2.png')
  .add('imgs/city-pack.json')
  .add('imgs/cat.png')
  .load(function (loader, resources) {
    console.log('assets loaded');
    sim.init();
  });
